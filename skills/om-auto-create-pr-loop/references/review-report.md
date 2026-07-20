# Run `om-auto-review-pr` and apply fixes

Step 11. Before you post the final summary comment, push the last commits, or report back, subject the PR to an automated second pass with the `om-auto-review-pr` skill — the equivalent of a peer reviewer catching issues the self-review missed.

**Release the `in-progress` lock before invoking `om-auto-review-pr`** so the reviewer skill can claim it cleanly with its own three-signal protocol:

1. **unlabel-pr** — remove `in-progress` (through the descriptor's guard).
2. **comment-pr** — post: `🤖 om-auto-create-pr-loop releasing lock so om-auto-review-pr can claim it.`

`om-auto-review-pr` will re-apply `in-progress` per its own step 0 and release it per its own workflow. When it returns (clean verdict or non-actionable findings only), **reclaim the lock** before posting the summary comment in step 12:

1. **label-pr** — re-apply `in-progress` through the guard.
2. **comment-pr** — post: `🤖 om-auto-create-pr-loop reclaiming lock to post the final run summary.`

The reclaim keeps the PR owned by this skill through the summary post and cleanup, and is released at the very end of step 13.

Invoke the `om-auto-review-pr` skill against `{prNumber}` in autofix mode:

1. Follow the entire `om-auto-review-pr` workflow verbatim — do not cherry-pick steps.
2. When it flags actionable issues, apply fixes directly in the same worktree used for this run. Never rewrite earlier commits; always add new commits under a new Step id (e.g. `X.Y-review-fix`) appended to the Tasks table. Each review-fix Step is still lean: one commit, flip the Tasks row in the same commit, no per-Step checks/handoff files.
3. After each batch of fixes:
   - Run a quick scratch sanity check (typecheck + affected tests from `validation.commands`).
   - When the batch closes — or every 5 review-fix Steps, whichever comes first — run a checkpoint pass per step 6b (targeted validation, focused integration tests + screenshots if UI was touched, write `checkpoint-<N>-checks.md`, rewrite `HANDOFF.md`, append NOTIFY entry, commit as `docs(runs): checkpoint N — review fixes`).
   - When the review-fix batch is fully applied, re-run the full final gate from step 7 whenever a fix touches code outside a single module/test file.
   - Commit each Step using a clear conventional-commit subject (e.g. `fix(ui): address review feedback on confirmation dialog focus trap`). Push immediately.
4. Loop until `om-auto-review-pr` returns a clean verdict (no actionable blockers) or the remaining findings are non-actionable (out-of-scope, false positive) and explicitly documented in the PR comment you post in step 12.

If `om-auto-review-pr` cannot run (e.g., required checks not yet green, missing context), escalate: leave `Status: in-progress` in the PR body, stop here, and report the blocker to the user so they can decide whether to resume via `om-auto-continue-pr-loop`.
