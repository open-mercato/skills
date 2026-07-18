# Early-exit checks (conflicts and CI)

Detailed procedure for step 3 of `om-auto-review-pr`. Run these checks before the worktree is created. If either fails, skip the full code review and go straight to the changes-requested flow.

## 3a. Check for merge conflicts

Run the tracker operation **get-pr** for `{prNumber}`, requesting `mergeable`, `mergeStateStatus`, and `baseRefName`.

If `mergeable` is `CONFLICTING` or `mergeStateStatus` is `DIRTY`, do not continue with checkout or review execution on the first pass. Submit a changes-requested review with a conflict-focused body, set the pipeline label to `changes-requested` (which also removes `merge-queue`), and stop the first pass.

Important:

- On the initial review pass, conflicts are still an early stop.
- On the autofix pass (steps 9–10), conflicts become actionable work and must be resolved inside the isolated worktree or carry-forward branch before re-reviewing.

## 3b. Check CI status

Discover required checks first: run the tracker operation **get-required-checks** for the PR's base branch (`{baseRefName}`). If branch protection is not readable (the operation reports 404/no data), treat all reported PR checks as required.

Fetch the actual PR check results with the tracker operation **get-pr-checks** for `{prNumber}`, requesting each check's `name`, `state`, and `link`.

Treat these states as failing: `FAILURE`, `ERROR`, `CANCELLED`, `TIMED_OUT`. Ignore these as non-failing: `PENDING`, `SUCCESS`, `SKIPPED`, `NEUTRAL`.

If any required check is failing, do not continue with checkout or review execution. Submit a changes-requested review listing only the failing required checks, set the pipeline label to `changes-requested` (which also removes `merge-queue`), and stop.
