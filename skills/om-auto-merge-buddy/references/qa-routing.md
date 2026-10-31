# Automatic QA before a human wait

Resolve `automerge.defaultToHumanQa` from current `.ai/agentic.config.json`:
boolean, default **false**. Mutually exclusive `--human-qa` / `--auto-qa` override
it for this invocation. Reject conflicting flags or invalid types before claims.
Recompute config/CLI on each invocation and entrance, recording resolved value,
source and head in the existing status/run/plan. Saved scheduler/waiting-human
state is not routing authority. This is an approval-routing preference, never
permission to invent `qa-approved`, ignore failing scenarios or waive eligibility.

## Check even when the report-based QA signal already holds

Read applicable local mandatory QA rules and current-head approval evidence.
A completed trusted PASS remains reusable for the scenarios actually covered.
However, when local rules require a formal `qa-approved` sign-off and it is
missing/stale, or required scenarios remain testable and unverified, automatic
routing schedules `om-auto-qa-pr {pr} --orchestrated` instead of immediately
waiting for a human. This applies even when signal 2 was granted from a report,
old status says evidence-only/waiting-human, or the old report discloses gaps.
Do not use the report-only exception to bypass a mandatory local approval gate.

Pass the existing evidence and precise missing scenarios/sign-off to the child
in task context. Reuse completed unchanged-head covered scenarios; run the gaps
and any verification required for a legitimate current self-sign-off, not blind
full duplicate QA. Orchestrated QA already implies `--self-qa-signoff` and keeps
its sole eligible `qa-approved` + `qa-self-verified` label mutation. The buddy
never writes those labels. Risk policy, screenshots, full required coverage,
head pinning and all existing eligibility criteria still apply.

After eligible PASS, read the actual labels/sign-off back before declaring the
local gate satisfied. If sign-off completion needs repair, resume only that
idempotent QA step once with the evidence, not all covered scenarios. A failed
label write must expose its actual permission/API blocker; never assume it
landed or repeat a full test run indefinitely. A failing scenario goes to
review/autofix with the failure as INHERITED, then affected QA is rerun.

Only a verified automation blocker (after available environment recovery),
actual self-sign-off ineligibility with its exact policy/cause, genuinely interactive proof, or explicit
resolved `defaultToHumanQa: true` may route missing approval to waiting-human.
Explain the exact human actor/action/location/link, why the agent cannot act,
and resume condition. Missing labels/evidence-only/history alone are not such
blockers under the default automatic preference.

An automatic action not yet invoked is `queued-qa` — **Queued for automatic QA**,
unclaimed and with a concrete automatic next action. Do not claim `working`
without `in-progress`, or retain contradictory `waiting-human` while the reason
says no human action. Count attempts only for actual stage invocations, never
for selecting/reconciling a queued action. Preserve CI's actual pending/failed
record and every other signal; this route does not make the PR ready or merged.
An existing `automerge-blocked` still permits only reason inspection until its
unblock rule holds, never an automatic stage retry through this preference.

Use these decisions after fresh evidence/eligibility and local-rule checks.
`automationBlocker` must be a verified structured reason naming the actual
policy citation (for example risk-high without a validated risk override),
failed endpoint/credential or interactive proof, current head, exact actor and
action/location/link, why the agent cannot perform it and resume condition.
A bare false eligibility flag without those facts triggers automatic inspection,
not a fabricated human blocker. A label-write permission failure names the
actual operation/role and evidence rather than blanket "ask a human".

Use these decisions:

