# Durable local scheduling and plan checkpoints

## Shared file and ownership

Resolve the real absolute Git common directory (`git rev-parse --git-common-dir`),
then its primary working tree from `git worktree list --porcelain`; validate the
existing directory belongs to that same common directory. Use that primary
root's `.ai/meta/merge-buddy.json`, even when invoked in a linked worktree.
Never guess a path from the current temporary checkout. Create missing parent
directories and add only `.ai/meta/merge-buddy*` to the common Git
`info/exclude` when absent. This state is local, never staged or committed.

Use a **nonblocking OS advisory file lock** on adjacent `merge-buddy.lock`
for each short scheduling/checkpoint/claim transaction: `flock`/`fcntl` on POSIX,
the Windows equivalent otherwise. Never unlink or replace the lock inode.
The process performing the transaction owns the handle and closes it in
`finally`; the kernel releases it if that process dies. Do not leave a lock
helper running across model turns or hold the lock during a delegated stage.
If safe locking is unavailable, stop with that reason. A contending instance
leaves the file and tracker untouched and retries only on a future due check.
Bound tracker calls inside the transaction; no CI waiting under this lock.

Before the first actionable step, reserve that PR with a random fencing token,
`instanceId` (random UUID per invocation), `runId`, and the persistent owner’s
host/PID/process-start identity (never a transient tool shell PID), plus every
delegated stage handle. Other instances skip a foreign reservation. Unknown
owner identity is not permission to steal. Reclaim only with positive proof the
same-host process identity and **all** delegated handles are dead; heartbeat
age alone never proves this. Cross-host/unknown handles remain protected and
reported. Stage launch records its handle before releasing control; an unknown
launch/crash result remains protected until its work is proved stopped.
This prevents stale actors from mutating the same PR, while allowing unrelated
PR work between instances. Separate clones still honor tracker claims.

Initialization/admission may create an unreserved row only while locked and
after confirming no current reservation/claim; reserving an existing row requires
its own token or the proven-dead recovery rule. Before every subsequent state
or tracker mutation, reacquire the lock, re-read/validate the
latest document and verify the PR reservation's instance/run/token and live
owner. Merge **only that owned row** into the latest document, preserving other
instances’ rows. A mismatch stops the stale actor before any mutation. Reserve,
claim and first comment lookup/create occur in one bounded transaction. Every
stage verifies the reservation before pushing or other external mutation; a
lost reservation aborts it. Parent and children never inherit another run’s
fencing token. On release, clear only this invocation's completed reservation;
a running/unknown delegated handle prevents release or reset of that row.

Write the complete replacement to a unique sibling temporary file, flush it,
and atomically rename it over the JSON. Never truncate in place. A crash before
rename leaves the old complete document; ignore orphan temps. Validate recovered
checkpoints against their authenticated own status marker and repository/user
before passing them to the helper. Preserve corrupt bytes in quarantine before
writing the replacement. The lock spans comment lookup/create/update and state
writes, preventing concurrent local creation of the first status comment.

```json
{
  "version": 1,
  "repository": "owner/repo",
  "currentUser": "login",
  "updatedAt": "2026-10-31T14:00:00.000Z",
  "activePrs": [{
    "number": 123,
    "url": "https://tracker.example/pr/123",
    "title": "Current tracker PR title",
    "statusCommentUrl": "https://tracker.example/pr/123#comment-456",
    "statusCommentId": "456",
    "instanceId": "uuid",
    "runId": "run-id",
    "reservation": {"instanceId":"uuid","runId":"run-id","token":"random","host":"host","pid":123,"processStartedAt":"UTC ISO-8601","delegatedHandles":[]},
    "head": "full-sha",
    "base": "target-branch",
    "outcome": "waiting-ci",
    "plan": [{"step": "CI", "status": "pending", "evidence": "run-url"}],
    "nextAction": "Read current-head checks, then reconcile signals",
    "firstStartedAt": "2026-10-31T14:00:00.000Z",
    "firstReadyAt": null,
    "readyAt": null,
    "readyHead": null,
    "readyPolicy": null,
    "mergeableDurationMs": null,
    "lastWorkedAt": "2026-10-31T14:00:00.000Z",
    "nextCheckAt": "2026-10-31T14:05:00.000Z",
    "updatedAt": "2026-10-31T14:00:00.000Z"
  }]
}
```

