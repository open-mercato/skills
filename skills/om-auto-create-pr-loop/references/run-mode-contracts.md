# Run-mode contracts (step 1)

The Simple-run and Spec-implementation-run contracts, plus the promotion path,
for `om-auto-create-pr-loop`. The body keeps the step-1 classification heuristic
(which mode to run in); this file holds what each mode requires once the choice
is made.

## Simple-run contract

For Simple runs, skip the whole run-folder ceremony. Requirements:

- **No run folder**, no `PLAN.md`, no `HANDOFF.md`, no `NOTIFY.md`, no checkpoint files.
- **No Tasks table** anywhere.
- **One code commit** (may be amended pre-push; once pushed, create a new commit rather than amending).
- Unit tests for behavior changes (still mandatory for code; docs-only exempt).
- Targeted validation for the touched area(s) only — the relevant subset of `validation.commands`, scoped when the toolchain supports it.
- Conventional-commit subject.
- Push.
- Open the PR directly with a short body — summary + test plan + rollback (no `Tracking plan:` line, no `Status:` field, no linked run folder).
- Still respect: three-signal `in-progress` lock, label discipline (pipeline + category + meta + priority + risk), breaking-change contract surfaces inside the single `om-auto-review-pr` pass.
- Final summary comment still posts, but compacted to: summary of changes, how to verify, what can go wrong. No "Verification phases" matrix, no "External references honored" section unless actually relevant.

A Simple run still uses an isolated worktree on a `fix/` or `feat/` branch, still claims the PR with the three-signal lock once opened, and still runs `om-auto-review-pr` in autofix mode.

## Spec-implementation-run contract

Keep the full contract documented in the rest of the `SKILL.md` file: run folder, Tasks table, HANDOFF/NOTIFY, checkpoint-based verification, 1:1 step-to-commit discipline, full validation gate before flipping to `complete`, `om-auto-review-pr` autofix pass, comprehensive summary comment with all headings.

## Promotion path (Simple → Spec-implementation)

A Simple run MAY be promoted to a Spec-implementation run mid-flight if the agent discovers the task is larger than it looked:

- Stop the simple flow.
- Draft the plan under `${RUNS_DIR}/<date>-<slug>/PLAN.md` (with Tasks table), `HANDOFF.md`, `NOTIFY.md`.
- Write a seed commit that adds these files.
- Update the PR body to add `Tracking plan:` and `Status: in-progress` lines.
- Continue under the full Spec-implementation contract from step 2 onwards.