```javascript
function resolveQaRoutingPolicy({ config = {}, humanQa = false, autoQa = false } = {}) {
  if (humanQa && autoQa) throw new Error('Conflicting QA routing flags')
  const settings = config.automerge === undefined ? {} : config.automerge
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('Invalid automerge configuration')
  const configured = settings.defaultToHumanQa === undefined ? false : settings.defaultToHumanQa
  if (typeof configured !== 'boolean' || typeof humanQa !== 'boolean' || typeof autoQa !== 'boolean') throw new Error('Invalid QA routing policy')
  return { defaultToHumanQa: humanQa ? true : autoQa ? false : configured,
    source: humanQa || autoQa ? 'cli' : settings.defaultToHumanQa === undefined ? 'default' : 'config' }
}
function qaRoutingDecision({ head, reportPass = false, approvalRequired = false, approvalPresent = false, coverageGaps = [], defaultToHumanQa = false, selfSignoffEligible = null, automationBlocker = null, qaFailure = null, stagePassed = false, evidence = [] }) {
  const approvalMissing = approvalRequired && !approvalPresent
  const automatic = (code, summary, requiredAction, action = 'auto-qa') => ({ action, outcome: 'queued-qa', reason: {
    code, summary, gate: 'qa', head, humanActionRequired: false, owner: 'automation', requiredAction,
    whyAgentCannotAct: null, actionLocation: null, actionUrl: null, retryWhen: 'The scheduled automatic step completes', evidence } })
  if (qaFailure) return automatic('qa-failed', qaFailure, 'Autofix the linked failing scenario, then rerun affected QA', 'autofix')
  if (reportPass && !approvalMissing && !coverageGaps.length) return { action: 'reuse', outcome: null, reason: {
    code: 'qa-satisfied', summary: 'Current-head required QA evidence and applicable approval hold', gate: 'qa', head,
    humanActionRequired: false, owner: 'automation', requiredAction: 'Continue with the remaining signal checks',
    whyAgentCannotAct: null, actionLocation: null, actionUrl: null, retryWhen: 'The next signal assessment', evidence } }
  if (automationBlocker) {
    const complete = automationBlocker.humanActionRequired === true && automationBlocker.head === head
      && ['summary', 'owner', 'requiredAction', 'whyAgentCannotAct', 'retryWhen'].every(key => typeof automationBlocker[key] === 'string' && automationBlocker[key].trim().length > 0)
      && Array.isArray(automationBlocker.evidence) && Boolean(automationBlocker.actionLocation || automationBlocker.actionUrl || automationBlocker.evidence.length)
    return complete ? { action: 'waiting-human', outcome: 'waiting-human', reason: automationBlocker }
      : automatic('qa-blocker-unverified', 'A reported QA blocker lacks exact verified human-action facts', 'Inspect the specific policy, endpoint, permission and evidence before choosing a human action', 'inspect-eligibility')
  }
  if (approvalMissing && defaultToHumanQa) return {
    action: 'waiting-human', outcome: 'waiting-human', reason: { code: 'human-qa-preferred',
      summary: 'Current routing explicitly requests human QA approval',
      gate: 'qa', head, humanActionRequired: true, owner: 'authorized QA reviewer', requiredAction: 'Inspect the linked current-head QA evidence and apply legitimate QA approval',
      whyAgentCannotAct: 'The resolved config/CLI explicitly requests human QA approval for this invocation',
      actionLocation: 'Pull request QA approval/labels', actionUrl: null, retryWhen: 'A valid current-head approval appears', evidence } }
  if (approvalMissing && selfSignoffEligible === false && reportPass && !coverageGaps.length) return automatic('qa-eligibility-unexplained', 'Self-sign-off was reported ineligible without a concrete verified blocker', 'Inspect risk/override, credentials and interactive requirements; record the exact blocker or run automatic QA', 'inspect-eligibility')
  if (stagePassed && approvalMissing && selfSignoffEligible === true) return automatic('qa-signoff-unverified', 'Eligible QA passed, but required approval was not verified on read-back', 'Resume the idempotent QA sign-off step and verify its actual labels', 'verify-signoff')
  const gaps = coverageGaps.length ? ': ' + coverageGaps.join('; ') : ''
  return automatic(approvalMissing ? 'qa-approval-missing' : 'qa-coverage-missing',
    approvalMissing ? 'Repository-required current-head QA approval is missing' + gaps : 'Required QA verification remains' + gaps,
    'Run om-auto-qa-pr --orchestrated for missing coverage/sign-off, reusing covered current-head evidence')
}
```

Run this check at every entrance and the final guard, before treating all three
signals as permission to finish either mode. No final merge/prepare proceeds
while an applicable required local approval is missing. Preserve automatic
review and real QA verification; this preference adds no gate waiver.