`repository` is the authenticated tracker identity; `currentUser` is freshly
resolved through **current-user**. A different repository/user or unknown
schema must not overwrite a foreign plan: stop and identify the mismatch,
including under `--reset`. Parse and validate types, unique positive PR numbers,
known plan statuses (`pending`, `working`, `done`, `blocked`), required fields
and UTC timestamps before use. Scheduler metadata never grants a signal or
carries invocation-only risk/CI waivers.

## Missing state, reset and checkpoint recovery

- **Missing/deleted/empty file:** while locked, create a valid empty document.
  Read the existing queue's own status comments and recover valid plan/progress,
  next action and schedule from their scheduler blocks for still-authorized open
  PRs. Recover only matching repository/current-user records; re-read all source
  evidence. With no recoverable active records, use the existing queue semantics.
- **Malformed/corrupt JSON:** preserve its exact bytes in a dated sibling
  quarantine file, report it in `NOTIFY.md`, then rebuild as above under the lock.
  An unreadable/unwritable file is a blocker, not an empty queue.
- **`--reset`:** after acquiring the same lock and validating any existing
  repository/user, atomically clear inactive scheduling. Preserve foreign live
  or unknown reservations and own running/unknown delegated work; report these
  exclusions. A protected reservation is never reset or taken over. Ignore old scheduler
  blocks and old handoff queues for admission during this invocation. Do not
  unassign anyone, delete comments, clear `in-progress`/blocks, reset attempts,
  grant signals or inherit waivers. Source evidence still gets reconciled.
- **`--fresh`:** only chooses a new run log; the scheduler still resumes.

Before each actionable step, persist its plan as `working` with `nextAction`;
after it ends, persist progress, evidence, outcome and `nextCheckAt`. Mirror the
same plan/progress and `updatedAt` in the existing status comment, updating its
stored ID only after verifying marker and author. Persist optional `title` from
fresh **get-pr** and `statusCommentUrl` from the actual verified comment
lookup/create/update response on initial admission and later refreshes. Never
fabricate an anchor from an ID; keep unknown legacy title/link null. After
first creation, mirror the returned real URL into the same comment/checkpoint. Keep reservation fencing
tokens and host/PID/process internals private to local ownership state, never
in public comment checkpoints or merged journals. If the ID is missing/deleted,
search the full comment history first; create only when no own marker exists.
If duplicates already exist, choose the oldest own marker as canonical, log the
others, and never add another. Checkpoint both sides before the next stage;
tracker-write failure retains local progress and stops that visit. A later run
repairs the mirror from the newest valid checkpoint, then reconciles reality.
`updatedAt` changes only when plan/progress/action/outcome/schedule changes;
the document timestamp follows semantic row/membership changes, not leases.
Keep heartbeat time separate so an identical recheck never looks like progress.

## Admission and next checks

Refresh current tracker facts before selection, including assignees, open state,
authorization and live claims. For a merged/closed/no-longer-authorized reserved
row, finish cleanup in one bounded locked transaction: verify its fencing token
and stopped delegated handles, finalize the same status comment and release
only its owned tracker claim, then remove the row and atomically commit JSON.
If any cleanup call fails, retain a cleanup-pending row for retry; never delete
the reservation before its final tracker mutation. Foreign live/unknown rows
stay protected. An authorization off switch forbids new producing work; cleanup
only releases this instance’s existing claim and records the stop. Unreserved
terminal rows may be removed atomically after confirming no cleanup is owed.
Retain `ready` until it is externally merged; retain `waiting-human`
and `blocked` with future cheap checks. Independent-review waiting records
are reevaluated under this invocation’s current config/CLI, not their saved
policy; retain automatic evidence so a native-only wait never repeats a stage. A block permits inspection only, never a
stage retry until the existing unblock rules hold. Keep pending follow-up filing
in the separate run handoff even after removing its PR from `activePrs`.

