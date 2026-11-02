# Preserve human QA vetoes in the automerge queue

## Goal
Prevent `om-auto-merge-buddy` from preparing or merging a PR with `qa-failed`, `do-not-merge`, or an unresolved trusted human QA NO-GO, even without `needs-qa`.

## Scope
Resume extension: architecture changes and backward-incompatible changes also require strict risk checks, pinned human QA and explicit current-head human technical approval. Existing compatibility requirements cannot be waived by QA or force.
Also preserve strict risk checks and require pinned human QA for migrations, money and permissions/tenant isolation regardless of `--force`; expose exact stop reasons in the existing status comment.
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

## Verification

All 10 configured validation commands passed. The lint gate includes the existing
merge-buddy suite plus the new human-gate contract assertions. After final
single-skill documentation clarification, lint and its embedded regressions
passed again. Used Python 3.12 via a temporary PATH shim because the system
Python lacks `tomllib`; no runtime/dependency files were changed.

Manual review covered labels without needs-qa/report, trusted versus quoted
NO-GO, multiple reviewers, explicit release, new commits/replacements, protected
areas with force/missing labels/self-QA, valid human approval, and ordinary fixes.
These are instruction/contract checks; no live PR merge or real QA was performed.
No shared parsed interfaces or standard reference copies changed.

## Progress
PR: #163

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Preserve vetoes throughout the visit

- [x] 1.1 Add one skill-local veto policy and apply it before signal evaluation, stages, replacements and finish. — 9e43c80
- [x] 1.2 Review scenario outcomes and run the configured validation gate. — 313c455


### Phase 2: Extend protected areas

- [x] 2.1 Add architecture and backward-incompatible changes to mandatory human gates, including visible reasons and compatibility-policy requirements. — 65e54b1
- [ ] 2.2 Verify the extended contracts and run the full configured validation and review gate.
