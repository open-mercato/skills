#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const skill = read('skills/om-auto-merge-buddy/SKILL.md')
const window = read('skills/om-auto-merge-buddy/references/window.md')
const signals = read('skills/om-auto-merge-buddy/references/signals.md')
const status = read('skills/om-auto-merge-buddy/references/report-templates.md')
const stages = read('skills/om-auto-merge-buddy/references/stages.md')
const fork = read('skills/om-auto-review-pr/references/fork-pr-flow.md')
const start = window.match(/```bash\n([\s\S]*?)\n```/)[1]

for (const [minutes, now, reserve, expected] of [
  [0, 1000, 600, 0],
  [0, 100000, 300, 0],
  [120, 1000, 600, 0],
  [120, 1600, 600, 1],
  [120, 1600, 300, 0],
  [120, 2001, 300, 1],
]) {
  const result = spawnSync('bash', ['-eu'], {
    input: `${start}\nmerge_buddy_can_start ${now} ${reserve}\n`,
    env: { ...process.env, WINDOW_MINUTES: String(minutes), DEADLINE: '2000' },
    encoding: 'utf8',
  })
  assert.ifError(result.error)
  assert.equal(result.status, expected, `${minutes}-minute window, now=${now}, reserve=${reserve}: ${result.stderr}`)
}
assert.match(skill, /zero window takes one snapshot[\s\S]*?each entry once/)
assert.match(window, /do not refresh or poll after the snapshot is visited/)
console.log('PASS: shipped deadline predicate runs a zero-window pass and enforces positive-window reserves')

