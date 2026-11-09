# Recover stalled queue claims

Run this bounded sweep before admitting work at every queue startup, including
resumes and `--reset`. Repeat only at a recorded due check, never in a busy loop.
This is automatic crash cleanup, not a TTL on ownership. Keep the existing
claim protocol in `references/claim-pr.md`; use named tracker operations only.

## Candidate: two hours without activity

Read the complete currently authorized open queue, not just local active rows.
Inspect atomic locks, `in-progress`, active claim comments and legacy working
status comments. `ci-monitoring` alone is not a claim. A missing local row,
missing label or shared bot login never proves the claim is abandoned.

For each claimed item, compute `lastActivityAt` as the latest verified timestamp
of owner/delegate heartbeat, claim/status edit, local stage activity, head push,
review, PR comment or current-head CI activity. Use authenticated tracker/server
timestamps and recorded local runtime observations. Lock metadata authored by a
client is not a trusted server clock. Do not use PR `updatedAt` alone or a
lock's creation time as an inactivity clock. Exclude this sweep's own recheck
log writes; they must not keep an abandoned claim alive.

A candidate has strictly more than 120 minutes without activity. Pending/running
CI, newer activity or incomplete activity reads defer recovery. Record the
specific blocker and a future due check; an unknown timestamp never counts as
old. New activity resets the inactivity window; the age of the original claim
is irrelevant.

## Proof: the owner and every delegate have stopped

Match the observed lock SHA, actor, run and original claim comment to the
scheduler reservation and runtime owner. On the same host, check the persistent
owner PID **and process-start identity** so PID reuse cannot identify the wrong
process. Confirm every delegated worker, stage and unknown launch result has
stopped using authoritative runtime state. A missing owner process is not enough
if a child can still push, publish evidence or mutate tracker state.

Only positive stopped/dead proof permits automatic cleanup. A live process,
remote owner without authoritative runtime access, missing reservation, legacy
unknown owner or unreadable runtime remains protected; report the exact owner
and missing proof. Never kill a live worker or infer death from inactivity.
Claims missing from local scheduling state are inspected and reported only;
without a matching reservation and authoritative owner/delegate runtime evidence,
they are never automatically released. Losing the state file does not prove death.
Explicit operator recovery follows the existing authorized recovery protocol.

## Release once, then compete normally

1. Under the short shared scheduler transaction lock, re-read authorization,
   reservation identity, all claim signals and activity. Verify the same owner
   is still dead and the same lock SHA/run/comment still owns the claim. Any
   change cancels this recovery; do not retry against a successor in this sweep.
2. Persist a cleanup checkpoint containing the old actor/run/comment/lock SHA,
   last activity, stopped-owner/delegate evidence and next action. Record
   `recovered a stale claim from a previous run` in the existing status comment
   only after verifying that it belongs to that dead owner. Clean only that
   owner's `in-progress` and claim comment; preserve human assignees, foreign
   claims, pending findings, attempt counts, evidence and unpublished worktrees.
3. Mark that owner's claim released and call **release-lock** LAST with its
   exact expected SHA and owner identity. Never delete a ref unconditionally or
   silently downgrade an atomic host to comment election. A changed ref stops
   cleanup; a successor is preserved. If any step fails, retain cleanup-pending
   state and the original owner evidence for an idempotent retry.
4. Verify the old claim is gone. Clear only its dead reservation under the
   scheduler lock, preserve sibling rows, and make the item due now. If a
   successor already owns it, leave that owner untouched and skip admission.
   Otherwise acquire a fresh claim normally; cleanup itself grants no ownership
   or CR/QA/CI signal. Reconcile the current head and all gates before any work.

Do not remove `automerge-blocked` or override a human veto during recovery. A
recovered blocked item still receives only its allowed cheap recheck. Protected
or human-waiting items retain their existing approval requirements.

## Prevent recurrence

Use the persistent runtime owner in reservations and register claim cleanup in
`finally` immediately after acquisition. Record delegated handles before
launch control is yielded; verify fencing before every external mutation. While
actively working, checkpoint a heartbeat at least every five minutes through
the actual owner/delegate runtime, including across long stages; never use an
independent heartbeat process that can outlive the worker. Heartbeats describe
liveness separately from semantic progress. A heartbeat failure stops further
mutations and leaves recovery evidence. Release claims when parking for CI or
human input; durable queue state, not a held claim, carries the next action.

A hard kill can skip `finally`; the next startup sweep is the backstop. Do not
introduce automatically expiring locks: a paused live worker could otherwise
resume after expiry and race a replacement.
