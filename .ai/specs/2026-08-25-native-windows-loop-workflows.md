# Shell-Neutral Loop Workflows

## TLDR

Remove shell logic from resumable create/continue loops while preserving run-folder and Progress formats.

## Dependency and scope

Depends on config/setup, worktree, tracker, and review-workflow specs. Owns the eight loop references and only the routing text named by the roadmap.

## Proposed solution

Use structured file operations for run state, direct argv processes for child executors, and named tracker operations for claims/finalization. Preserve filenames, fields, resume ordering, commit association, and parsed output exactly.

## Failures

Malformed state, missing executor, failed child process, or claim conflict stops at the existing boundary. Interrupted work remains resumable and cleanup touches only current-run state.

## Validation and plan

1.1 Add shared run-state fixtures and expected semantic/parsed outputs.

1.2 Migrate create-loop helpers; test success, interruption, child failure, and claim conflict on Ubuntu/Windows.

2.1 Migrate continue-loop helpers; test lookup, old-state compatibility, resume, review, and finalization.

2.2 Assert exact argv and that no shell process, pipeline, or evaluated command string is used.

## Completion Criteria

- Both loops complete/resume identically on both OSes.
- Existing run folders and parsed markers remain compatible.
- No platform branch or shell dependency remains.
