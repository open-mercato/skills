# Entrance reconciliation — judge evidence and the changes since it

Run this procedure at the entrance of **every visit**, before choosing a stage,
even when all three signal labels and a same-head status record already exist.
Repeat it after a stage moves the head, after a replacement or retarget, and at
the final gate for any evidence or revision that changed during the visit.

## 1. Establish facts before using labels

Read the current head, target, labels, reviews and mergeability through
**get-pr**, then read the automation-authored signal record and its linked
review/QA reports. Verify each evidence author, verdict, tested/reviewed SHA,
target and risk-override provenance under `references/signals.md`. Read current
comments for revocations or newer failing evidence. Recompute mandatory local
QA approval/gap routing (`references/qa-routing.md`): default false
`defaultToHumanQa` schedules real automatic QA/sign-off even with existing
report PASS; old human-wait/evidence-only status does not suppress it. Recompute independent native
review from current config/explicit CLI and fresh evidence, never persisted
policy (`references/independent-review.md`). Default skips waiting for native
approval while automatic review and actionable inherited findings remain required.
Strict missing native evidence alone waits without rerunning automatic review. Check `references/qa-evidence.md` before treating a legacy same-head report as missing: trusted completed PASS wins without approval labels, risk/self-QA eligibility or complete-scope metadata. Coverage notes remain visible and do not reopen completed same-head QA. A signal label written by a
human, a missing record, or a copied/foreign marker triggers real-evidence
bootstrap; none is proof of a pass. Never infer reviewed revisions from commit
timestamps, label age, or reassuring summary prose.

For each CR and QA evidence revision, establish the **actual delta** to the
current head. Fetch the exact revisions into an isolated inspection worktree;
inspect the changed paths/statuses, patches and intervening commit history
(`git diff --name-status <evidence-sha> <current-sha>`, the corresponding full
diff and `git log`). Use validated SHAs and quote them. The complete PR diff
against its base is context, not a substitute for this evidence-to-head delta.
If evidence is not an ancestor, inspect the two trees and relevant history;
never assume a force-push preserved tested behavior. An unavailable revision,
truncated diff, unknown tested scope for changed-head carry-forward, or unprovable merge-only claim means that
signal is missing and needs fresh production, not a guessed carry-forward.

## 2. Judge each signal separately

| Evidence and observed change | Decision and next action |
|---|---|
| Trusted completed same-head auto-QA PASS, including legacy uniquely resolved short SHA and evidence-only/risk-high | Grant QA from the report without approval labels or another attempt; skip stage 2. Disclosed coverage notes and unknown carry-forward scope do not reject this unchanged-head acceptance. |
| Same revision, target and risk mode; real approval remains valid | Retain CR/QA only after same-head revocation checks. CI is reread independently. |
| Every intervening commit only merges the current target and each resulting tree equals the automatic conflict-free merge result | CR may carry forward, with the merge proof and source approval linked. If the merge result cannot be proved, request delta review. Judge QA's tested scope separately; CI always uses the current head. |
| Any other change after reviewed code: UI, backend, tests, config or metadata | Invalidate CR and run the review stage as a delta re-review against the last valid reviewed SHA, keeping unresolved findings inherited. A small diff or matching labels never substitutes for review. |
| UI, routes, templates, copy, styles, or backend behavior reached by a tested user flow changed | Invalidate QA and rerun the affected scenarios on the current head. Inspect call sites/API behavior; a backend `.ts` file can change a tested screen without editing `.tsx`. |
| Real QA evidence identifies the tested scope, and inspected changes do not affect that scope or any behavior it depends on | Carry QA forward with the exact unchanged scenarios, delta and reason, linked to the old `QA head:` and current head. A backend-only change outside those call paths can qualify; file type alone cannot. |
| Any head change, check rerun, new workflow, or pending/failing current-head run | Never carry CI from the old SHA or a saved green record. Read current-head checks plus workflow completeness; wait, repair or grant CI from those actual readings. |
| Explicit CI baseline opt-in and a failing current-head check | Compare the exact current target SHA, check context/configuration and logs under `references/ci-baseline.md`. Waive only a proved identical completed failure; log both runs and the signature. Unknown or pending comparisons remain unsatisfied. |
| Missing/untrusted evidence, unknown impact, changed target, expired risk override, removed approval or newer failing evidence | Invalidate the affected signals under `references/signals.md`; bootstrap trusted evidence when possible, otherwise run the required stage or wait for human QA. |

A `n/a` QA entry is recomputed from today's QA requirement; it is not inferred
from a previous label snapshot. Force mode skips only its documented risk gates,
never this evidence reconciliation or actual review/QA/CI work.

## 3. Record the assessment before acting

Write an `evidence reconciliation` row in `RUN.md` and update the status comment
before launching a stage. For **each signal**, record:

- source evidence link, evidence SHA and current SHA, target and risk mode;
- inspected comparison/commits and affected behavior or explicitly unchanged tested scenarios;
- `retain`, `carry-forward` or `invalidate`, its concrete reason and the next action (`delta review`, affected QA scenarios, current-head CI reading, or waiting-human).

Rewrite held records to the assessed current head/target with the source link
and carry-forward reason, and remove invalidated signal labels immediately.
Keep a missing-evidence or unknown-scope reason visible. The ladder starts at
the first **actually missing** signal; it never reruns already-supported work
solely because a label exists, and never skips work solely because one exists.
