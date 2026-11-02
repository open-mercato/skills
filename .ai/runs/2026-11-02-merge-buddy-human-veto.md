# Preserve human QA vetoes in the automerge queue

## Goal
Prevent `om-auto-merge-buddy` from preparing or merging a PR with `qa-failed`, `do-not-merge`, or an unresolved trusted human QA NO-GO, even without `needs-qa`.

## Scope
Update the skill router, signal/bootstrap rules, reconciliation and finish guards; document trusted human verdict recognition, explicit release and conservative handling of unreadable evidence.

## Non-goals
No tracker/config/schema changes, new QA team configuration, host merge-policy redesign, or changes to other skills/shared standard reference files.

## Implementation Plan
### Phase 1: Preserve vetoes throughout the visit
1.1 Add one skill-local veto policy and apply it before signal evaluation, stages, replacements and finish.
1.2 Review scenario outcomes and run the configured validation gate.

## Risks
A historical or quoted NO-GO must not become a new veto; a push or automatic PASS must not clear a real one. Use verified write-access human verdicts, explicit resolution and conservative waits on unavailable evidence. Existing SDLC blocks (`blocked`, active `qa`) also remain effective.

## Assumptions
Use existing write-access trust rules plus explicit QA-verdict context rather than inventing a QA team list. Humans explicitly release their veto; automation cannot do so. No shared standard-file synchronization is needed because only skill-specific files change.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Preserve vetoes throughout the visit

- [ ] 1.1 Add one skill-local veto policy and apply it before signal evaluation, stages, replacements and finish.
- [ ] 1.2 Review scenario outcomes and run the configured validation gate.
