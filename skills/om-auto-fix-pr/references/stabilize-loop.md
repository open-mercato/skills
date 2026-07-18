# The stabilization loop

The step-4 loop `om-auto-fix-pr` runs to drive the PR to approvable + green +
QA-evidenced. Each sub-skill is invoked verbatim; this file only sequences them and
defines the exit criteria.

## One cycle

Run in this order (later stages depend on earlier ones landing):

1. **Review + autofix — `om-auto-review-pr {prNumber}`** (autofix mode, verbatim).
   It reviews via `om-code-review`, applies fixes as new commits, resolves
   conflicts, and for a fork head runs the carry-forward supersede/credit flow
   (if it opens a replacement PR, switch `{prNumber}` to it for all later stages).
   Record its verdict and, crucially, the findings it did **not** fix (nits,
   low-severity, out-of-scope) — step 5 files those as follow-ups.
2. **Stabilize CI — `om-stabilize-ci {prNumber}`.** Pull check status through the
   tracker, classify each failure (real bug / test bug / flake / infra), fix the
   real ones with tests, push, re-check. Never go green by weakening a test or
   disabling a check. Pass `--max-iterations` through if the CI is flaky.
3. **Verify UI — `om-auto-verify-pr-ui {prNumber}`** — only when the diff touches a
   user-facing surface (inspect **get-pr-diff** / **get-pr-files** for UI paths)
   and `--no-ui` was not passed. It boots the app, drives the changed flow, and
   posts screenshots + a pass/fail report as a PR comment. Invoke it in its default
   **evidence-only** mode (no flags) so it sets **no** QA labels — this orchestrator
   never self-approves QA. When there is no runnable UI surface, skip and note
   "UI: n/a".
4. **Re-merge base** if it advanced this cycle (see `references/base-merge.md`).

## Exit criteria

Stop the loop and go to step 5 when **all** hold:

- `om-auto-review-pr` returns approvable (no actionable blockers remain).
- Every **required** check is green (**get-required-checks** / **get-pr-checks**).
- UI verification passed, or is not applicable / was skipped by `--no-ui`.
- No unmerged base advance is pending.

Stop early — without declaring merge-ready — when `--max-iterations` is reached or a
genuine blocker remains (an unresolvable conflict, a real failure the fix for which
is out of scope, a design objection from review). In that case leave the PR in the
honest pipeline state (`changes-requested` or `blocked`), do not file it as
merge-ready, and report the specific blocker so a human or a later run can take it.

## Convergence guardrails

- If a cycle makes **no** forward progress (same findings, same red checks) twice
  in a row, stop — looping again will not help. Report the stuck state.
- Watch for a fix that regresses another stage (a review fix that breaks CI, a CI
  fix that breaks the UI). The ordered re-run each cycle catches it; if two stages
  keep undoing each other, stop and report the tension rather than thrashing.
