# Race-aware claims for issue #127

## Goal
Prevent concurrent skill runs from both claiming an issue or PR, including runs sharing an unassignable bot account; retain `in-progress` as a secondary guard.

## Scope
All installed claim procedures and their inline consumers; tracker contracts, SDLC template and repository SDLC, upgrade guidance, and behavioral concurrency tests.

## Implementation Plan
### Phase 1: Protocol and consumers
1.1 Add comment-first election with run identity, verified ownership, and safe release to every claim reference and inline consumer.
1.2 Add provider winner/withdraw operations with legacy-descriptor fallback and update SDLC/upgrade contracts.
### Phase 2: Verification and delivery
2.1 Exercise interleaved claims, same-bot races, lifecycle and provider operations; run the configured validation gate.
2.2 Review the PR, apply findings, publish evidence and hand off ready for review.

## Decisions
Use comment election rather than repository refs: the reversible choice needs no additional contents-write permission or persistent Git objects in consumer repositories. Keep losing comments as explicitly withdrawn audit records. Keep legacy claim prefixes and append machine-readable identity/state fields. User explicitly requested all skills, authorizing shared-reference synchronization.

## Non-goals
Change stale windows, QA or merge gates, deploy, merge to base, or add scheduling.

## Risks
Comment visibility is eventually consistent; bounded repeated verification narrows but cannot eliminate duplicate work. Legacy active claims remain blockers, never assumed to be this run merely because the login matches. Custom tracker upgrades must preserve operation fallback.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Protocol and consumers

- [ ] 1.1 Add comment-first election and update all claim consumers
- [ ] 1.2 Extend provider and upgrade contracts

### Phase 2: Verification and delivery

- [ ] 2.1 Validate races, lifecycle and full configured gate
- [ ] 2.2 Review and publish the completed PR
