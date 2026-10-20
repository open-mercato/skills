# Conflict and CI signals

Use this procedure before creating the worktree in step 4 of `om-auto-review-pr`.
Repeat it when a head or base change invalidates the signals.

## Check conflicts

Use `mergeable`, `mergeStateStatus`, and `baseRefName` from the metadata snapshot.
Fetch those fields through **get-pr** only when missing or stale.
Set `CONFLICTED=true` for `CONFLICTING` or `DIRTY`.

For a review-only run, carry the conflict as a blocker and review the pushed head.
Name conflicting paths when available. State that conflict resolution can change the reviewed code.

For an eligible autofix run, resolve conflicts in the step-5 worktree before any review or validation.
Fetch the latest `baseRefName` first. Use the replacement branch for a fork, as `references/fork-pr-flow.md` specifies.
Review the resolved local diff. Clear the local conflict finding only after confirming the resolution.
Keep remote and local head evidence distinct until the resolved tree is pushed.

## Check CI

Use **get-required-checks** for the PR base. If protection is unreadable, treat all reported checks as required.
Use **get-pr-checks** for each check's name, state, and link.

- Failing states: `FAILURE`, `ERROR`, `CANCELLED`, `TIMED_OUT`.
- Pending state: `PENDING`.
- Non-failing completed states: `SUCCESS`, `SKIPPED`, `NEUTRAL`.

Record failing required checks in `FAILING_CHECKS`. Record pending required checks in `PENDING_CHECKS`.
Continue the complete review in both cases. Failing required checks force changes requested. Pending checks never delay review publication.

Use local validation to identify the cause of a failing check. Report a reproduced defect once and link its CI failure.
If local checks pass, identify the evidence difference. Do not infer an environment failure or a flake without evidence.
Fetch failed-job logs through the descriptor when available.

For autofix, address CI failures after conflicts and code findings. Refresh CI evidence after pushing fixes.
Disclose pending checks in the verdict. Follow `references/ci-followup.md` only after publishing the review, labels, and completion comment.
