# Shell-Neutral Changelog Window

## TLDR

Remove shell pipelines from changelog release-window reachability and temporary commit-set handling.

## Dependency and scope

Depends on config/setup and exclusively owns `skills/om-auto-update-changelog/SKILL.md` plus `references/release-window.md`.

## Proposed solution

Replace `/tmp`, pipelines, and command substitution with agent temp files, direct Git argument arrays, and structured result sets. Preserve ordering, merge-base/reachability rules, deduplication, and empty-window semantics.

## Validation and plan

1.1 Build graph fixtures for linear, merged, divergent, shallow, missing-tag, and empty windows.

1.2 Implement one semantic recipe with explicit exit checks and guaranteed owned cleanup.

1.3 Compare exact selected commit IDs/order on Ubuntu and Windows and assert no shell process; run repository lint.

## Completion Criteria

- Every graph fixture produces identical semantic windows on both OSes.
- Temporary files are platform-native and removed on success/failure.
- No changelog output contract changes.
