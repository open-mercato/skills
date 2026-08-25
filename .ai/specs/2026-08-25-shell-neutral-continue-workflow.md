# Shell-Neutral Continue Workflow

## TLDR

Port `om-auto-continue-pr` as one independently shippable route.

## Dependencies and scope

Depends on config/setup, worktree, and tracker specs. Owns non-standard `om-auto-continue-pr` instructions.

## Proposed solution and validation

Use structured Progress reads, direct validation/Git argv, and named tracker operations. Preserve claim, first-unchecked-step selection, PR reuse, commit association, handback, and chaining. Test complete, resume, no-pending-step, claim-conflict, failed-validation, and interrupted-cleanup routes separately on Ubuntu/Windows.

## Implementation Plan

1.1 Add postconditions/fixtures. 1.2 migrate instructions. 1.3 run the cross-OS matrix and lint.

## Completion Criteria

- Continue/resume and parsed Progress/chaining formats are unchanged.
- No shell is invoked and only owned state is cleaned.