With a nonempty active list (except this invocation’s explicit reset admission), check due tracked PRs first, most recently worked
first (PR number breaks ties), including completed CI found at entrance. Then
prefer **current user's assigned actionable PRs** before admitting a new global
PR. A future CI check, unchanged waiting-human/blocked state or live foreign
claim is not actionable and does not prevent new work. Unknown/unreadable
assigned-PR state is not proof there is no owned work: pause global admission
and report the incomplete reading. An empty list/reset starts with the existing
queue order (CI-monitoring first, then oldest), without making remote assignees
an exclusive filter. `--pr` remains a filter; it never bypasses authorization,
claims or due checks. One-pass mode snapshots these candidates and visits each
at most once; replacements remain part of their original visit.

Use these recovery/checkpoint decisions, selection and CI estimate after normalizing tracker facts. Sort
`candidates` deterministically in the existing order: `ci-monitoring` first by
oldest wait, then creation time, with PR number breaking ties. Mark due
human/blocked records inspectable even while a producing stage is prohibited. `actionable`
means a due inspection or a permitted next step, not merely an open PR. A fresh
head, settled CI or new relevant evidence makes a tracked record due now even
if its old estimate was later; it never resets attempt counters.

```javascript
function restoreScheduler({ raw, repository, currentUser, now, reset = false, recovered = [], protectedNumbers = [] }) {
  let state
  let corrupt = false
  try { state = raw?.trim() ? JSON.parse(raw) : null } catch { corrupt = true }
  if (state && (state.repository !== repository || state.currentUser !== currentUser || state.version !== 1)) throw new Error('Foreign or unsupported scheduler state')
  const utc = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value))
  const validReservation = reservation => reservation && ['instanceId', 'runId', 'token', 'host'].every(key => typeof reservation[key] === 'string' && reservation[key].length > 0)
    && Number.isInteger(reservation.pid) && reservation.pid > 0 && utc(reservation.processStartedAt)
    && Array.isArray(reservation.delegatedHandles) && reservation.delegatedHandles.every(handle => handle && typeof handle.id === 'string' && typeof handle.type === 'string' && ['live', 'dead', 'unknown'].includes(handle.status))
  if (state && Array.isArray(state.activePrs) && state.activePrs.some(entry => entry?.reservation != null && !validReservation(entry.reservation))) throw new Error('Invalid scheduler reservation; ownership unknown')
  const validEntry = entry => entry && Number.isInteger(entry.number) && entry.number > 0
    && typeof entry.nextAction === 'string' && typeof entry.outcome === 'string'
    && ['title', 'statusCommentUrl'].every(key => entry[key] == null || typeof entry[key] === 'string')
    && [entry.nextCheckAt, entry.lastWorkedAt, entry.updatedAt].every(value => utc(value))
    && ['firstStartedAt', 'firstReadyAt', 'readyAt'].every(key => entry[key] == null || utc(entry[key]))
    && ['readyHead', 'readyPolicy'].every(key => entry[key] == null || typeof entry[key] === 'string')
    && (entry.mergeableDurationMs == null || (Number.isFinite(entry.mergeableDurationMs) && entry.mergeableDurationMs >= 0))
    && Array.isArray(entry.plan) && entry.plan.every(step => step && typeof step.step === 'string' && ['pending', 'working', 'done', 'blocked'].includes(step.status))
  const validEntries = entries => Array.isArray(entries) && entries.every(validEntry) && new Set(entries.map(entry => entry.number)).size === entries.length
  if (state && (!utc(state.updatedAt) || !validEntries(state.activePrs))) { corrupt = true; state = null }
  if (reset || !state) {
    if (!reset && !validEntries(recovered)) throw new Error('Invalid recovered scheduler checkpoints')
    state = { version: 1, repository, currentUser, updatedAt: now, activePrs: reset ? (state?.activePrs ?? []).filter(entry => protectedNumbers.includes(entry.number)) : recovered }
  }
  return { state, quarantine: corrupt, reset }
}
async function finalizeTracked({ activePrs, number, ownsReservation, releaseOwnedClaim, mergedRecord, writeMergedJournal }) {
  if (!ownsReservation) throw new Error('Reservation must be verified before cleanup')
  await releaseOwnedClaim()
  if (mergedRecord) {
    if (typeof writeMergedJournal !== 'function') throw new Error('Merged journal writer required')
    await writeMergedJournal(mergedRecord)
  }
  return activePrs.filter(entry => entry.number !== number)
}
function reservationAllows({ reservation, instanceId, runId, token, ownerStatus }) {
  return Boolean(reservation && reservation.instanceId === instanceId && reservation.runId === runId && reservation.token === token && ownerStatus === 'live')
}
function mayReclaim({ ownerStatus, delegatedStatuses }) {
  return ownerStatus === 'dead' && Array.isArray(delegatedStatuses) && delegatedStatuses.every(status => status === 'dead')
}
function checkpointPlan(previous, update, now, worked = false) {
  const next = { ...previous, ...update }
  const keys = ['head', 'base', 'outcome', 'plan', 'nextAction', 'nextCheckAt', 'firstStartedAt', 'firstReadyAt', 'readyAt', 'readyHead', 'readyPolicy', 'mergeableDurationMs']
  const semantic = record => JSON.stringify(keys.map(key => record?.[key]))
  next.updatedAt = semantic(previous) === semantic(next) ? previous.updatedAt : now
  next.lastWorkedAt = worked ? now : previous?.lastWorkedAt ?? now
  return next
}
function replaceTracked(activePrs, original, replacement) {
  const previous = activePrs.find(entry => entry.number === original)
  const carried = { ...replacement, firstStartedAt: previous?.firstStartedAt ?? replacement.firstStartedAt ?? null,
    firstReadyAt: previous?.firstReadyAt ?? replacement.firstReadyAt ?? null, startedFromPr: previous?.startedFromPr ?? original,
    readyAt: null, readyHead: null, readyPolicy: null, mergeableDurationMs: null }
  return [...activePrs.filter(entry => entry.number !== original && entry.number !== replacement.number), carried]
}
function readinessTiming({ previous = {}, now, firstAction = false, ready = false, head, policy }) {
  const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  if (!validTime(now)) throw new Error('UTC checkpoint time required')
  if (ready && (!head || !policy)) throw new Error('Verified readiness head and policy required')
  const firstStartedAt = validTime(previous.firstStartedAt) ? previous.firstStartedAt : firstAction ? now : null
  const retained = ready && previous.readyHead === head && previous.readyPolicy === policy && validTime(previous.readyAt)
  const readyAt = ready ? retained ? previous.readyAt : now : null
  const firstReadyAt = validTime(previous.firstReadyAt) ? previous.firstReadyAt : readyAt
  const elapsed = firstStartedAt && readyAt ? Date.parse(readyAt) - Date.parse(firstStartedAt) : NaN
  return { firstStartedAt, firstReadyAt, readyAt, readyHead: ready ? head : null, readyPolicy: ready ? policy : null,
    mergeableDurationMs: Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : null }
}
function schedulerDecision({ activePrs, candidates, currentUser, now, ownedComplete = true, onlyPr = null, resetAdmission = false }) {
  const visible = candidates.filter(pr => onlyPr === null || pr.number === onlyPr)
  const facts = new Map(visible.map(pr => [pr.number, pr]))
  const active = activePrs.filter(entry => {
    const pr = facts.get(entry.number)
    return !pr || (pr.state === 'open' && pr.authorized) || Boolean(entry.reservation)
  })
  const allowed = pr => pr.state === 'open' && pr.authorized && pr.claimable && pr.actionable
  const due = entry => {
    const pr = facts.get(entry.number)
    return pr && allowed(pr) && (pr.changed || Date.parse(entry.nextCheckAt) <= Date.parse(now))
  }
  const recent = (left, right) => Date.parse(right.lastWorkedAt) - Date.parse(left.lastWorkedAt) || left.number - right.number
  const tracked = active.filter(due).sort(recent)
  if (tracked.length) return { activePrs: active, next: tracked[0].number, source: 'tracked' }
  const available = visible.filter(allowed).filter(pr => !active.some(entry => entry.number === pr.number))
  if (active.length && !resetAdmission) {
    const owned = available.find(pr => pr.assignees.includes(currentUser))
    if (owned) return { activePrs: active, next: owned.number, source: 'assigned' }
    if (!ownedComplete) return { activePrs: active, next: null, source: 'unknown-owned' }
  }
  return { activePrs: active, next: available[0]?.number ?? null, source: 'queue' }
}
function nextCiCheck({ now, elapsedMs = 0, completedDurationsMs = [] }) {
  const durations = completedDurationsMs.filter(value => Number.isFinite(value) && value > 0).sort((left, right) => left - right)
  const expected = durations.length ? durations[Math.floor(durations.length / 2)] : 300000
  const remaining = Math.min(1800000, Math.max(60000, expected - Math.max(0, elapsedMs)))
  return new Date(Date.parse(now) + remaining).toISOString()
}
```

