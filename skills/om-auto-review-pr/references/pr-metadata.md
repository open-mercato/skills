# PR metadata and review/re-review decision

Detailed procedure for steps 1–2 of `om-auto-review-pr`.

## 1. Fetch PR metadata and reviewer context

Use the tracker as the source of truth. Collect enough data to decide whether this is a first review or a re-review and whether the PR comes from a fork.

Run the tracker operation **get-pr** for `{prNumber}`, requesting `number`, `title`, `url`, `author`, `baseRefName`, `baseRefOid`, `headRefName`, `headRefOid`, `headRepository`, `headRepositoryOwner`, `isCrossRepository`, `maintainerCanModify`, `mergeable`, `mergeStateStatus`, `reviewDecision`, `labels`, `latestReviews`, `reviews`, `commits`, and `files`. Run **current-user** for the reviewer's login if it was not already captured as `CURRENT_USER` in step 0.

Capture at least: PR title, URL, base branch, head branch, head SHA; author login; whether the PR is cross-repository (`isCrossRepository`); whether maintainers can modify it (`maintainerCanModify`); existing labels; existing reviews by the current reviewer.

## 2. Decide whether this is a review or a re-review

Treat the run as a **re-review** when the current reviewer has already submitted a review on the PR. Use `reviews` first and `latestReviews` as a fallback.

Rules:

- If there is no prior review from the current reviewer, this is a normal review.
- If there is a prior review from the current reviewer and the PR head SHA changed after that review, this is a re-review of updated code.
- If there is a prior review from the current reviewer and the head SHA did not change, only continue when the user explicitly asked for a re-review. Otherwise, stop and report that there are no new commits to review.

When re-reviewing:

- Title the report `Re-review: {PR title}` instead of `Code Review: {PR title}`.
- Re-check all previous blocker areas before approving.
- Replace labels idempotently just like a first review.
- Submit a fresh review rather than assuming the previous review still applies.
