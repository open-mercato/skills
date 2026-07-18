# Follow-ups for nits, and merge preparation

The step-5 and step-6 procedures `om-auto-fix-pr` runs once the loop settles: turn
non-blocking review findings into tracked issues, then leave the PR merge-ready and
hand it off.

## Filing follow-ups (step 5)

Blocking findings are fixed inside the loop (step 4). Everything the review
intentionally left unfixed — nits, low-severity items, out-of-scope suggestions —
becomes a follow-up issue so it is tracked without holding the PR:

- For each such finding, invoke `om-followup-issue-from-pr` verbatim with the PR
  link (or, when the finding lives in a specific review comment, that comment's
  link) so its comment-mode extracts the actionable ask and assigns the issue to
  the right person (the comment's @-mention, else the PR author).
- **Idempotent**: before filing, check whether a follow-up for this finding already
  exists (scan the PR's existing follow-up comments/links and open issues that
  reference this PR). Never double-file the same nit across loop iterations or
  re-runs.
- Batch the summary: list every follow-up issue opened in the final summary comment
  so the reviewer sees what was deferred and why.

Do **not** use follow-ups to dodge real blockers — a correctness, security,
compatibility, or failing-gate finding is fixed in the loop, never deferred to a
follow-up issue.

## Merge preparation (step 6) — never merge

Bring the PR's labels and metadata to match its real state, through the descriptor
label guards (`set_pipeline_label` / `apply_label`; a missing label degrades to a
logged skip; `LABELS_ENABLED=false` skips all):

- **Pipeline label**: `merge-queue` when the review is approving and every required
  check is green; otherwise the honest state (`changes-requested`, `blocked`).
- **QA meta**: keep `needs-qa` when user-facing behavior changed and `QA_GATE` is
  on. `om-auto-verify-pr-ui` runs here in evidence-only mode, so it attaches
  screenshots but sets **no** QA labels; this skill **never** adds `qa-approved` or
  `qa-self-verified` — the QA gate and a QA reviewer own that (a human can opt into
  the self-QA sign-off separately). When the gate is on, a `needs-qa` PR stays
  unmergeable until signed off.
- **Fork supersede/credit**: if step 4 produced a carry-forward replacement PR,
  confirm its body carries `Supersedes #{originalPr}` and explicit credit to the
  original author, and that it is reassigned to them with a handoff comment — per
  `om-auto-review-pr`'s fork flow and the Supersede Credit Rule
  (`om-auto-update-changelog/references/supersede-credit-rule.md`).

Then **hand off**: this skill leaves the PR merge-ready and stops. The merge itself
belongs to `om-approve-merge-pr` (single PR) or `om-merge-buddy` (sweep), which
re-check every gate before squash-merging. Post one summary comment covering: base
merged in, loop outcome (review verdict, CI status, UI evidence), follow-ups filed,
and the merge-readiness verdict with the exact next command
(`om-approve-merge-pr {prNumber}` when ready, or the blocker when not).
