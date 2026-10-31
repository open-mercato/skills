#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { runInNewContext } from 'node:vm'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
assert.deepEqual(recordFields(signals), ['base', 'riskChecks', 'ciPolicy', 'ciTarget', 'head', 'cr', 'qa', 'ci', 'attempts'])
assert.deepEqual(recordFields(status), recordFields(signals), 'Written status and consumed signal schema must agree')
assert.match(signals, /missing or different `base` invalidates all three signals, even when the head is unchanged/)
assert.match(signals, /Older records without `base` are re-evaluated once/)
assert.match(stages, /target must still equal `base`/)
assert.match(stages, /revalidate every signal's source evidence immediately/)
assert.match(signals, /dismissed or deleted approval/)
assert.match(signals, /new changes-requested verdict after that approval reopens CR on the same head/)
assert.match(signals, /missing `qa-approved` invalidates only approval-derived QA/)
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
assert.match(signals, /do not bootstrap,[\s\S]*carry forward or re-grant CR from evidence marked[\s\S]*`Risk checks: skipped`/)
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
for (const stage of ['om-auto-merge-buddy', 'om-auto-fix-pr']) {
  const baseline = read(`skills/${stage}/references/ci-baseline.md`)
  assert.match(read(`skills/${stage}/SKILL.md`), /`--skip-pre-existing-ci-errors`/)
  assert.match(baseline, /Default off/)
  assert.match(baseline, /exact current target SHA/)
  assert.match(baseline, /latest attempt for each matching workflow\/job\/context/)
  assert.match(baseline, /Same display name or generic failure text alone is insufficient/)
  assert.match(baseline, /same diagnostic signature [\s\S]*root cause/)
  assert.match(baseline, /Relevant workflow\/job definitions, referenced scripts, actions, test inputs and lock\/configuration[\s\S]*must be unchanged/)
  assert.match(baseline, /`PENDING`, `QUEUED`, `IN_PROGRESS`, `ACTION_REQUIRED`[\s\S]*never waived/)
  assert.match(baseline, /Mixed baseline \+ new failures still require repair; mixed baseline \+ pending remains `waiting-ci`/)
  assert.match(baseline, /target advance, PR head change,[\s\S]*rerun[\s\S]*invalidates the[\s\S]*proof/)
  assert.match(baseline, /later invocation without the flag, invalidate waiver-derived[\s\S]*CI and apply strict evaluation/)
}
assert.match(signals, /ciPolicy: <strict\|skip-proven-baseline-errors>/)
assert.match(signals, /ciTarget: <target-sha\|none>/)
const ciStage = read('skills/om-auto-fix-pr/references/orchestrated-mode.md')
assert.match(ciStage, /baseline proof and deferred findings coexist[\s\S]*same baseline CI proof comment[\s\S]*single combined comment URL/)
assert.match(stages, /resolve the target tip again and revalidate/)
console.log('PASS: CI baseline waiver requires exact current target/context/config/log root cause, rejects unknown/pending/new failures, expires on strict resume, and preserves combined proof/followups')
const qaEvidence = read('skills/om-auto-merge-buddy/references/qa-evidence.md')
const decideQa = runInNewContext(`${qaEvidence.match(/```javascript\n([\s\S]*?)\n```/)[1]}\ncompletedQaEvidence`)
const qaHead = '852eba38bc4706b4939af0ecc1111c3e84df7104'
const qaHistory = [
  { author: 'adeptofvoltron', createdAt: '2026-10-31T10:00:00Z', url: 'https://example.invalid/pull/6786#issuecomment-1', body: '🤖 `om-auto-qa-pr` — starting QA in evidence-only mode' },
  { author: 'adeptofvoltron', createdAt: '2026-10-31T10:10:00Z', url: 'https://example.invalid/pull/6786#issuecomment-2', body: '# UI QA evidence — PASS\n**Verdict:** ✅ PASS\n**Verified:** `branch` @ `852eba38`\nEvidence-only. Restricted admin and parent-child paths untested. Risk-high.' },
  { author: 'adeptofvoltron', createdAt: '2026-10-31T10:11:00Z', url: 'https://example.invalid/pull/6786#issuecomment-3', body: '🤖 om-auto-qa-pr completed: PASS' },
]
const qaInput = { head: qaHead, comments: qaHistory, writeAuthors: ['adeptofvoltron'], resolveRevision: revision => revision === '852eba38' ? qaHead : null }
const qaPass = decideQa(qaInput)
assert.equal(qaPass.held, true, 'PR6786 trusted completed evidence-only PASS must grant QA despite risk-high, coverage notes and no approval labels')
assert.equal(qaPass.sha, qaHead)
assert.equal(qaPass.author, 'adeptofvoltron', 'Source evidence need not come from CURRENT_USER')
assert.equal(qaPass.evidence, qaHistory[1].url)
for (const changed of [
  { head: 'a'.repeat(40) },
  { writeAuthors: [] },
  { resolveRevision: () => null },
  { resolveRevision: () => { throw new Error('ambiguous object') } },
  { comments: qaHistory.slice(1) },
  { comments: qaHistory.slice(0, 2) },
  { comments: qaHistory.map((comment, index) => index === 2 ? { ...comment, author: 'other-writer' } : comment), writeAuthors: ['adeptofvoltron', 'other-writer'] },
  { comments: [...qaHistory, { author: 'adeptofvoltron', createdAt: '2026-10-31T10:20:00Z', url: 'https://example.invalid/fail', body: 'om-auto-qa-pr completed: FAIL' }] },
  { comments: [...qaHistory, { author: 'adeptofvoltron', createdAt: '2026-10-31T10:20:00Z', url: 'https://example.invalid/revoked', body: 'QA report revoked' }] },
]) assert.equal(decideQa({ ...qaInput, ...changed }).held, false, JSON.stringify(changed))
assert.equal(decideQa({ ...qaInput, comments: [...qaHistory, { author: 'untrusted-outsider', createdAt: '2026-10-31T10:20:00Z', body: 'om-auto-qa-pr completed: FAIL' }] }).held, true, 'Untrusted pasted verdicts do not revoke trusted evidence')
assert.match(signals, /no QA attempt is counted/)
assert.match(stages, /grants signal 2 and skips this stage with zero attempts/)
console.log('PASS: executable PR6786 legacy completed-PASS decision grants same-head QA without approval labels and rejects wrong/ambiguous head, missing linkage, untrusted authors, newer FAIL and revoked evidence')

const scheduler = read('skills/om-auto-merge-buddy/references/scheduler.md')
const schedulerCode = scheduler.match(/```javascript\n([\s\S]*?)\n```/)[1]
const schedulerFunctions = runInNewContext(`${schedulerCode}\n({restoreScheduler, checkpointPlan, replaceTracked, schedulerDecision, nextCiCheck, reservationAllows, mayReclaim, finalizeTracked})`)
const { restoreScheduler, checkpointPlan, replaceTracked, schedulerDecision, nextCiCheck, reservationAllows, mayReclaim, finalizeTracked } = schedulerFunctions
const scheduleNow = '2026-10-31T14:00:00.000Z'
const earlierTime = '2026-10-31T13:00:00.000Z'
const futureTime = '2026-10-31T14:10:00.000Z'
const tracked = number => ({ number, nextAction: 'Read checks', outcome: 'waiting-ci', plan: [{ step: 'CI', status: 'pending', evidence: 'run-url' }], nextCheckAt: scheduleNow, lastWorkedAt: earlierTime, updatedAt: earlierTime, attempts: 2 })
const candidate = (number, extra = {}) => ({ number, state: 'open', authorized: true, claimable: true, actionable: true, assignees: [], ...extra })
const decide = extra => schedulerDecision({ activePrs: [tracked(1)], candidates: [candidate(1), candidate(2, { assignees: ['pkarw'] }), candidate(3)], currentUser: 'pkarw', now: scheduleNow, ...extra })
assert.equal(decide({}).next, 1, 'Due tracked CI is inspected before assigned or new queue work')
assert.equal(decide({ activePrs: [{ ...tracked(1), nextCheckAt: futureTime }], candidates: [candidate(1, { changed: true }), candidate(2)] }).next, 1, 'Settled CI or new evidence discovered at entrance overrides an old future estimate')
assert.equal(decide({ activePrs: [{ ...tracked(1), nextCheckAt: futureTime }] }).next, 2, 'Future pending CI permits actionable owned work')
assert.equal(decide({ activePrs: [{ ...tracked(1), nextCheckAt: futureTime }], candidates: [candidate(1), candidate(3)] }).next, 3, 'Future pending CI permits new global admission when nothing owned is actionable')
assert.equal(decide({ activePrs: [{ ...tracked(1), nextCheckAt: futureTime }], candidates: [candidate(1), candidate(3)], ownedComplete: false }).source, 'unknown-owned', 'Unreadable owned state never proves no owned work')
assert.equal(decide({ activePrs: [], candidates: [candidate(3), candidate(2, { assignees: ['pkarw'] })] }).next, 3, 'Empty/reset admission preserves the old queue ordering instead of imposing assigned-only priority')
const recentDecision = decide({ activePrs: [tracked(1), { ...tracked(4), lastWorkedAt: '2026-10-31T13:59:00.000Z' }], candidates: [candidate(1), candidate(4)] })
assert.equal(recentDecision.next, 4, 'Most recently worked due record resumes first')
assert.equal(decide({ activePrs: [tracked(4), tracked(1)], candidates: [candidate(4), candidate(1)] }).next, 1, 'PR number deterministically breaks work-recency ties')
for (const extra of [{ claimable: false }, { actionable: false }, { state: 'closed' }, { state: 'merged' }, { authorized: false }]) {
  assert.notEqual(decide({ candidates: [candidate(1, extra), candidate(2)] }).next, 1)
}
for (const outcome of ['ready', 'blocked', 'waiting-human']) {
  const entry = { ...tracked(1), outcome }
  const inspection = decide({ activePrs: [entry] })
  assert.equal(inspection.next, 1, 'Due inactive state receives a cheap inspection')
  assert.equal(inspection.activePrs[0].attempts, 2, 'Selection/recheck never resets or consumes stage attempts')
  assert.equal(decide({ activePrs: [{ ...entry, nextCheckAt: futureTime }], candidates: [candidate(1), candidate(3)] }).next, 3)
}
const filtered = decide({ activePrs: [tracked(1), tracked(4)], candidates: [candidate(1), candidate(4)], onlyPr: 4 })
assert.equal(filtered.next, 4)
assert.equal(filtered.activePrs.length, 2, '--pr never discards other active plans')
assert.equal(decide({ candidates: [candidate(1, { state: 'merged' }), candidate(2)] }).activePrs.length, 0, 'Merged/closed/no-authorization records leave active scheduling')
assert.equal(nextCiCheck({ now: scheduleNow }), '2026-10-31T14:05:00.000Z')
assert.equal(nextCiCheck({ now: scheduleNow, elapsedMs: 120000, completedDurationsMs: [240000, 300000, 600000] }), '2026-10-31T14:03:00.000Z')
assert.equal(nextCiCheck({ now: scheduleNow, elapsedMs: 900000, completedDurationsMs: [300000] }), '2026-10-31T14:01:00.000Z', 'Overdue pending CI gets a future minimum rather than busy polling')
const restoreInput = { repository: 'open-mercato/skills', currentUser: 'pkarw', now: scheduleNow, recovered: [tracked(1)] }
for (const raw of [undefined, '', '{corrupt']) {
  const restored = restoreScheduler({ ...restoreInput, raw })
  assert.equal(restored.state.activePrs[0].number, 1, 'Missing/deleted/corrupt file recovers plan from authenticated own status checkpoints')
  assert.equal(restored.quarantine, raw === '{corrupt')
}
const oldState = { version: 1, repository: 'open-mercato/skills', currentUser: 'pkarw', updatedAt: earlierTime, activePrs: [tracked(1)] }
assert.equal(restoreScheduler({ ...restoreInput, raw: JSON.stringify(oldState), reset: true }).state.activePrs.length, 0, 'Reset starts empty without replaying recovered or old handoff queues')
assert.equal(oldState.activePrs[0].attempts, 2, 'Reset does not mutate source attempt/evidence records')
for (const change of [{ currentUser: 'foreign-user' }, { repository: 'foreign/repo' }, { version: 2 }]) {
  assert.throws(() => restoreScheduler({ ...restoreInput, raw: JSON.stringify({ ...oldState, ...change }), reset: true }), /Foreign or unsupported/, 'Reset cannot overwrite foreign state')
}
assert.throws(() => restoreScheduler({ ...restoreInput, recovered: [{ ...tracked(1), nextCheckAt: 'invalid' }] }), /Invalid recovered/)
const heartbeat = checkpointPlan(tracked(1), { heartbeat: scheduleNow, instanceId: 'new-instance' }, scheduleNow)
assert.equal(heartbeat.updatedAt, earlierTime, 'Heartbeat/instance changes do not masquerade as plan progress')
assert.equal(heartbeat.lastWorkedAt, earlierTime)
const progress = checkpointPlan(tracked(1), { nextAction: 'Review fresh head' }, scheduleNow, true)
assert.equal(progress.updatedAt, scheduleNow)
assert.equal(progress.lastWorkedAt, scheduleNow)
const moved = replaceTracked([tracked(1), tracked(3)], 1, { ...progress, number: 4 })
assert.equal(moved.some(entry => entry.number === 1), false)
assert.equal(moved.filter(entry => entry.number === 4).length, 1, 'Replacement moves one active record atomically')
assert.equal(moved.find(entry => entry.number === 4).nextAction, progress.nextAction)
assert.match(scheduler, /nonblocking OS advisory file lock/)
assert.match(scheduler, /Never unlink or replace the lock inode/)
assert.match(scheduler, /contending instance\nleaves the file and tracker untouched/)
assert.match(scheduler, /Do not leave a lock\nhelper running across model turns/)
assert.match(scheduler, /Merge \*\*only that owned row\*\*/)
assert.match(scheduler, /flush it,\nand atomically rename it/)
assert.match(scheduler, /search the full comment history first; create only when no own marker exists/)
assert.match(scheduler, /Do not\n  unassign anyone, delete comments, clear `in-progress`\/blocks, reset attempts/)
assert.match(scheduler, /pending follow-up filing\nin the separate run handoff even after removing its PR/)
assert.match(skill, /\*\*assign-pr\*\* `CURRENT_USER`, verify the assignment/)
assert.match(status, /\*\*updatedAt:\*\*/)
assert.match(status, /Scheduler checkpoint/)
console.log('PASS: executable durable scheduler resumes due/recent/owned work, avoids future-CI starvation and polling, recovers/reset state safely, preserves attempts/other PRs and checkpoints semantic progress/replacements')

const reservation = { instanceId: 'instance-a', runId: 'run-a', token: 'token-a' }
const reservationInput = { reservation, ...reservation, ownerStatus: 'live' }
assert.equal(reservationAllows(reservationInput), true)
for (const change of [{ instanceId: 'instance-b' }, { runId: 'run-b' }, { token: 'stale-token' }, { ownerStatus: 'dead' }, { ownerStatus: 'unknown' }]) {
  assert.equal(reservationAllows({ ...reservationInput, ...change }), false, 'Fencing rejects foreign/stale/unknown actors before any mutation')
}
assert.equal(mayReclaim({ ownerStatus: 'dead', delegatedStatuses: ['dead'] }), true)
for (const change of [{ ownerStatus: 'live', delegatedStatuses: ['dead'] }, { ownerStatus: 'unknown', delegatedStatuses: [] }, { ownerStatus: 'dead', delegatedStatuses: ['live'] }, { ownerStatus: 'dead', delegatedStatuses: ['unknown'] }, { ownerStatus: 'dead' }]) {
  assert.equal(mayReclaim(change), false, 'Heartbeat age or dead parent alone never permits takeover while delegated work may survive')
}
const protectedReset = restoreScheduler({ ...restoreInput, raw: JSON.stringify(oldState), reset: true, protectedNumbers: [1] })
assert.equal(protectedReset.state.activePrs[0].number, 1, 'Reset preserves foreign live/unknown reservations')
assert.equal(decide({ activePrs: protectedReset.state.activePrs, candidates: [candidate(1, { claimable: false }), candidate(3), candidate(2, { assignees: ['pkarw'] })], resetAdmission: true }).next, 3, 'Reset uses old queue ordering while protecting live reservation')
assert.match(runLog, /Recover the in-flight plan, then schedule it/)
assert.doesNotMatch(runLog, /Its `in-progress` claim is this skill's own stale claim/)
console.log('PASS: short transaction locks and fencing preserve live/unknown reservations through reset and reject stale owner or delegated-work takeover')

const reservedEntry = { ...tracked(1), reservation: { ...reservation, host: 'machine', pid: 123, processStartedAt: earlierTime, delegatedHandles: [] } }
assert.equal(decide({ activePrs: [reservedEntry], candidates: [candidate(1, { state: 'merged' }), candidate(3)] }).activePrs.length, 1, 'Terminal reserved row survives until final fenced claim cleanup')
assert.throws(() => restoreScheduler({ ...restoreInput, raw: JSON.stringify({ ...oldState, activePrs: [{ ...tracked(1), reservation: { instanceId: 'partial' } }] }), reset: true }), /ownership unknown/, 'Malformed reservation cannot be wiped by reset/corruption recovery')
assert.equal(restoreScheduler({ ...restoreInput, raw: JSON.stringify({ ...oldState, activePrs: [reservedEntry] }) }).state.activePrs.length, 1)
let released = false
const finalized = await finalizeTracked({ activePrs: [reservedEntry], number: 1, ownsReservation: true, releaseOwnedClaim: () => { released = true } })
assert.equal(released, true)
assert.equal(finalized.length, 0, 'Delete only after the final owned tracker cleanup succeeds')
await assert.rejects(() => finalizeTracked({ activePrs: [reservedEntry], number: 1, ownsReservation: true, releaseOwnedClaim: async () => { throw new Error('tracker unavailable') } }), /tracker unavailable/)
assert.equal(reservedEntry.number, 1, 'Partial cleanup failure retains the caller state for retry')
await assert.rejects(() => finalizeTracked({ activePrs: [reservedEntry], number: 1, ownsReservation: false, releaseOwnedClaim: () => { throw new Error('must not call') } }), /verified before cleanup/)
let resolveCleanup
const cleanupPending = new Promise(resolve => { resolveCleanup = resolve })
let cleanupFinished = false
const waitingFinalization = finalizeTracked({ activePrs: [reservedEntry], number: 1, ownsReservation: true, releaseOwnedClaim: () => cleanupPending }).then(rows => { cleanupFinished = true; return rows })
await Promise.resolve()
assert.equal(cleanupFinished, false, 'An unresolved async tracker cleanup must retain the row')
resolveCleanup()
assert.equal((await waitingFinalization).length, 0)
assert.match(stages, /child task context \(no new CLI flags\)/)
console.log('PASS: terminal cleanup is fenced and precedes row removal; malformed ownership stays protected through reset')

const independentPolicy = read('skills/om-auto-merge-buddy/references/independent-review.md')
const policyCode = independentPolicy.match(/```javascript\n([\s\S]*?)\n```/)[1]
const { resolveAutomergePolicy, independentReviewDecision } = runInNewContext(`${policyCode}\n({resolveAutomergePolicy, independentReviewDecision})`)
assert.equal(resolveAutomergePolicy({}).mode, 'prepare-and-merge', 'Missing mode defaults to actual guarded merge')
assert.equal(resolveAutomergePolicy({}).requireIndependentReview, false)
assert.equal(resolveAutomergePolicy({ config: { automerge: { mode: 'prepare-to-merge', requireIndependentReview: true } } }).mode, 'prepare-to-merge', 'Explicit configured preparation-only mode stays honored')
assert.equal(resolveAutomergePolicy({ config: { automerge: { mode: 'prepare-to-merge' } }, mode: 'prepare-and-merge' }).mode, 'prepare-and-merge')
assert.equal(resolveAutomergePolicy({ config: { automerge: { mode: 'prepare-and-merge' } }, mode: 'prepare-to-merge' }).mode, 'prepare-to-merge')
assert.equal(resolveAutomergePolicy({ config: { automerge: { requireIndependentReview: true } }, skipReview: true }).requireIndependentReview, false, 'Explicit skip overrides config true')
assert.equal(resolveAutomergePolicy({ config: { automerge: { requireIndependentReview: false } }, requireReview: true }).requireIndependentReview, true)
assert.equal(resolveAutomergePolicy({ requireReview: true }).independentReviewSource, 'cli')
assert.equal(resolveAutomergePolicy({ config: { automerge: { requireIndependentReview: false } } }).independentReviewSource, 'config')
for (const input of [{ requireReview: true, skipReview: true }, { mode: 'invalid' }, { config: { automerge: { mode: null } } }, { config: { automerge: { requireIndependentReview: 'false' } } }, { config: { automerge: { requireIndependentReview: null } } }, { config: { automerge: { requireIndependentReview: 0 } } }]) {
  assert.throws(() => resolveAutomergePolicy(input), /Conflicting|Invalid/, 'Invalid or conflicting merge policy never silently falls back')
}
const nativeApproval = { author: 'human-reviewer', type: 'User', writeAccess: true, isBot: false, state: 'APPROVED', commit: qaHead, submittedAt: earlierTime, url: 'https://example.invalid/review/1' }
const nativeInput = { required: false, head: qaHead, author: 'pr-author', currentUser: 'pkarw', automationApproved: true, unresolvedFindings: false }
const nativeDecision = extra => independentReviewDecision({ ...nativeInput, ...extra })
assert.equal(nativeDecision({}).outcome, 'pass', 'Author comment code approval holds without a native review by default')
assert.equal(nativeDecision({ reviews: [{ ...nativeApproval, state: 'CHANGES_REQUESTED' }] }).outcome, 'pass', 'Stale native state alone does not block default after inherited findings are resolved')
for (const required of [false, true]) {
  assert.equal(nativeDecision({ required, automationApproved: false, reviews: [nativeApproval] }).outcome, 'review-required', 'Human native review never replaces automatic code review')
  assert.equal(nativeDecision({ required, unresolvedFindings: true, reviews: [nativeApproval] }).outcome, 'review-required', 'Actual objections always route to autofix')
}
assert.equal(nativeDecision({ required: true }).outcome, 'waiting-human', 'A later strict invocation does not reuse a default skip policy')
assert.equal(nativeDecision({ required: true, reviews: [nativeApproval] }).outcome, 'pass')
assert.equal(nativeDecision({ required: true, reviews: [nativeApproval], reviewsComplete: false }).outcome, 'waiting-human')
for (const change of [{ author: 'pr-author' }, { author: 'pkarw' }, { isBot: true }, { type: 'Bot' }, { writeAccess: false }, { state: 'COMMENTED' }, { state: 'DISMISSED' }, { commit: 'b'.repeat(40) }]) {
  assert.equal(nativeDecision({ required: true, reviews: [{ ...nativeApproval, ...change }] }).outcome, 'waiting-human', 'Strict approval must be fresh native current-head independent human evidence')
}
assert.equal(nativeDecision({ required: true, reviews: [nativeApproval, { ...nativeApproval, state: 'DISMISSED', submittedAt: scheduleNow }] }).outcome, 'waiting-human')
assert.equal(nativeDecision({ required: true, reviews: [nativeApproval, { ...nativeApproval, author: 'another-human', state: 'CHANGES_REQUESTED', submittedAt: scheduleNow }] }).outcome, 'waiting-human')
assert.equal(nativeDecision({ required: true, reviews: [nativeApproval, { ...nativeApproval, state: 'COMMENTED', submittedAt: scheduleNow }] }).outcome, 'pass', 'Ordinary comments do not revoke a native approval')
assert.match(stages, /no mode or host bypass may bypass\nthat requirement/)
assert.match(independentPolicy, /Do not rerun a producing\nstage, consume an attempt/)
const repoAutomerge = JSON.parse(read('.ai/agentic.config.json')).automerge
assert.equal(repoAutomerge.mode, 'prepare-and-merge')
assert.equal(repoAutomerge.requireIndependentReview, false)
for (const document of [read('skills/om-setup-agent-pipeline/SKILL.md'), read('skills/om-setup-agent-pipeline/references/config-capabilities.md')]) {
  assert.match(document, /requireIndependentReview/)
  assert.match(document, /prepare-and-merge/)
}
console.log('PASS: config-first mode/native policy defaults to guarded merge without native wait; CLI overrides, strict evidence, new objections, stale status and invalid flags are enforced')

const journalCode = [...scheduler.matchAll(/```javascript\n([\s\S]*?)\n```/g)][1][1]
const upsertMergedJournal = runInNewContext(`${journalCode}\nupsertMergedJournal`)
const mergedRecord = { repository: 'open-mercato/skills', number: 1, url: 'https://example.invalid/pr/1', outcome: 'merged', mergedAt: scheduleNow, updatedAt: scheduleNow, head: qaHead, mergeSha: 'c'.repeat(40), base: 'main', plan: [{ step: 'Merge', status: 'done' }], nextAction: 'None', evidence: ['https://example.invalid/review/1'], statusCommentUrl: 'https://example.invalid/status/1', reservation }
const firstJournal = upsertMergedJournal({ record: mergedRecord })
assert.equal(firstJournal.day, '2026-10-31')
assert.equal(firstJournal.jsonl.trim().split('\n').length, 1)
assert.equal(JSON.parse(firstJournal.jsonl).reservation, undefined, 'Public merge journal excludes owner token/process internals')
const retryJournal = upsertMergedJournal({ raw: firstJournal.jsonl, record: mergedRecord })
assert.equal(retryJournal.jsonl, firstJournal.jsonl, 'Retry is exactly idempotent')
const updatedJournal = upsertMergedJournal({ raw: firstJournal.jsonl, record: { ...mergedRecord, nextAction: 'Follow up issue', updatedAt: '2026-11-01T02:00:00.000Z' } })
assert.equal(updatedJournal.day, '2026-10-31', 'Late status updates stay in tracker-confirmed mergedAt UTC day')
assert.equal(updatedJournal.jsonl.trim().split('\n').length, 1)
assert.equal(JSON.parse(updatedJournal.jsonl).nextAction, 'Follow up issue')
assert.equal(upsertMergedJournal({ raw: updatedJournal.jsonl, record: mergedRecord }).jsonl, updatedJournal.jsonl, 'Stale retry preserves newest final status')
const distinctJournal = upsertMergedJournal({ raw: updatedJournal.jsonl, record: { ...mergedRecord, number: 2 } })
assert.equal(distinctJournal.jsonl.trim().split('\n').length, 2, 'Other merged PR rows survive upsert')
assert.equal(upsertMergedJournal({ raw: firstJournal.jsonl + firstJournal.jsonl, record: mergedRecord }).jsonl.trim().split('\n').length, 1, 'Preexisting duplicates normalize to one latest row per repo+PR')
for (const input of [{ raw: '{malformed', record: mergedRecord }, { record: { ...mergedRecord, outcome: 'ready' } }, { record: { ...mergedRecord, outcome: 'closed' } }, { record: { ...mergedRecord, mergedAt: null } }, { raw: firstJournal.jsonl, record: { ...mergedRecord, mergedAt: '2026-11-01T00:00:00.000Z' } }]) {
  assert.throws(() => upsertMergedJournal(input), /JSON|Confirmed|Malformed/, 'Malformed/unmerged/wrong-day journal input must fail without deleting active state')
}
const finalizationOrder = []
await finalizeTracked({ activePrs: [reservedEntry], number: 1, ownsReservation: true, releaseOwnedClaim: async () => { finalizationOrder.push('status-and-claim') }, mergedRecord, writeMergedJournal: async () => { finalizationOrder.push('journal') } })
assert.deepEqual(finalizationOrder, ['status-and-claim', 'journal'], 'Confirm/mirror/claim cleanup precedes durable journal and row deletion')
await assert.rejects(() => finalizeTracked({ activePrs: [reservedEntry], number: 1, ownsReservation: true, releaseOwnedClaim: async () => {}, mergedRecord, writeMergedJournal: async () => { throw new Error('journal write failed') } }), /journal write failed/)
assert.equal(reservedEntry.number, 1, 'Journal failure retains source row for cleanup retry')
assert.doesNotMatch(status.match(/```json\n([\s\S]*?)\n```/)[1], /reservation|token|processStartedAt|delegatedHandles/)
console.log('PASS: daily UTC confirmed-merge JSONL upserts latest status exactly once, preserves other PRs, excludes private ownership and retains cleanup after write failure')

const loaderTemp = mkdtempSync(join(tmpdir(), 'merge-buddy-policy-'))
try {
  const configPath = join(loaderTemp, 'config.json')
  for (const loaderPath of ['skills/om-auto-merge-buddy/references/agentic-setup.md', 'skills/om-setup-agent-pipeline/references/config-capabilities.md']) {
    const loader = read(loaderPath)
    for (const [slot, fixtures] of [
      ['AUTOMERGE_MODE', [[{}, 'prepare-and-merge'], [{ mode: 'prepare-to-merge' }, 'prepare-to-merge'], [{ mode: null }, null], [{ mode: 'invalid' }, null]]],
      ['REQUIRE_INDEPENDENT_REVIEW', [[{}, 'false'], [{ requireIndependentReview: false }, 'false'], [{ requireIndependentReview: true }, 'true'], [{ requireIndependentReview: null }, null], [{ requireIndependentReview: 'false' }, null], [{ requireIndependentReview: 1 }, null]]],
    ]) {
      const line = loader.split('\n').find(value => value.startsWith(slot + '='))
      assert.ok(line, `Missing shipped policy loader ${slot}`)
      for (const [automerge, expected] of fixtures) {
        writeFileSync(configPath, JSON.stringify({ automerge }))
        const loaded = spawnSync('bash', ['-eu'], { input: `${line}\nprintf '%s' "$${slot}"\n`, env: { ...process.env, CONFIG: configPath }, encoding: 'utf8' })
        assert.ifError(loaded.error)
        if (expected === null) assert.notEqual(loaded.status, 0, `${slot}: invalid policy must stop loader`)
        else { assert.equal(loaded.status, 0, loaded.stderr); assert.equal(loaded.stdout, expected) }
      }
    }
  }
} finally { rmSync(loaderTemp, { recursive: true, force: true }) }
console.log('PASS: actual shipped config loaders preserve false, honor explicit prepare mode and reject null/string/number policy values')
console.log('Merge buddy regressions passed.')