Supply `completedDurationsMs` from recent successful runs of the same workflow
and target context, not unrelated jobs. Estimate remaining time from observed
elapsed duration; fall back to five minutes when history is absent. After an
overdue check is still pending, move `nextCheckAt` forward (at least one minute),
release the PR claim and work on another candidate. A cheap unchanged inspection
never counts an attempt or advances `lastWorkedAt`; real producing work does.
Moving only the future check time changes `updatedAt`, not work recency. Other inactive states get a
five-minute cheap recheck; absent new evidence they never rerun stages. Once only
future checks remain, sleep until the earliest due time in chunks of at most
60 seconds (bounded by the window), or finish with that timestamp. Never busy
poll or use **watch-run** across the deadline. New queue work is checked between
chunks. Every visit still revalidates all signal evidence and target/head guards.

On a verified replacement, atomically substitute its PR number/URL for the old
entry, carrying plan/progress links and pending next action, resetting stage
attempts only under the existing replacement rule. Preserve the old PR reference
in the run log, move the status checkpoint to the replacement, re-read its head
and authorization, assign/claim it, and continue in the same visit. No state
transition may leave both entries active or orphan the handoff.

These helpers decide local scheduling only. The caller supplies protected
reservation numbers from positive liveness evidence (unknown means protected),
passes `resetAdmission` only for an explicit reset, and still enforces all
tracker claim, signal, attempt and final-head guards. Missing/deleted/corrupt state that hides
reservation ownership must not be rebuilt while any local owner/stage may
still run: preserve any corrupt bytes, recover ownership from private local state and live process/session handles
(the public status supplies plan/progress only), and stop on unknown ownership instead of admitting duplicate work.

