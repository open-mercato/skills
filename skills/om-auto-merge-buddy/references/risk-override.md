# Invocation-scoped risk override

`--force` (or its buddy alias `--skip-risk-checks`) requests `RISK_CHECKS_SKIPPED=true` for this invocation only, **outside protected areas**. Apply `references/human-gates.md` to each PR first: migrations, money, permissions/tenant-isolation, architecture and backward-incompatible changes always set effective `RISK_CHECKS_SKIPPED=false`, require the applicable pinned human approvals and never receive child `--skip-risk-checks`. A human veto is never overridable. Resolve the current item’s `automerge-force` label under `references/item-policy.md`; it requests the same two flags for that PR only. With no flag,
it is `false`, including when resuming a run created with force, unless that fresh item label is present. Do not load it
from config, saved PR metadata, a stage result, an old handoff or a prior status note. A freshly read modifier label is the only per-item policy input; it is never signal evidence.

The override skips exactly two risk-driven gates:

- `om-code-review`'s additional risk-high integration-evidence requirement, using its existing documented operator-waiver path through the orchestrated review stage;
- the risk-high exclusion from `om-auto-qa-pr` self-QA eligibility. All other eligibility criteria remain: real PASS, screenshots, `needs-qa` without `skip-qa`, evidence and tested-head sign-off.

It never skips review, actual correctness or security findings, validation,
required QA, CI, conflict checks, the head-SHA guard, tenant/auth boundaries,
claim ownership or the human automerge authorization. It does not relabel risk,
permit force-pushing or waive actual regression-test findings.

## Propagation and audit

Before launching a stage, when the effective per-PR override is allowed, record
`Risk checks: skipped — operator --force` with `RUN_ID` in the automation-authored
status comment. Keep this existing child-validation marker exact: the label and
alias resolve to the same buddy force request. Record the actual request source
(`cli --force`, `cli --skip-risk-checks`, or `label automerge-force`) separately;
never imply a literal CLI flag was supplied when it was label-derived. Record
the same decision in `RUN.md`, the current session, `HANDOFF.md` and `NOTIFY.md`.
Without an effective override, record `Risk checks: enforced`. Protected changes
always record `Risk checks: enforced — <protected areas>; --force cannot waive this gate`,
plus the exact missing human action and evidence under `references/human-gates.md`.
Sub-skills validate the current run’s status
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
visit without an effective override requires strict review instead of reusing override-derived
CR approval. QA independently accepts trusted completed same-head PASS under
`references/qa-evidence.md`, regardless of the self-QA label exception. Strict evidence can be
reused in force mode when all ordinary validity checks hold.
