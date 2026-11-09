# Per-run autofix preparation for issue #183

## Goal
Prevent two bug-fix runs from sharing or resetting one local branch before the
later atomic issue claim, while preserving safe resume and the standalone chain.

## Approach
Persist a UUID and exact repository/issue/branch/worktree identity before
create-only Git preparation. A per-worktree reservation protects callers sharing
an existing linked checkout. Resume verifies saved identity, current branch,
repository and base ancestry without switching/resetting; interrupted work and
state remain available. Tracker acquisition remains after triage/root-cause.

## Shared reference scope
Compared other worktree-setup.md copies. These branch identity and resume details
are specific to om-auto-fix-issue; no shared setup or cross-skill claim contract is
changed. The required synchronization question was presented by the driver; only
this skill's marked specifics change.

## Progress
- [x] 1.1 Confirm deterministic branch/checkout -B path on current main.
- [x] 1.2 Implement own preparation helper and route skill/reference/docs to it.
- [x] 1.3 Exercise real-Git concurrent primary/linked worktrees, exact persisted
  resume, dirty work retention, collisions/tampering and one atomic publisher.
- [x] 2.1 Run every configured validation command and independent review.

Publication, final-head CI and claim release are recorded in the PR discussion.

## Compatibility
Local state format is additive and read only by this skill's own helper.
Existing public skill/tracker arguments and parsed chaining markers remain.
Legacy deterministic unpublished branches are retained, never guessed/reset.
The helper requires Node.js and existing Git; commands use argv arrays and no
shell interpolation. No tracker ownership is acquired by local preparation.


## Verification and review
All 11 configured commands passed locally and in an independent subagent review.
The reviewer approved with one Minor: persistently bind the cleanup-ownership
flag to the exclusive reservation. Fixed it with boolean/type/path checks and
altered-flag resume regressions. A subsequent real race exposed automatic Git
upstream setup contending on shared config; fresh branches now use --no-track,
leaving upstream setup to the later claim winner at publication. Repeated real-Git
race/resume tests and final lint cover these scoped final changes.
