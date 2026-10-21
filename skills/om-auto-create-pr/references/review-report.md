# Review and report

Use this procedure for the review in step 10 of `om-auto-create-pr`.

## Delegate one review flow

Invoke `om-auto-review-pr {prNumber} --autofix`. Stop and name the missing skill if it is unavailable.
Follow its complete workflow. Its `om-code-review` engine supplies the compatibility, security, scope, and breaking-change checks.
Do not run another direct code review before it. Do not wrap its fix loop in a second fix loop.

The review skill checks the claim signals first. It then claims or re-enters as `references/claim-pr.md` specifies.
It releases only claims that it creates.
It retains inherited chain locks for their owner. Follow `references/claim-pr.md` for the claim contract.

## `om-auto-create-pr` specifics

Let the review skill own fixes, tests, validation, commits, and re-review.
Do not repeat its validation commands around the same review pass.
Keep each fix as a new commit. Never rewrite earlier commits.

Record completed plan Steps with `[x]` and the implementation commit SHA.
Record other fixes under the relevant Phase as `- [x] Post-review fix: {summary} — {sha}`.
Commit the Progress update. Push the commit. Keep the review's evidence and the range of fix commits for the summary.

## Handle the result

- Clean verdict: continue to the summary in step 11.
- Only documented non-actionable findings remain: state each remaining finding and its disposition in the summary.
- Unresolved blocker or unavailable review: keep `Status: in-progress`. Name the blocker and `om-auto-continue-pr {prNumber}`.

Pending CI does not prevent review, reporting, or ready status. Required CI still prevents merge until it passes.
