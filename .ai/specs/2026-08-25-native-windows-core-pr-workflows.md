# Shell-Neutral Author, Open, and Fix Workflows

## TLDR

Move the tightly coupled author/open/fix chain to structured operations without OS branches.

## Dependencies and scope

Depends on config/setup, worktree, and tracker specs. Owns non-standard instructions for `om-auto-create-pr`, `om-auto-fix-issue`, `om-auto-fix-pr`, `om-fix`, `om-open-pr`, and `om-verify-in-repo`.

## Proposed solution

Use structured files, direct argv, and named tracker operations while preserving verification, claim, isolation, validation, PR reuse/open, labels, handback, and chaining. Early draft is allowed only while Progress is incomplete; completed ordinary PRs are ready, while completed spec-only PRs remain draft.

## Validation and plan

1.1 Define per-route postconditions. 1.2 migrate author/open and test new/existing PR plus draft rules. 2.1 migrate verify/fix and test verified/unverified issues, claim conflict, failure, handback, cleanup. 2.2 execute all six routes separately on Ubuntu/Windows and assert exact argv/no shell.

## Completion Criteria

- All six routes pass route-specific success/failure fixtures on both OSes.
- Protected claims, labels, readiness, chaining, handback, and cleanup remain compatible.
- No platform branch or shell orchestration remains.
