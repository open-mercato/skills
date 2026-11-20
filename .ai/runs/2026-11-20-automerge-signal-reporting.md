# Automerge signal reporting

## Goal

Publish the same current-head signal labels and buddy status throughout preparation, then publish the canonical merge summary when the buddy is about to merge.

## Scope

Follow up on #197. Reconcile labels from verified evidence on first visits, resumed visits, and stage results. Apply the same publishing contract to direct buddy runs and both fixers. Preserve prepare-only, QA, evidence, and merge gates.

## Risks

A status write can succeed while a label write fails. Read back both before marking the PR ready or merging. Verify evidence again when the head, target, labels, or policy changes.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Unify reporting

- [ ] 1.1 Define and verify common automerge signal publication
