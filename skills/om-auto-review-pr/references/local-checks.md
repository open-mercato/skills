# Local-checks review

Accept `--local-checks` only when the calling
`om-auto-merge-buddy-streamlined` worker provides a verified live outer
claim for this PR. Apply `references/orchestrated-mode.md`, including
`--autofix`, no hosted CI repair or wait, immutable review evidence, and
its `RESULT:` and fork contracts. Keep the worker's claim and no risk waiver.

Evaluate and publish just the ordinary QA routing labels from step 10
against the final reviewed head. When the review workflow has a dedicated
QA triage step, run that step and use its lane decision. Maintain the
configured distinct human-QA label and `needs-qa` together in the human
lane and preserve human verdicts. Reconcile `skip-qa` using the existing
routing rules. Return the lane and any label write failure alongside the
review result so the queue can compare it with the live labels.

Consume concrete failure evidence from the worker, including a local check
failure or a QA scenario on the current head, as inherited findings.
Use the existing carry-forward flow if work on an unpushable fork is
required by a finding, a base conflict, or a tracked implementation step.
A carry requested solely to resume a tracked plan may move the existing
commits unchanged. It does not approve unfinished implementation. Return
the replacement so the worker can renew the claim and resume the plan.
