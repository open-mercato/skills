# Short ownership for issue housekeeping

## Goal
Serialize concurrent `om-auto-manage-issues` writes without claiming read-only scans.

## Decisions
Keep the shared claim protocol unchanged; alter only this role's specifics.
Read-only proposals are recomputed from fresh issue/comments under ownership.
Human holds and foreign assignments skip; clean up only this run's secondary
state and release exact-generation refs last. Explicit unsupported issue providers
retain fallback election with disclosed limits. Release before spec delegation.
The shared-file comparison found no other role requiring this policy change;
the parent presented the §5 scope question to the operator.

## Progress
- [x] 1.1 Confirm the no-claim write race and inspect provider contracts.
- [x] 1.2 Add per-issue ownership instructions and fresh-delta/idempotency guards.
- [x] 1.3 Add real-Git same-login mutation race, replay/failure/hold coverage.
- [x] 2.1 Run all 11 configured validation commands and review the complete diff.
- [x] 2.2 Publish a separate ready PR; hosted CI is reported on the PR and claims release after handoff.
