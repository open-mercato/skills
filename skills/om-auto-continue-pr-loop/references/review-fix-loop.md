# Run `om-auto-review-pr` and apply fixes (step 7)

Before you post the final summary comment, push the final changes, or flip the PR body to `complete`, subject the resumed PR to an automated second pass with the `om-auto-review-pr` skill.

```bash
# The claim check for om-auto-review-pr will recognize that the current
# user already owns the in-progress lock (from step 0), so it proceeds
# as re-entry without re-claiming.
```

Invoke the `om-auto-review-pr` skill against `{prNumber}` in autofix mode:

1. Follow the entire `om-auto-review-pr` workflow verbatim — do not cherry-pick steps.
2. Apply fixes directly in the same worktree used for this resume. Never rewrite earlier commits; always add new commits under a new Step id (e.g. `X.Y-review-fix`) appended to the Tasks table. Each review-fix Step is lean: one commit, flip the Tasks row in the same commit, no per-Step checks/handoff files.
3. After each batch of fixes:
   - Run a quick scratch sanity check (typecheck + affected tests, or the closest configured equivalent).
   - When the batch closes — or every 5 review-fix Steps, whichever comes first — run a checkpoint pass per step 4b (targeted validation, focused integration tests + screenshots if UI was touched, write `checkpoint-<N>-checks.md`, rewrite `HANDOFF.md`, append NOTIFY entry, commit as `docs(runs): checkpoint N — review fixes`).
   - Re-run the full final gate from step 5 whenever a fix touches code outside a single module/test file.
   - Commit each Step using a clear conventional-commit subject (e.g. `fix(ui): address review feedback on confirmation dialog focus trap`). Push immediately.
4. Loop until `om-auto-review-pr` returns a clean verdict or the remaining findings are non-actionable (out-of-scope, false positive) and explicitly documented in the summary comment you post in step 8.

If `om-auto-review-pr` cannot run (required checks not yet green, missing context), stop here, leave `Status: in-progress` in the PR body, update `HANDOFF.md` + `NOTIFY.md` with the blocker, and tell the user how to re-enter.
