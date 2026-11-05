# Bot assignment fallback across PR management skills

## Goal
Allow bot accounts ending in `[bot]` to claim PRs/issues through `in-progress` when the tracker blocks their assignment, without weakening claim ownership or review/QA gates.

## Scope
Shared claim and rules references in all installed skills, inline claim instructions, tracker guidance and process documentation. Preserve human assignment behavior and unrelated tracker errors. No provider APIs or public output formats change.

## Implementation plan
1. Update all shared claim/rules copies and reconcile inline assignment requirements.
2. Validate the collection and review bot failure, concurrent-run and cleanup behavior.
3. Publish the reviewed PR with validation evidence.

## Risks
Bot accounts share an identity across runs: claim comments must identify the run/chain; labels must be readable and writable. A generic 403 must not hide unrelated missing permissions.

## Progress

- [ ] 1.1 Update shared and inline claim instructions across skills.
- [ ] 1.2 Run configured validation and review the final diff.
- [ ] 1.3 Finalize PR and report evidence.
