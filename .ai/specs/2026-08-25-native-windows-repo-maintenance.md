# Shell-Neutral Upgrade-Notes Application

## TLDR

Remove shell and `jq` logic from `om-apply-upgrade-notes` while preserving descriptor-template authority.

## Dependency and scope

Depends on config/setup. Owns non-standard instructions in `skills/om-apply-upgrade-notes/SKILL.md`; its setup copy remains foundation-owned.

## Proposed solution and validation

Use structured config/file reads and direct argv. Preserve its cross-skill-reference exception, diff presentation, user authority, and mutation boundary. Test absent/current/outdated/malformed descriptors plus preview, accepted/declined update, failure, and cleanup on Ubuntu/Windows.

## Implementation Plan

1.1 Add fixtures/postconditions. 1.2 rewrite reads/apply paths. 1.3 run cross-OS matrix and assert no shell/`jq`.

## Completion Criteria

- Every route behaves identically on both OSes.
- Template authority and confirmation remain unchanged; no new runtime is added.
