# Shell-Neutral Worktree Lifecycle

## TLDR

Synchronize one direct-Git worktree algorithm across all nine standard copies.

## Dependency and scope

Depends on config/setup. Owns the nine `worktree-setup.md` copies listed in the roadmap and lifecycle fixtures.

## Proposed solution

Express discovery, add/reuse, branch validation, nesting prevention, cleanup ownership, removal, and prune as individual Git argv calls plus decisions—never shell variables, traps, or OS variants.

## Authorization, validation, and plan

1.1 Ask to synchronize the exact nine owners; without approval stop. Build real fixtures. 1.2 synchronize all copies while preserving specifics. 1.3 test create/reuse/interruption/failure/cleanup in spaced Unicode paths on Ubuntu/Windows and machine-check shared equality.

## Completion Criteria

- All copies are authorized and semantically identical.
- Real lifecycle passes without a shell and never changes primary/unowned worktrees.
