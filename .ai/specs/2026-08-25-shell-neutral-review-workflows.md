# Shell-Neutral Review Workflows

## TLDR

Port code review, autonomous review, and PR autopilot as one review/CI-transition capability.

## Dependencies and scope

Depends on config/setup, worktree, and tracker specs. Owns non-standard instructions for `om-code-review`, `om-auto-review-pr`, and `om-pr-autopilot`, including report, CI-follow-up, and label-transition references.

## Proposed solution and validation

Use structured diff/report files, direct validation argv, and named tracker review/label operations. Preserve severity verdicts, self-review restrictions, changes-requested loops, CI follow-up, labels, handback, and cleanup. Test each route on Ubuntu/Windows for approve, findings, failed checks, fork/self-review restriction, retry, and claim conflict.

## Implementation Plan

1.1 Add route postconditions. 1.2 migrate code/auto review. 1.3 migrate autopilot/CI transitions. 1.4 run route-specific matrix.

## Completion Criteria

- All three routes pass success/failure fixtures on both OSes.
- Review/label/CI semantics remain compatible with no shell branch.
