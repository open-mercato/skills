# The time window — queue order, polling, deadline

The goal is to get as many PRs as possible to ready, or merged, within
`WINDOW_MINUTES`. The run focuses on one PR at a time and never burns time
watching a CI run while other work is available.

## Queue

Build the queue at the start, then refresh it with **list-prs** / **search-prs**
each time a positive-window run returns to the top of the queue, so PRs labeled mid-run join it. In one-pass mode (`--window 0`), take one initial snapshot, visit each PR once, and stop; follow a replacement as part of the original visit.

Follow `references/scheduler.md`: due tracked PRs (most recently worked first),
then current-user assigned actionable work when the active list is nonempty,
then the existing global order (`ci-monitoring`, then oldest). An empty list or
reset uses the existing global order without filtering by remote assignee.
Refresh current-head CI at entrance: newly settled CI/head/evidence makes a
tracked PR actionable now, even before its old estimate. A future CI check
must not block admitting new work. Never infer no owned work from an incomplete
assigned-state reading. A replacement continues in the same visit.

Skip live claims and honor blocks (`references/claim-pr.md`). Due blocked or
waiting-human entries receive only a cheap inspection. Check for a changed head
or fresh evidence, including a new `QA head:` note while the label set stays unchanged.
Without new evidence, keep them waiting without running a stage or counting an attempt.
Waiting-human PRs alone do not keep the polling loop alive.

## Keeping busy

After every visit checkpoint plan/progress and UTC `nextCheckAt`. Estimate CI
from recent comparable workflow durations and observed elapsed time, with a
five-minute fallback. Release the PR claim and select another actionable item.
When only future checks remain, sleep until the earliest due time in at most
60-second chunks (refresh admission between chunks), bounded by `DEADLINE`, or
end and report that timestamp. Never busy poll or hold **watch-run** past the
window. `--window 0` takes one candidate snapshot and no idle polling.

## Deadline

A zero window is one pass, not an already-expired deadline. Use the same
start predicate for visits (600-second reserve) and stages (300-second reserve),
with `NOW` and `DEADLINE` in UTC epoch seconds:

```bash
merge_buddy_can_start() {
  [ "$WINDOW_MINUTES" -eq 0 ] && return 0
  [ "$((DEADLINE - $1))" -ge "$2" ]
}
```

- In one-pass mode, do not compare time against `DEADLINE` and do not refresh or poll after the snapshot is visited.
- For positive windows, do not start a new visit with less than 10 minutes left, or a new stage with less than 5. A stage needs that much just to report safely.
- A stage running at `DEADLINE` is allowed to finish. Then end the visit in its current outcome (usually `waiting-ci`), release or swap the claim, update the status comment, **write the final `HANDOFF.md`** (remaining queue, next concrete action, `Status: window-ended` when work is left — `references/run-log.md` → Final handoff), and stop.
- Never leave a PR claimed past the run. The release trap covers crashes too.

## Cadence across runs

The shared `.ai/meta/merge-buddy.json` controls admission and due times across
runs and linked worktrees; run handoffs retain the audit trail and pending
follow-ups. `--fresh` changes only the log. `--reset` clears local scheduling,
never tracker claims/assignees/evidence/attempts, and ignores old handoff queues
for this invocation. Every signal is reconciled afresh, with no inherited
invocation waivers. The nonblocking shared OS lock prevents concurrent local
instances; other clones still obey tracker claims (`references/scheduler.md`).
