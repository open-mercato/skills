# Multi-Step runs: executor-dispatch pattern (step 6)

Applies only to **Spec-implementation runs** where a single invocation is expected to land **multiple Steps in one pass** — Simple runs have at most one code commit and never dispatch.

The main session acts as a **dispatcher** and spawns one **executor subagent** per Step (foreground `Agent` tool call, `subagent_type: "general-purpose"`). The executor implements exactly that Step end-to-end (code commit + Tasks-table flip + push). The main session waits for the executor to return, verifies the commit landed and pushed, then dispatches the next Step.

Use it when multiple `todo` rows must land in one pass, or whenever the main session would otherwise carry heavy per-Step context. Do NOT use it for a single-Step resume (drive it directly with the default per-Step loop) or docs-only/trivial resumes.

Hard constraints:

- Subagents do NOT have access to the `Agent` tool. A coordinator subagent **cannot** spawn executors. Dispatch MUST live in the main session.
- Dispatch is **sequential** (one executor at a time). This is not parallelism — the cap-at-2 rule above still applies to the rare case where you want an implementer and a reviewer running side-by-side; an executor-dispatch run is a sequence of one-at-a-time executors.
- The main session claims the `in-progress` lock **once** at step 1 and releases it **once** at run end (or on early exit). Executors MUST NOT claim or release the lock, and MUST NOT post the final summary comment — both belong to the main session.

Executor prompt template — the main session writes this into each spawned `Agent` call:

```markdown
You are an executor for om-auto-continue-pr-loop PR #{prNumber}. Implement exactly one Step.

Working directory: {absolute worktree path}
Branch: {branch} (already checked out; origin tracking set up)
Run folder: {absolute run folder path}

Step to implement:
- Step id: {X.Y}
- Title: {step title from Tasks table}
- Full description: {paste the Step's bullets from PLAN.md Implementation Plan}

Spec anchors:
- PLAN.md: {plan path}
- Source spec (if any): {spec path}
- External References adopted: {list from PLAN.md Overview}

Rules:
- One Step = exactly one code commit. Nothing more, nothing less. No docs-flip commit.
- Run a quick scratch sanity check (typecheck + new test). Do NOT record it anywhere — the checkpoint pass verifies.
- Do NOT write a `step-{X.Y}-checks.md`. Do NOT create a `step-{X.Y}-artifacts/` folder. Verification is checkpoint-based.
- Flip the `Status` cell of row `{X.Y}` in PLAN.md's Tasks table from `todo` to `done` and fill the `Commit` column with the short SHA as part of the same commit (amend if needed to capture the real SHA before push).
- Do NOT rewrite `HANDOFF.md` at the per-Step level. Do NOT append to `NOTIFY.md` unless you hit a blocker, make a scope decision worth logging, or are delegating to another subagent.
- Push after the commit so the remote always has the latest state.
- Do NOT claim or release the `in-progress` lock on the PR, and do NOT post the final summary PR comment. The main session owns both.
- Do NOT rewrite or reorder prior history. Do NOT split into multiple code commits. If this Step truly needs splitting, stop and return early with a report asking the main session to split the Step in PLAN.md first.

Return format (concise report, < 300 words):
- Step id
- Code commit SHA
- Files touched
- Brief note on what changed (one line)
- Push confirmation (`origin/{branch}` now at {sha})
- Blockers or decisions worth escalating
```

Verification the main session MUST run after each executor returns — before dispatching the next Step:

- `git status` is clean in the worktree.
- Exactly **one** new commit exists on HEAD since the dispatch.
- Local HEAD == `origin/{branch}` (push actually landed; fetch if in doubt).
- The PLAN.md Tasks-table row for `{X.Y}` is flipped to `done` with the correct short SHA in the `Commit` column.

Every 5 successful executors (or when a Phase with ≥3 Steps closes), the main session MUST run a full **checkpoint pass** per step 6b (`references/checkpoint-pass.md`) before dispatching the next Step.

Safety stops — the main session MUST halt dispatch (leave `Status: in-progress`, rewrite `HANDOFF.md`, append a NOTIFY entry naming the blocker, release the lock, and report back) when any of the following is true:

- An executor returns a blocker, failing tests, or an error.
- `git status` is not clean after an executor returns.
- The Tasks-table row was not flipped to `done` with the correct SHA.
- Local HEAD ≠ `origin/{branch}` (push did not land).
- Two consecutive executors returned problematic results.
- **Safety checkpoint:** after ~20 consecutive successful Steps, stop and let the user review before plowing on.

The creator counterpart (`om-auto-create-pr-loop`) inherits this pattern when driving multiple Steps in a single invocation.