function recordFields(document) {
  const record = document.match(/```text\n(base:[\s\S]*?)\n```/)
  assert.ok(record, 'Signal record must carry its evaluation target')
  return record[1].split('\n').map(line => line.split(':')[0])
}
assert.deepEqual(recordFields(signals), ['base', 'riskChecks', 'head', 'cr', 'qa', 'ci', 'attempts'])
assert.deepEqual(recordFields(status), recordFields(signals), 'Written status and consumed signal schema must agree')
assert.match(signals, /missing or different `base` invalidates all three signals, even when the head is unchanged/)
assert.match(signals, /Older records without `base` are re-evaluated once/)
assert.match(stages, /target must still equal `base`/)
assert.match(stages, /revalidate every signal's source evidence immediately/)
assert.match(signals, /dismissed or deleted approval/)
assert.match(signals, /new changes-requested verdict after that approval reopens CR on the same head/)
assert.match(signals, /Invalidate a missing `qa-approved`/)
assert.match(signals, /rerun can turn an unchanged head pending or red/)
console.log('PASS: persisted target, legacy-record invalidation and same-head revocations stay in the read/write/final gate contracts')

assert.doesNotMatch(window, /Skip `waiting-human` PRs unless their labels/)
assert.match(window, /new `QA head:` note while the label set stays unchanged/)
assert.match(window, /Without new evidence, keep them waiting without running a stage or counting an attempt/)
assert.match(window, /Waiting-human PRs alone do not keep the polling loop alive/)
console.log('PASS: fresh QA evidence is revisited without a label mutation or repeated QA attempts')

const steps = [...fork.matchAll(/^(\d+)\. (.*)$/gm)].map(match => match[2])
const create = steps.findIndex(step => /Open a replacement PR/.test(step))
const handoff = steps.findIndex(step => /move any tracked run handoff/.test(step))
const close = steps.findIndex(step => /Close the original PR/.test(step))
assert.ok(create >= 0 && handoff > create && close > handoff, 'Create replacement before writing its number into tracked metadata, close original last')
assert.match(steps[create], /capture its number and URL/)
assert.match(steps[handoff], /commit and push[\s\S]*re-review the final replacement head/)
assert.match(steps[close], /final replacement head is approved/)
assert.doesNotMatch(fork, /Move the handoff\s+to the replacement before pushing/)
console.log('PASS: replacement-number creation precedes handoff migration and final-head approval precedes closing the original')
const followups = read('skills/om-auto-merge-buddy/references/followups.md')
const runLog = read('skills/om-auto-merge-buddy/references/run-log.md')
assert.match(followups, /om-followup-issue-from-pr <specific-comment-url>/)
assert.match(followups, /native review URL is evidence, not a supported helper input/)
assert.match(followups, /both open and closed states/)
assert.match(followups, /incomplete and leave the item pending/)
assert.match(followups, /at most one helper invocation per unique finding per run/)
assert.match(followups, /missing helper[\s\S]*stops this item's filing cleanly/i)
assert.match(followups, /Never use issue creation instead of fixing an actionable blocker or major/)
assert.match(followups, /Do not ask mid-run/)
assert.match(followups, /crash happened after issue creation[\s\S]*recovers that issue instead of creating another/)
assert.match(runLog, /Retry pending follow-up filing[\s\S]*even if its source PR has merged or closed/)
assert.match(runLog, /## Follow-ups/)
for (const stage of ['om-auto-review-pr', 'om-auto-qa-pr', 'om-auto-fix-pr']) {
  const contract = read(`skills/${stage}/references/orchestrated-mode.md`)
  assert.match(contract, /Deferred follow-ups/)
  assert.match(contract, /evidence=/)
  assert.match(contract, /reason for deferral and acceptance criteria/)
}
console.log('PASS: deferred findings keep actionable evidence, exact helper invocation, idempotent dedupe and recoverable failures')

for (const path of ['skills/om-setup-agent-pipeline/references/trackers/github.md', '.ai/trackers/github.md']) {
  const tracker = read(path)
  const search = tracker.split('#### search-issues')[1].split('#### create-issue')[0].match(/```bash\n([\s\S]*?)\n```/)[1]
  for (const state of ['open', 'closed', 'all', 'invalid']) {
    const result = spawnSync('bash', ['-eu'], {
      input: `gh() { printf '%s\\n' "$@"; }\n${search.replace('{state}', state)}\n`,
      env: { ...process.env }, encoding: 'utf8',
    })
    assert.ifError(result.error)
    assert.equal(result.status, state === 'invalid' ? 1 : 0, result.stderr)
    if (state !== 'invalid') {
      const args = result.stdout.trim().split('\n')
      assert.equal(args[args.indexOf('--state') + 1], state, 'Search must honor closed/all to recover issues after interrupted filing')
    }
  }
}
console.log('PASS: shipped and installed GitHub issue search executes open, closed and all state filters and rejects invalid states')
const override = read('skills/om-auto-merge-buddy/references/risk-override.md')
const reconcile = read('skills/om-auto-merge-buddy/references/reconcile.md')
assert.match(skill, /`--force`[\s\S]*?risk-high integration-evidence requirement and risk-high self-QA exclusion/)
assert.match(override, /With no flag,[\s\S]*it is `false`, including when resuming/)
assert.match(override, /never skips review, actual correctness or security findings, validation/)
assert.match(override, /required QA, CI, conflict checks, the head-SHA guard/)
assert.match(override, /existing `--force` remains claim takeover and is never forwarded/)
assert.match(signals, /do not bootstrap,[\s\S]*carry forward or re-grant CR or high-risk self-QA from evidence marked[\s\S]*`Risk checks: skipped`/)
assert.match(signals, /legacy record without this field[\s\S]*source evidence[\s\S]*checked for an override marker/)
assert.match(signals, /`waiting-human` caused only by the risk-high exclusion[\s\S]*reopened/)
for (const stage of ['om-auto-review-pr', 'om-auto-qa-pr', 'om-auto-fix-pr']) {
  const body = read(`skills/${stage}/SKILL.md`)
  const contract = read(`skills/${stage}/references/orchestrated-mode.md`)
  assert.match(body, /`--skip-risk-checks` \(optional, only with `--orchestrated`\)/)
  assert.match(contract, /Missing provenance or a standalone use returns `blocked`/)
  assert.match(contract, /Pass this distinct flag to every nested orchestrated stage/)
  assert.match(contract, /Record `Risk checks: skipped` plus the run id/)
}
console.log('PASS: forced risk waiver is explicit, separate from claim takeover, propagated and rejected on strict resume/bootstrap')

assert.match(skill, /Reconcile each signal at the entrance[\s\S]*even when signal labels are already present/)
assert.match(reconcile, /actual delta[\s\S]*git diff --name-status <evidence-sha> <current-sha>/)
assert.match(reconcile, /same-head revocation checks/)
assert.match(reconcile, /automatic conflict-free merge result[\s\S]*CR may carry forward/)
assert.match(reconcile, /Any other change after reviewed code[\s\S]*Invalidate CR and run the review stage as a delta re-review/)
assert.match(reconcile, /backend behavior reached by a tested user flow changed[\s\S]*Invalidate QA/)
assert.match(reconcile, /backend-only change outside those call paths can qualify; file type alone cannot/)
assert.match(reconcile, /Never carry CI from the old SHA or a saved green record/)
assert.match(reconcile, /human, a missing record, or a copied\/foreign marker triggers real-evidence[\s\S]*bootstrap; none is proof/)
assert.match(reconcile, /unknown tested scope[\s\S]*signal is missing and needs fresh production/)
assert.match(reconcile, /update the status comment[\s\S]*before launching a stage/)
console.log('PASS: entrance scope scenarios cover changed UI, dependent and unrelated backend changes, clean merges, forged labels and unknown evidence')
console.log('Merge buddy regressions passed.')
