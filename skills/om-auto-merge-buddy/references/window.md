# The time window — queue order, polling, deadline

The goal is to get as many PRs as possible to ready, or merged, within
`WINDOW_MINUTES`. The run focuses on one PR at a time and never burns time
watching a CI run while other work is available.

## Queue

Build the queue at the start, then refresh it with **list-prs** / **search-prs**
each time the run returns to the top of the queue, so PRs labeled mid-run join it.

1. **Waiting from earlier** — PRs carrying `ci-monitoring`, oldest wait first. Usually the visit is one checks reading. Then the PR merges, goes ready, or goes to stage 3, or the visit ends again because CI is still running.
2. **Fresh** — the remaining `AUTOMERGE_LABEL` PRs, oldest first (by creation). A replacement PR is inserted at the head of the queue and continued in the same visit (`references/stages.md`).

Skip `in-progress`, `automerge-blocked`, and PRs another skill is between chain
steps on (`references/claim-pr.md`). Skip `waiting-human` PRs unless their labels
changed since the last visit.

## Keeping busy

- After every visit, take the next actionable PR.
- **Only waiting PRs left** — and `WINDOW_MINUTES > 0` with time to spare: poll them, never past `DEADLINE`. Read **get-pr-checks** for each waiting PR every 5 minutes, or block on **watch-run** for the run that is most likely to finish first, capped at the time left. Revisit a PR as soon as its CI settles. A new automerge PR appearing during the poll interrupts it.
- **Nothing actionable and nothing waiting** → stop early; the window is a ceiling, not a target.
- `--window 0` — one pass over the queue and no polling. Suitable for frequent scheduled runs.

## Deadline

- Do not start a new visit with less than 10 minutes left, or a new stage with less than 5. A stage needs that much just to report safely.
- A stage running at `DEADLINE` is allowed to finish. Then end the visit in its current outcome (usually `waiting-ci`), release or swap the claim, update the status comment, and stop.
- Never leave a PR claimed past the run. The release trap covers crashes too.

## Cadence across runs

Each run picks up where the last one left off. Per PR, that state is the labels
and status comments. Per run, a run that died resumes from its open
`HANDOFF.md`: the PR in flight first, then the queue it had left
(`references/run-log.md`). A schedule shorter than the window
(for example `--window 0` every 30 minutes, or the 2-hour default nightly) is
safe. A second concurrent instance would skip every PR the first holds
`in-progress`, but it is still wasted work, so schedule one instance per
repository.