## Daily confirmed-merge journal

For every tracker-confirmed merged PR (including an external merge), upsert one
JSON object per line in the primary root's
`.ai/meta/merge-buddy-merged-YYYY-MM-DD.jsonl`. Choose the day from the tracker’s
confirmed `mergedAt` converted to UTC, never the retry/update date. Retain that
merge date for later updates, so a PR never moves between daily files. No ready
or closed-but-unmerged PR belongs in this journal. The existing local exclude
pattern covers these files; never commit them.

Under the same short scheduler transaction lock, read/validate every existing
JSONL row, upsert by repository plus PR number, preserve other rows, flush a
unique sibling temporary file and atomically rename it. Repeated confirmations
or final-status updates replace the row rather than appending duplicates; a
stale retry never overwrites a newer `updatedAt`. Malformed/unreadable journals
fail closed with their bytes preserved, never truncated or silently rebuilt.

Finalization order: confirm actual merged state and timestamp through **get-pr**,
verify ownership, mirror the final status and release the owned tracker claim,
then durably upsert the merged journal **before** deleting the active row. A
journal failure retains a cleanup-pending row for idempotent retry. An external
merged PR without an active row uses the same authorized confirmation/upsert
transaction; no new producing stage is run. Pending follow-up filing remains
separate even after active cleanup. Do not log raw tokens, reservation fences
or local process details: keep only final plan/progress, next action and links.

