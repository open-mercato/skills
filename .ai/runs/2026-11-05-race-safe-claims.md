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

User follow-up: add human-only GitHub UI `claim-reset` recovery with audited cutoff and cooperative revocation; preserve all other gates.

## Non-goals
Change stale windows, QA or merge gates, deploy, merge to base, or add scheduling.

## Risks
Comment visibility is eventually consistent; bounded repeated verification narrows but cannot eliminate duplicate work. Legacy active claims remain blockers, never assumed to be this run merely because the login matches. Custom tracker upgrades must preserve operation fallback.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Protocol and consumers

- [x] 1.1 Add comment-first election and update all claim consumers — abf33b8
- [x] 1.2 Extend provider and upgrade contracts — abf33b8

### Phase 2: Verification and delivery

- [x] 2.1 Validate races, lifecycle and full configured gate — abf33b8
- [x] 2.2 Review and publish the completed PR — a4847d3

## Shared-copy synchronization

User requested all skills. Updated claim procedures in: `om-auto-continue-pr`, `om-auto-continue-pr-loop`, `om-auto-create-pr`, `om-auto-create-pr-loop`, `om-auto-fix-issue`, `om-auto-fix-pr`, `om-auto-manage-issues`, `om-auto-merge-buddy`, `om-auto-qa-pr`, `om-auto-review-pr`, `om-auto-write-spec`, `om-close-fixed-issues`, `om-fix`, `om-fix-issue`, `om-fix-issue-multi`, `om-fix-issue-multi-optimized`, `om-fix-issue-optimized`, `om-harness`, `om-implement-feature`, `om-implement-feature-multi`, `om-implement-feature-multi-optimized`, `om-implement-feature-optimized`, `om-open-pr`, `om-pr-autopilot`, `om-review-prs`, `om-setup-agent-harness`, `om-verify-in-repo`. Shared claim-etiquette rules are synchronized in every copy carrying them; no other shared rules changed.

## Verification evidence

- Live scratch issue https://github.com/open-mercato/skills/issues/177 (closed): five concurrent double-claim rounds under `open-mercato-maintenance[bot]`, each with one winner, one withdrawn loser, verified `in-progress`, and terminal release. No assignment required. Candidate pairs began after both initial reads saw no live claim.
- Mock transport: 12 interleaved races including 6 same-bot pairs; numeric creation order, pagination, withdrawn/released and legacy candidates, stale exclusions, failed reads and reset permission/audit denial cases.
- Provisioned the optional `claim-reset` label in this repository; never applied it automatically. Live human reset was not performed; audit authorization tested against fixtures.
- Independent read-only review dispatched as cezar task 601ef812-5829-43b6-9c02-7cfb273a8875.

All ten configured validation commands pass (lint rerun after token-budget, role-preservation and standalone SDLC-template sync fixes; nine other commands from the full ordered run). Temporary Git fixtures used TMPDIR/TMP/TEMP=/tmp to avoid nested-worktree contamination.

## Review fix

Independent review of 588db96 found a major split-provider cleanup gap: Linear/Jira PR candidates could be elected on GitHub but withdrawn through issue-local operations. Added explicit kind/item-aware PR delegation for withdrawal, ownership verification and read-back, plus code-host-local fallback for older companions. Issue cleanup retains provider-specific handles. Added regression checks for all four routing requirements. No reviewer branch changes were merged (read-only review).

Final re-review: cezar task ffa8d6e3 approved root a4847d3 after verifying the prior major; no remaining blockers. Parent reran all ten configured commands after the routing fix: every command exited 0. Final README/skill-catalog edits document the already-reviewed behavior; manually reviewed. PR #176 contains the full validation/review evidence. Human GitHub UI reset remains a requested manual QA check; no live human reset was performed.
