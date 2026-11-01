# om-auto-issue-triage

Ranks open issues for the repository's autofix queue. It proposes useful,
still-relevant work with decided acceptance criteria and a bounded implementation
and validation path. Bugs, maintenance and scoped features may qualify.

The default queue label is `cez-autofix`, configured by `autofix.label`.
`autofix.eligibility` holds `lookbackDays` (30), `analyzeLimit` (100), `limit`
(20), and `excludeLabels` (`blocked`, `do-not-fix`). Existing explicit policy
is preserved. Closed issues, pull requests, already queued items, active or
uncertain claims and unreadable facts are never proposed. An assignee alone is
not an active claim and is left untouched.

A dry run reads one window, ranks by configured priority/risk/age and judges only
the shortlist. It changes nothing in the tracker, then stops at
`⚠ NEEDS HUMAN CONFIRMATION`. Confirm displayed issue IDs with `--apply <id,id>`
or reply to the proposal. `all` binds to the displayed set, never unseen issues.
The skill rechecks current relevance, scope, claims and existing covering PRs,
then applies only the queue label and verifies it through label read-back. One
idempotent rationale comment records each successful outcome.

`--issue <id>` explains one native tracker issue ID; `--window`,
`--from-oldest`, `--lookback-days`, `--analyze-limit` and `--limit` control the
window. `--as-of` freezes its UTC anchor for confirmation and scrolling. Listing
caps are disclosed and empty intermediate windows can be scrolled past.

This skill does not install or start a worker, implement changes, open a PR,
claim, assign, close or rewrite an issue. The repository's existing worker or an
explicit `om-auto-fix-issue <id>` invocation owns implementation and its normal
spec/review/QA/CI gates. Successful writes emit native `Issue:` reference lines.

Source: [`skills/om-auto-issue-triage/SKILL.md`](../../skills/om-auto-issue-triage/SKILL.md).
