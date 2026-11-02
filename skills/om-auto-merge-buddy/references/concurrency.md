# Concurrent PR workers

`--concurrency <n>` limits concurrent PR-processing subagents for this invocation.
Default `1` preserves the existing single-PR flow. Accept only a positive safe
integer; reject missing, zero, negative, fractional or nonnumeric values before
tracker/local mutations. Do not inherit a previous invocation's capacity.

- The parent owns queue selection and aggregate RUN/HANDOFF/NOTIFY writes. Select
  in existing scheduler order and atomically reserve a distinct eligible PR under
  the short shared lock before launch. Record each worker handle before yielding;
  unknown launch results hold their slot/reservation until proved stopped. Never
  dispatch a PR twice, including under `--window 0` or when a replacement arrives.
- With capacity above one, dispatch at most `n` PR workers, each given this skill's
  visit algorithm, resolved policies, deadline, repository, PR number and fenced
  ownership context. Run CR/QA/CI sub-skills sequentially **inline in that worker**
  with `--orchestrated`, rather than spawning nested stage subagents. Thus `n`
  bounds PR-processing subagents, not just parent tasks. At default `1`, the
  parent may retain the existing fresh-stage-subagent flow, at most one at once.
- Give each active PR an isolated worktree; never share a checked-out branch,
  index, mutable QA environment or artifact paths between workers. Reuse existing
  worktree setup/cleanup conventions. Allocate a separate test environment per
  worker or serialize the conflicting QA section; do not let one worker reset
  another's app/database. Launch/reuse the dashboard once in the parent.
- Workers update only their own reserved row and status comment under the shared
  transaction lock, re-reading the latest whole JSON and preserving sibling rows.
  Pass/verify the parent's reservation instance/run/token and live owner plus
  this worker's delegated handle before every mutation. Do not clear or reclaim
  a live/unknown sibling handle. Parent receives compact PR/outcome/evidence and
  next-action results, and serializes aggregate log/handoff updates; workers
  write per-worker logs/artifacts instead of racing on shared markdown files.
- Maintain an in-flight list in the handoff (PR, worker handle, resume point),
  preserving the existing headings and machine fields. A replacement stays in
  its worker's slot; atomically check/reserve its number before transfer. If
  already reserved by another live/unknown worker, stop the transfer and retain
  a reconciliation checkpoint, never run two workers on that replacement.
- Refill a free slot immediately with due/actionable work. A PR parked for CI,
  human action or a block releases its worker slot after cleanup. Sleep only
  when no worker is active and no admissible work is due; otherwise await worker
  completion while continuing admission and operator updates.
- Apply the same deadline/reserves to each worker. Stop dispatching when the
  reserve fails; drain in-flight stages, collect every outcome, finalize all
  comments/checkpoints and release only completed reservations before the final
  report. A crashed/unknown worker remains protected and is reported, never
  silently freed or relaunched. Changing capacity or `--reset` cannot cancel
  another live invocation. The concurrency limit is invocation-local; other
  invocations retain their own limits and the common ownership guards.
- If the runtime cannot support the requested workers, use available capacity
  (or sequential `1` without subagents), report requested/effective concurrency
  and why. Do not launch external agents or install a runtime to meet a number.
