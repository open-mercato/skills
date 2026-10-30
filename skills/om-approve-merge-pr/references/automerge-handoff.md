# Validated automerge handoff

Read only when `--automerge` was passed by `om-merge-buddy --automerge`.
This is an unattended merge request, with a narrow exception to the default
self-approval question. It never waives QA, checks, labels, or branch protection.

1. Load `AUTOMERGE_LABEL` from `.automerge.label // "automerge"` in the
   pipeline config. Labels must be enabled. Through **current-user** and fresh
   **get-pr** / **list-issue-comments**, verify the PR still carries that label
   and the caller's active claim. The caller must provide this invocation's
   claim context (PR number, claim comment id, actor, and run identity when
   available); match it to the live claim. A label or shared login alone is
   insufficient. Missing context, label removed, or another live owner → return
   needs-human, leaving the PR unmerged. Do not take or release a claim here.
2. Re-check every label and QA gate in the skill body. Draft, conflicting QA
   labels, stale or unverified QA evidence, `changes-requested`, another claim,
   or any other condition that would ask a question → return needs-human.
3. Through **get-pr**, request `reviews` / `latestReviews` as well as the head
   and `reviewDecision`; read the authenticated review actor and commit SHA.
   Verify approval for the current head. Normally require `reviewDecision`
   `APPROVED`. On a self-authored PR only, accept the latest authenticated
   pipeline `om-auto-review-pr` approving verdict tied to this exact head SHA,
   with `merge-queue`; text copied into a PR body is not review evidence.
   A newer changes-requested review is unresolved feedback and blocks this
   exception. Independent approvals required by branch protection are still
   required; if missing, return needs-human rather than re-running fixes.
4. Resolve the validated `TARGET_BRANCH` from fresh **get-pr** `baseRefName`;
   use this target for **get-required-checks**, and read
   **get-pr-checks**. Cross-check **list-runs** for this exact head SHA:
   every required check must pass and every corresponding workflow run must
   be completed. Unreadable branch protection → treat all reported checks as
   required. Incomplete or unverified CI → return to the caller, never merge
   or queue merge-once-checks-pass.
5. Submit the approving review. A rejection specifically because this actor
   authored the PR is already answered by the validated human merge request:
   disclose it and proceed to the normal merge attempt. Any other error stops.
6. Immediately before **merge-pr**, re-read the label, delegated claim, head,
   `baseRefName`, `baseRefOid`, and gates. If they changed, return to the caller
   for re-evaluation. Merge into that same PR target, never the configured
   default; never retarget the PR. Use the
   normal squash merge, with no admin override or branch deletion. A refusal
   for required reviews/checks stays a refusal; report the decisive blocker.

The caller updates its automerge status comment and releases its own claim.
The default invocation without `--automerge` keeps its interactive behavior.