```javascript
function upsertMergedJournal({ raw = '', record }) {
  const valid = row => row && typeof row.repository === 'string' && Number.isInteger(row.number) && row.number > 0
    && row.outcome === 'merged' && typeof row.mergedAt === 'string' && Number.isFinite(Date.parse(row.mergedAt))
    && typeof row.updatedAt === 'string' && Number.isFinite(Date.parse(row.updatedAt))
    && ['url', 'base', 'nextAction', 'statusCommentUrl'].every(key => typeof row[key] === 'string')
    && ['head', 'mergeSha'].every(key => /^[a-f0-9]{40}$/i.test(row[key] ?? ''))
    && Array.isArray(row.plan) && row.plan.every(step => step && typeof step.step === 'string' && ['pending', 'working', 'done', 'blocked'].includes(step.status))
    && Array.isArray(row.evidence) && row.evidence.every(link => typeof link === 'string')
  if (!valid(record)) throw new Error('Confirmed merged record required')
  const day = new Date(record.mergedAt).toISOString().slice(0, 10)
  const rows = raw.trim() ? raw.trim().split('\n').map(line => JSON.parse(line)) : []
  if (rows.some(row => !valid(row) || new Date(row.mergedAt).toISOString().slice(0, 10) !== day)) throw new Error('Malformed or wrong-day merged journal')
  const keys = ['repository', 'number', 'url', 'title', 'mergedAt', 'head', 'mergeSha', 'base', 'outcome', 'plan', 'nextAction', 'evidence', 'statusCommentUrl', 'updatedAt', 'firstStartedAt', 'firstReadyAt', 'readyAt', 'readyHead', 'readyPolicy', 'mergeableDurationMs', 'mergedDurationMs', 'startedFromPr']
  const publicRecord = row => {
    const clean = Object.fromEntries(keys.filter(key => row[key] !== undefined).map(key => [key, row[key]]))
    const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
    const firstStartedAt = validTime(row.firstStartedAt) ? row.firstStartedAt : null
    const readyAt = row.readyHead === row.head && row.readyPolicy && validTime(row.readyAt) ? row.readyAt : null
    const elapsed = end => firstStartedAt && validTime(end) && Date.parse(end) >= Date.parse(firstStartedAt) ? Date.parse(end) - Date.parse(firstStartedAt) : null
    return { ...clean, firstStartedAt, readyAt, mergeableDurationMs: elapsed(readyAt), mergedDurationMs: elapsed(row.mergedAt) }
  }
  const records = new Map()
  for (const row of [...rows, record]) {
    const key = JSON.stringify([row.repository, row.number])
    const previous = records.get(key)
    if (!previous || Date.parse(row.updatedAt) >= Date.parse(previous.updatedAt)) records.set(key, publicRecord(row))
  }
  return { day, jsonl: [...records.values()].map(row => JSON.stringify(row)).join('\n') + '\n' }
}
```

The caller supplies a freshly tracker-confirmed record with merged timestamp,
head/merge SHA, target, PR URL, final plan/progress, next action, evidence/status
comment links and semantic `updatedAt`. This helper does not infer a merge from
a saved ready state. Parse/validation/write failure stops deletion of the active
record; successful replay produces exactly one latest row for that PR/day.

## Readiness and merge timing

At the **proven first actionable checkpoint**, set immutable `firstStartedAt`
once from that actual UTC time. Preserve it across resumes and replacements
(`startedFromPr` retains the source PR). Legacy work with no recorded start
stays unknown/null; never infer it from `lastWorkedAt`, file modification time,
commit dates or a later resume. A reset ignores old admission order but may
recover trusted historical timing from the existing own status on re-admission;
it must not reset that PR’s clock or restore its old queue position.

After all three signals and the resolved independent-review policy are freshly
verified, **before** either prepare/merge action, checkpoint `readyAt` plus
`readyHead` and a canonical `readyPolicy` identity (target, independent-review
requirement, risk and CI policies). Set it once while that exact readiness
holds. Keep `firstReadyAt` as earliest observed readiness. Clear current
`readyAt`/head/policy/duration on real invalidation; after successful revalidation
of a changed head/policy, set a new current readiness timestamp. A cheap valid
revisit never moves it forward. A replacement preserves start/history but gets
fresh head-specific readiness.

`mergeableDurationMs` is wall-clock `readyAt - firstStartedAt`, including CI
waits and pauses; current readiness for the final head is the endpoint. On a
confirmed merge, `mergedDurationMs` is `mergedAt - firstStartedAt`. Unknown or
negative intervals stay null, never zero. Journal/status checkpoints include
these additive fields; historical rows without timing remain readable and
excluded from duration aggregates. Dashboard live elapsed uses only a valid
recorded start, and average/median denominators include only known valid
readiness intervals with the known count shown. This is observed readiness,
not a claim about when a PR might previously have been mergeable.

The optional compact `queue` snapshot described in `references/dashboard.md`
tracks the latest existing tracker list for display, separate from active
ownership. Preserve it when updating an owned row; never treat it as a claim
or proof. Use the top-level repository as row identity when omitted.
