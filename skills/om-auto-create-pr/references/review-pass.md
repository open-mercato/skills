# Automated review second pass

Detailed procedure for step 11 of `om-auto-create-pr`. Before you post the final summary comment, push the last commits, or report back, subject the PR to an automated second pass with the `om-auto-review-pr` skill. This is the equivalent of a peer reviewer catching issues the self-review missed.

`om-auto-create-pr` does not hold an `in-progress` lock on the PR at this point (only `om-auto-continue-pr` does), so `om-auto-review-pr`'s claim check will see "not in progress, current user is the author/assignee" and claim it fresh by applying the `in-progress` label. That is expected — `om-auto-review-pr` owns releasing the label when it finishes, per its own workflow. Do not second-guess its claim/release protocol.

Invoke the `om-auto-review-pr` skill against `{prNumber}` in autofix mode:

1. Follow the entire `om-auto-review-pr` workflow verbatim — do not cherry-pick steps.
2. When it flags actionable issues, apply fixes directly in the same worktree used for this run. Never rewrite earlier commits; always add new commits.
3. After each batch of fixes:
   - Re-run the targeted validation for the changed areas.
   - Re-run the full validation gate from step 7 whenever a fix touches code outside a single module/test file.
   - Update the plan's **Progress** section if the fix corresponds to a plan Step (flip `- [ ]` to `- [x]` with the commit SHA); otherwise add a short note under the relevant Phase heading in the plan (e.g. `- [x] Post-review fix: {one-line summary} — {sha}`).
   - Commit using a clear conventional-commit subject (e.g. `fix(ui): address review feedback on confirmation dialog focus trap`). Push immediately.
4. Loop until `om-auto-review-pr` returns a clean verdict (no actionable blockers) or the remaining findings are non-actionable (out-of-scope, false positive) and explicitly documented in the PR comment you post in step 12.

If `om-auto-review-pr` cannot run (e.g., required checks not yet green, missing context), escalate: leave `Status: in-progress` in the PR body, stop here, and report the blocker to the user so they can decide whether to resume via `om-auto-continue-pr`.
