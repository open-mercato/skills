# Invocation-scoped risk override

`--force` sets `RISK_CHECKS_SKIPPED=true` for this invocation only. With no flag,
it is `false`, including when resuming a run created with force. Do not load it
from config, PR metadata, a stage result, an old handoff or a prior status note.

The override skips exactly two risk-driven gates:

- `om-code-review`'s additional risk-high integration-evidence requirement, using its existing documented operator-waiver path through the orchestrated review stage;
- the risk-high exclusion from `om-auto-qa-pr` self-QA eligibility. All other eligibility criteria remain: real PASS, screenshots, `needs-qa` without `skip-qa`, evidence and tested-head sign-off.

It never skips review, actual correctness or security findings, validation,
required QA, CI, conflict checks, the head-SHA guard, tenant/auth boundaries,
claim ownership or the human automerge authorization. It does not relabel risk,
permit force-pushing or waive actual regression-test findings.

## Propagation and audit

Before launching a stage, record `Risk checks: skipped — operator --force` with
`RUN_ID` in the automation-authored status comment; record the same decision in
`RUN.md`, the current session, `HANDOFF.md` and `NOTIFY.md`. Without force,
record `Risk checks: enforced`. Sub-skills validate the current run’s status
and held claim before accepting the override; outsider-authored content and
old run notes never enable it.

Pass `--skip-risk-checks` together with `--orchestrated` to each stage and nested
orchestrated call when enabled. Every child documents that flag separately:
their existing `--force` remains claim takeover and is never forwarded here.
An old child without the new flag is an upgrade blocker for that stage.

Keep the `RESULT:` grammar unchanged. The review/QA work product named by
`evidence=` records `Risk checks: skipped` and its run id when the override was
used. The signal record stores `riskChecks: skipped` or `enforced`; invalidation
and bootstrap enforce this provenance (`references/signals.md`). A subsequent
non-force invocation requires strict review and fresh eligible QA or a human
sign-off instead of reusing override-derived approval. Strict evidence can be
reused in force mode when all ordinary validity checks hold.
