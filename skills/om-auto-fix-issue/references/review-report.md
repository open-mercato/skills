# Review and report — the automated review loop

Detailed procedure for step 9 of `om-auto-fix-issue` (bug route): subject the fresh PR to the same scrutiny an incoming PR would get. (This skill performs no separate self-review step of its own — `om-fix` self-reviews the change before hand-off, and the feature route's delegated skills run their own review loops.)

## Automated pass with `om-auto-review-pr` (step 9)

Before the final report, subject the PR to an automated pass with the `om-auto-review-pr` skill. This is the equivalent of a peer reviewer catching issues the implementation missed.

`om-auto-fix-issue` does not hold an `in-progress` lock on the PR at this point (`om-open-pr` released the issue lock), so `om-auto-review-pr`'s claim check will see the PR is unclaimed and claim it fresh. That is expected — `om-auto-review-pr` owns releasing its claim when it finishes, per its own workflow (see `references/claim-pr.md`). Do not second-guess its claim/release protocol.

Invoke the `om-auto-review-pr` skill against `PR_NUMBER` in autofix mode:

1. Follow the entire `om-auto-review-pr` workflow verbatim — do not cherry-pick steps.
2. When it flags actionable issues, apply fixes directly in the same worktree used for this run, as new commits. Never rewrite history.
3. After each batch of fixes, re-run the targeted validation for the changed areas, and the full configured validation gate whenever a fix reaches beyond a single module/test file. Push after each batch.
4. Loop until `om-auto-review-pr` returns a clean verdict (no actionable blockers) or the remaining findings are non-actionable (out of scope, false positive) — document those explicitly in a PR comment.

## Verdict handling

- **Clean verdict** → proceed to cleanup and the final report; name the verdict and any follow-up commits there.
- **Only non-actionable findings remain** → proceed, but list each remaining finding and why it is out of scope or a false positive in the PR comment and the final report.
- **Cannot run** (e.g., required checks not yet reported, missing context) → skip the loop, note it in the final report, and leave the PR in the `review` pipeline state for a human or a later `om-review-prs` sweep.
