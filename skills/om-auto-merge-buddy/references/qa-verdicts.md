# QA verdicts and QA findings

A QA verdict answers the `needs-qa` request, and its findings are work to fix.
This file says how this skill reads both. It is identical in `om-auto-review-pr`,
`om-auto-fix-pr` and `om-auto-merge-buddy`; only the "specifics" section differs.

## 1. Human verdict → drop the `needs-qa` request

A **human QA verdict** is either label on the PR:

- `qa-approved` without `qa-self-verified`. With `qa-self-verified`, the label came
  from the self-QA exception, not from a human tester.
- `qa-failed`, which automation applies only when a run was explicitly given
  `--apply-failure`. Treat the label as human unless this run's own
  `om-auto-qa-pr --apply-failure` report on the PR placed it.

When the tracker exposes label events, confirm that the actor is not
`CURRENT_USER`. When it cannot, use the provenance rules above. Never infer a verdict
from comment prose alone. A human NO-GO comment stays a veto (§3) but does not drop
`needs-qa` by itself.

On a human verdict, remove `needs-qa` through the `remove_label` guard (missing
label or `labels.enabled: false` → logged skip). Update this skill's
label-rationale comment in place: `` `needs-qa` removed — answered by the human QA
verdict `<label>` on <sha>. `` This rule removes only `needs-qa`. When `qaGateLabel`
names a narrower label, that label keeps its own apply/remove rules and stays the
human-QA gate.

Removing `needs-qa` never makes QA "not required":

- `qa-approved` stays pinned by its `QA head:` line. A later push to tested
  user-facing scope still needs re-testing, exactly as before.
- `qa-failed` stays a hard block until a human removes it.
- Any skill deciding whether QA applies treats a PR with `qa-approved` or
  `qa-failed` as QA-required, with or without `needs-qa`.

## 2. QA findings are fixable findings

When the skill runs autofix, collect QA findings on the current PR like any other
`INHERITED` review feedback and fix them in the same loop. Sources:

- human QA notes, NO-GO comments and inline comments from accounts with repository
  write access;
- the latest `om-auto-qa-pr` FAIL report on the PR. This is the one exception to
  dropping comments with a collection marker: keep its failed scenarios, unless a
  later PASS report on a head that includes the fix supersedes them.

Verify each finding against the current head in the worktree before fixing; an ask
the code already satisfies is resolved. Fix the root cause with a regression test
(UI fixes keep their screenshots in the next QA pass). Never weaken a test or change
expected results to make QA pass.

## 3. After QA fixes land

Fixing a finding never clears a verdict:

- **Human `qa-failed` or an unresolved human NO-GO.** Keep the label and the
  veto. Re-apply `needs-qa` to request a re-test of the new head (when the PR
  carries `skip-qa`, swap it out first: the two never coexist, and a human QA
  verdict shows QA applies), and post one comment: `` 🔁 QA findings from <link> fixed in <sha>; ready for re-test. `` A human
  QA reviewer re-tests and removes `qa-failed`, or explicitly releases the NO-GO.
- **Automatic `om-auto-qa-pr` FAIL only (no human veto).** Re-run QA on the new head
  where this skill runs QA. Otherwise leave `needs-qa` in place for the next QA
  pass.

Never add `qa-approved` here; it comes only from a human or from
`om-auto-qa-pr --self-qa-signoff`.

## om-auto-merge-buddy specifics

- §1 runs in the entrance reconciliation on every visit. This skill writes the
  `needs-qa` removal itself; its sub-skills run `--orchestrated` and do not.
- §2/§3: a human `qa-failed` or NO-GO is still a veto (`references/human-gates.md`).
  The visit may still run stage 1 (`om-auto-review-pr --orchestrated`) once on that
  head, with the QA findings `INHERITED`, to fix them, then apply §3 and end
  `waiting-human`. Fixing never clears the veto and never grants signal 2.
- Signal 2 is never `n/a` while `qa-approved` or `qa-failed` is present
  (`references/signals.md`).
