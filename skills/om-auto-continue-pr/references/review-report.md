# Automated review second pass

Detailed procedure for step 7 of `om-auto-continue-pr`. Before you post the final summary comment, push the final changes, or flip the PR body to `complete`, subject the resumed PR to an automated second pass with the `om-auto-review-pr` skill.

```bash
# The claim check for om-auto-review-pr will recognize that the current
# user already owns the in-progress lock (from step 0), so it proceeds
# as re-entry without re-claiming.
```

Invoke the `om-auto-review-pr` skill against `{prNumber}` in autofix mode:

1. Follow the entire `om-auto-review-pr` workflow verbatim — do not cherry-pick steps.
2. Apply fixes directly in the same worktree used for this resume. Never rewrite earlier commits; always add new commits.
3. After each batch of fixes:
   - Re-run the targeted validation subset for the changed areas.
   - Re-run the full validation gate from step 5 whenever a fix touches code outside a single module/test file.
   - Update the plan's **Progress** section when a fix corresponds to a plan Step (flip `- [ ]` to `- [x]` with the commit SHA); otherwise add `- [x] Post-review fix: {one-line summary} — {sha}` under the relevant Phase heading.
   - Commit using a clear conventional-commit subject (e.g. `fix(ui): address review feedback on confirmation dialog focus trap`). Push immediately.
4. Loop until `om-auto-review-pr` returns a clean verdict or the remaining findings are non-actionable (out-of-scope, false positive) and explicitly documented in the summary comment you post in step 8.

If `om-auto-review-pr` cannot run (required checks not yet green, missing context), stop here, leave `Status: in-progress` in the PR body, document the blocker in the summary comment, and tell the user how to re-enter.
