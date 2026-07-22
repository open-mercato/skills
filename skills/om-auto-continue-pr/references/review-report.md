# Review and report — self-review plus the automated second pass

Detailed procedure for step 7 (self-review) and step 8 (automated review loop) of `om-auto-continue-pr`.

## Self-review (step 7)

Use the `om-code-review` skill against the branch diff. Explicitly verify:

- No public contract was broken silently: exported APIs, HTTP routes and response shapes, event names, CLI flags, DB schema, config formats. When `BACKWARD_COMPATIBILITY.md` exists at the repo root, check every touched surface against it; honor any other compatibility rules the project documents. A violation without the documented migration/deprecation path must be fixed or explicitly WARNED about in the summary comment so the user decides.
- No API response fields were removed.
- No security-sensitive surface was weakened: authentication, authorization, data scoping, input validation, secrets handling.
- Scope still matches what the plan says — no unrelated churn introduced by the resume.

If self-review finds issues, fix them and loop back to the resume-execution step (step 5).

## Automated second pass with `om-auto-review-pr` (step 8)

Before you post the final summary comment, push the final changes, or flip the PR body to `complete`, subject the resumed PR to an automated second pass with the `om-auto-review-pr` skill. This is the equivalent of a peer reviewer catching issues the self-review missed.

Invoke the `om-auto-review-pr` skill against `{prNumber}` in autofix mode:

1. Follow the entire `om-auto-review-pr` workflow verbatim — do not cherry-pick steps.
2. When it flags actionable issues, apply fixes directly in the same worktree used for this resume. Never rewrite earlier commits; always add new commits.
3. After each batch of fixes:
   - Re-run the targeted validation subset for the changed areas.
   - Re-run the full validation gate from step 6 whenever a fix touches code outside a single module/test file.
   - Update the plan's **Progress** section when a fix corresponds to a plan Step (flip `- [ ]` to `- [x]` with the commit SHA); otherwise add `- [x] Post-review fix: {one-line summary} — {sha}` under the relevant Phase heading.
   - Commit using a clear conventional-commit subject (e.g. `fix(ui): address review feedback on confirmation dialog focus trap`). Push immediately.
4. Loop until `om-auto-review-pr` returns a clean verdict (no actionable blockers) or the remaining findings are non-actionable (out-of-scope, false positive) and explicitly documented in the summary comment you post in step 9.

## Verdict handling

- **Clean verdict** → proceed to the summary comment (step 9); the summary names the verdict and the SHA range of any follow-up commits.
- **Only non-actionable findings remain** → proceed, but list each remaining finding and why it is out of scope or a false positive in the summary comment.
- **Cannot run** (e.g., required checks not yet green, missing context) → stop here, leave `Status: in-progress` in the PR body, document the blocker in the summary comment, and tell the user how to re-enter (`/om-auto-continue-pr {prNumber}`).

## om-auto-continue-pr specifics

- Lock re-entry: `om-auto-review-pr`'s claim check recognizes that the current user already owns the `in-progress` lock from step 1, so it proceeds as re-entry without re-claiming. This skill keeps owning the lock and releases it in step 10.
