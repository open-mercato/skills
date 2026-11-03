# Approve held CI before parking automerge PRs

## Goal
Release workflow runs awaiting maintainer approval when the authenticated operator can approve them, then reconcile real CI results.

## Scope
Update only om-auto-merge-buddy instructions and its CI-specific references. Reuse approve-pending-runs; preserve queue authorization, workflow-diff restrictions, human vetoes, review, QA and passing-CI merge gates.

## Non-goals
No workflow/config changes, new tracker operations, environment deployment approvals, automatic PR merges, or changes to other skills.

## Implementation plan
### Phase 1: Recovery instructions
1.1 Detect held runs at workflow level, approve safely before CI repair or a human wait, and narrowly recover approval-only blocked PRs.
1.2 Review decision scenarios and run the configured validation gate locally.
### Phase 2: Publish and review
2.1 Complete authoritative PR review, record evidence, and publish a ready PR.

## Risks
Workflow approval permits contributor code to execute. Keep the existing prohibition on approving outside-contributor CI-definition changes; an approval is never a CI pass. Permission refusals remain visible blockers.

## Progress

PR: #169

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Recovery instructions

- [x] 1.1 Detect held runs at workflow level, approve safely before CI repair or a human wait, and narrowly recover approval-only blocked PRs.
- [ ] 1.2 Review decision scenarios and run the configured validation gate locally.

### Phase 2: Publish and review

- [ ] 2.1 Complete authoritative PR review, record evidence, and publish a ready PR.
