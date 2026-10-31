# Local dashboard removal and restore requests

Trash/Undo controls change **local active scheduling only**. They never close a
PR, alter GitHub labels/comments/claims, authorize a merge or waive any gate.
The one-file server publishes strict data commands, never rewrites shared
scheduler JSON. A visible Pending removal is not completion; the scheduler
acknowledges it at its next safe transaction. Undo/restore is reversible.

## Files and API boundary

In the primary root's `.ai/meta/merge-buddy-commands/`, atomically publish
`<UUID>.json` with version 1, requestId, operation (`dismiss` or `restore`), exact
repository/positive PR number, expectedVersion (64 hex), createdAt UTC and
optional undoOf (dismiss UUID). No command contains executable instructions,
paths or CSRF secrets. Corresponding `<UUID>.ack.json` records version,
requestId/operation/repository/number, applied/rejected status, processedAt UTC
and a bounded plain-text message. The local exclude pattern already covers it.

Reject unsafe/symlinked directories/files, traversal/unknown names, oversized
or malformed data. The server requires exact Host + Origin, a per-process CSRF
token, POST JSON with a small body limit, validated identity/version and no
working/live/unknown reservation before accepting a request. GET identity never
exposes the token. Old read-only APIs stay read-only; only this explicit local
command endpoint mutates files. A foreign/different-build server is never used.

The optimistic version is SHA-256 of JSON `[rootFingerprint, repository, number,
head, updatedAt, outcome, Boolean(reservation)]`, using the exact canonical
primary root and actual raw row (the runtime exports the same helper). This
prevents a stale browser from removing changed work. The server may accept a
request just before a stage starts; scheduler revalidation below prevents that
race from removing live work. Busy work is disabled/rejected with the reason.

## Consume only under the existing shared scheduler lock

Before admission and before launching any stage, read pending commands under
the same short OS lock/fenced transaction. Validate all fields, current
repository/user scope, exact target row/version and fresh tracker/live-owner
facts. Unknown ownership or live delegated work stays protected. A working or
cleanup-pending record is never dismissed. Blocked-but-unclaimed local work
can be removed, but its pending follow-up filing stays in the separate handoff.

On dismiss, remove only that unclaimed row from active/queue snapshots and
persist its flat public snapshot in `dismissedPrs`, with
`dismissal: {requestId, dismissedAt}`. Preserve original head/updatedAt/outcome
for causal Undo. Filter those repository/PR tombstones from every later queue
refresh/admission, so the item cannot immediately reappear. Restore removes
only the matching tombstone; normal fresh authorization/signal/claim rules
still decide re-admission. It never revives old labels, evidence or ownership.

Process an Undo after its referenced same-PR dismiss even when timestamps tie.
Persist an acknowledgement receipt in `dashboardCommandReceipts[requestId]`
inside the same atomic scheduler write, then atomically publish the ack file.
A crash between state and ack is replayable: return the stored receipt without
applying twice. Never acknowledge before the durable state write. Reject busy,
changed-version or wrong-scope requests without removing the row, and expose
that exact rejection to the browser. Retain unknown/pending requests; reset
clears only safe inactive tombstones, never pending commands or live ownership.

Use the following state decision after validated request fields and fresh
observations, before atomic write/ack. `fresh.allowed` is verified local
repository/user authority, not permission to bypass normal automerge admission;
`fresh.ownershipKnown`/`liveClaim` include delegated and tracker ownership.
`currentVersion` is computed from the actual raw row, including a tombstone's
original fields for a matching Undo.

```javascript
function applyDashboardCommand({ state, command, fresh, currentVersion, now }) {
  const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  if (command.version !== 1 || !uuid(command.requestId) || !['dismiss', 'restore'].includes(command.operation)
    || typeof command.repository !== 'string' || !Number.isSafeInteger(command.number) || command.number < 1
    || !/^[a-f0-9]{64}$/i.test(command.expectedVersion) || !Number.isFinite(Date.parse(command.createdAt))
    || (command.undoOf !== undefined && !uuid(command.undoOf))) throw new Error('Invalid local dashboard command')
  const receipts = state.dashboardCommandReceipts ?? {}
  if (receipts[command.requestId]) return { state, ack: receipts[command.requestId] }
  const ack = { version: 1, requestId: command.requestId, operation: command.operation,
    repository: command.repository, number: command.number, status: 'rejected', processedAt: now, message: '' }
  const match = row => (row.repository ?? state.repository) === command.repository && row.number === command.number
  const active = (state.activePrs ?? []).find(match)
  const queued = (state.queue ?? []).find(match)
  const dismissed = (state.dismissedPrs ?? []).find(match)
  const target = command.operation === 'dismiss' ? active ?? queued : dismissed
  let next = state
  if (command.repository !== state.repository || !fresh?.allowed) ack.message = 'Local repository/user authority could not be verified.'
  else if (!fresh.ownershipKnown || fresh.liveClaim || active?.reservation || ['working', 'cleanup-pending'].includes(active?.outcome)) ack.message = 'Work is live or ownership is unknown; nothing was removed.'
  else if (!target) ack.message = 'The requested local item is no longer present; refresh before retrying.'
  else if (command.expectedVersion !== currentVersion) ack.message = 'Work changed since this page loaded; refresh before retrying.'
  else if (command.operation === 'restore' && command.undoOf !== dismissed.dismissal?.requestId) ack.message = 'Restore does not match the recorded local removal.'
  else if (command.operation === 'dismiss') {
    const { reservation, ...publicTarget } = target
    next = { ...state, activePrs: (state.activePrs ?? []).filter(row => !match(row)),
      queue: (state.queue ?? []).filter(row => !match(row)),
      dismissedPrs: [...(state.dismissedPrs ?? []).filter(row => !match(row)), { ...publicTarget, repository: command.repository,
        dismissal: { requestId: command.requestId, dismissedAt: now } }] }
    ack.status = 'applied'; ack.message = 'Removed from local scheduling only. Restore is available; GitHub is unchanged.'
  } else if (command.operation === 'restore') {
    next = { ...state, dismissedPrs: (state.dismissedPrs ?? []).filter(row => !match(row)) }
    ack.status = 'applied'; ack.message = 'Restored for the next normal queue refresh; no GitHub state was changed.'
  } else ack.message = 'Unsupported local command.'
  next = { ...next, dashboardCommandReceipts: { ...receipts, [command.requestId]: ack }, updatedAt: now }
  return { state: next, ack }
}
function excludeDismissed({ candidates, dismissedPrs = [], repository }) {
  return candidates.filter(pr => !dismissedPrs.some(row => (row.repository ?? repository) === (pr.repository ?? repository) && row.number === pr.number))
}
```

Only clear a tombstone through a validated restore or safe explicit reset. Read
processed receipts/acks for browser feedback, preserving pending-vs-applied
semantics. The server never runs these scheduler decisions or tracker tools.
