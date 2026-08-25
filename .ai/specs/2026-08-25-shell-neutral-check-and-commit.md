# Shell-Neutral Check and Commit

## TLDR

Remove shell and `jq` logic from `om-check-and-commit` independently.

## Dependency and scope

Depends on config/setup. Owns non-standard `om-check-and-commit` instructions/references; its setup copy remains foundation-owned.

## Proposed solution and validation

Use structured config/status reads and direct validation/Git argv. Preserve dirty-file selection, unrelated-change protection, validation, commit message, and no-push authority. Test clean, selected/unrelated changes, malformed config, validation/commit failure, and success on Ubuntu/Windows.

## Implementation Plan

1.1 Add fixtures/postconditions. 1.2 rewrite owned instructions. 1.3 run cross-OS matrix and assert no shell/`jq`.

## Completion Criteria

- Exact validation and commit scope is preserved on both OSes.
- No shell, `jq`, or new runtime dependency remains.
