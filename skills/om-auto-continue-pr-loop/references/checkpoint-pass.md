# Checkpoint pass (every 5 resumed Steps) — step 6b

Fire when any of these is true:

- 5 Steps have landed since the start of this resume (or since the last checkpoint in this resume).
- The next Step would close a Phase and the Phase has ≥3 Steps.
- Every row in the Tasks table is now `done` — the final gate in step 7 subsumes this.
- A blocker stops the run mid-Phase.

At a checkpoint, run the following and record them in a single `${RUN_DIR}/checkpoint-<N>-checks.md` (use the next available `<N>` — increment from the highest existing checkpoint number on the branch):

1. **Targeted validation for every area touched since the last checkpoint:** run the subset of `validation.commands` relevant to the touched areas (typecheck and tests scoped to affected packages when the toolchain supports scoping; otherwise unscoped), plus any configured generate/build commands when module structure, entities, or generated files changed in the window.
2. **UI verification (conditional)** — if any Step in the window touched UI (pages, components, widgets, navigation):
   - Run the repo's integration suite via the `om-integration-tests` skill (running-only mode), scoped to the smallest set of tests that covers the touched areas. Prefer area-scoped runs over the full suite.
   - If no existing test covers the touched area, fall back to browser automation tooling when available for a minimal smoke path.
   - Create `${RUN_DIR}/checkpoint-<N>-artifacts/` and save the test log + at least one `screenshot-<short-desc>.png` per touched area. Reference filenames from `checkpoint-<N>-checks.md`.
   - **Post the screenshots to the PR as tracker evidence:** the PR always exists in a resume — post this checkpoint's screenshots via **attach-image-evidence** with a short comment (marker `🤖 om-auto-continue-pr-loop — checkpoint <N> evidence`, one line naming the Step range + touched areas, one line per image), slug `checkpoint-<N>-pr-{prNumber}`. Idempotent: a re-run finds the marker and updates that comment instead of duplicating. Inline rendering is the tracker descriptor's job; when it cannot, the comment carries links — surface that, don't fail.
   - When the repo has no integration suite, skip this portion and record the reason.
   - **UI checks MUST NEVER block development.** If the dev env cannot be started or the scenario is not reachable, skip the UI portion and record the reason in both `checkpoint-<N>-checks.md` and `NOTIFY.md`. The checkpoint otherwise proceeds.
3. **Write `checkpoint-<N>-checks.md`** listing: checkpoint index, the Steps it covers (id range + SHA range), touched areas, every check run with pass/fail/skip + reason, and links to any artifacts.
4. **Rewrite `HANDOFF.md`** from scratch with the new state (next concrete action = the first remaining `todo` Step).
5. **Append one NOTIFY entry** for the checkpoint: UTC timestamp, checkpoint index, Step range, one-line summary, any decisions/problems.
6. **Commit** the checkpoint files (`checkpoint-<N>-checks.md`, `checkpoint-<N>-artifacts/` if any, `HANDOFF.md`, `NOTIFY.md`) as a single commit: `docs(runs): checkpoint N — steps X.Y..X.Z verified`. Push.

If the checkpoint fails, halt dispatch, rewrite `HANDOFF.md` naming the failure, append a NOTIFY blocker entry, fix forward with new Steps appended to the Tasks table, and re-run the checkpoint before continuing.

## Subagent parallelism (optional, capped at 2)

- At your discretion, you MAY run up to **two** subagents concurrently — for example, one implementing the next Step while a second reviews the just-landed commit via the `om-code-review` skill. Never exceed two.
- **Conflict avoidance is the top priority.** Two agents MUST NOT edit the same files in the same window. If conflicts are likely, serialize.
- Prefer serial execution whenever the gain is marginal. Parallelism is a tool, not a default.
- Record any subagent delegation in `NOTIFY.md` with timestamps.
