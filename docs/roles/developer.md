# 👩‍💻 Developer

Hand the pipeline a brief, a spec, or an issue number and get back a labeled, reviewed PR — implemented phase by phase in an isolated worktree so your checkout stays clean, run through the validation gate, self-reviewed, and UI-verified with screenshots when the change is user-facing. Every PR-producing skill emits `PR_URL` / `PR_NUMBER` markers and reuses an existing PR instead of opening a duplicate, so the steps chain end to end. Long specs run on a resumable, step-tracked loop.

← Back to the [README](../../README.md#-workflows-by-role)

## Skills you'll use

| Skill | When | Example call | What you get |
|---|---|---|---|
| `om-auto-write-spec` | Author a spec from a brief | `/om-auto-write-spec "CSV export for the orders grid"` | a ready spec PR with mockups + assumptions comment |
| `om-auto-implement-spec` | Build an existing spec | `/om-auto-implement-spec 2026-07-18-csv-export` | an implemented, reviewed PR with screenshots from the working app |
| `om-auto-fix-issue` | Take any issue to a PR | `/om-auto-fix-issue 123` | a finished, fully-labeled PR; bugs get the fix chain (regression tests, clean review), features get spec-then-build — classified and routed automatically |
| `om-auto-create-pr` | Ship an ad-hoc task | `/om-auto-create-pr "Add rate limiting to the login endpoint"` | a labeled, self-reviewed PR from a free-form brief |
| `om-auto-create-pr-loop` | Implement a large spec | `/om-auto-create-pr-loop "Implement the multi-tenant billing spec"` | a resumable, step-tracked PR (continue with `om-auto-continue-pr-loop`) |

## What happens automatically

- **Isolated worktrees** — every autonomous run works off a fresh branch worktree; your checkout is never touched.
- **Validation gate** — the configured commands run and any non-zero exit blocks the PR.
- **Self-review + autofix loop** — `om-auto-review-pr` reviews the diff and iterates fixes until merge-ready. On a spec-only PR it switches to a specification review (risks, backward compatibility, gaps, improvements, simplicity) and its autofix amends the spec document, never adds implementation.
- **UI verification** — user-facing PRs get screenshots + a pass/fail report from `om-auto-qa-pr`.
- **Chain markers** — `PR_URL` / `PR_NUMBER` are emitted so the next skill continues the same PR, never a duplicate.
- **Full label set + run-summary comment** on the finished PR (pipeline + category + priority + risk + QA meta).
- **Claim locks** — the `in-progress` label + assignee + 🤖 comment make concurrent agents back off.

## Tips

- `om-auto-fix-issue` is the **single issue entry point** — hand it any issue and it classifies first, driving bugs through the autofix chain and features through `om-auto-write-spec` + `om-auto-implement-spec` on one PR. For a spec without implementation, run `om-auto-write-spec <issue>` directly. Pass `--interactive` to answer Open Questions live, `--no-ui` to skip UI verification, `--force` to bypass a claim conflict.
- Choose the loop variant (`om-auto-create-pr-loop`) for long, many-step specs that need checkpoints and resumability; use the plain `om-auto-create-pr` for small fixes.
- Resume anything interrupted: `om-auto-continue-pr <PR>` for plain runs, `om-auto-continue-pr-loop <PR>` for loop runs — they pick up from the first unchecked step.
- `om-auto-implement-spec` resolves a spec by path, name, issue, or spec-PR number and reuses the spec PR's branch — pass `--no-ui` for backend-only specs, `--force` to bypass claim checks.
- Add `Closes #123` yourself only if you're opening the PR by hand; the skills manage the `Refs`→`Closes` linkage for you.
