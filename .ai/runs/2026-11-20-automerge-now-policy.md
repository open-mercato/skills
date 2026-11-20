# Automerge now policy

## Goal

Make one buddy own automated merging, with a label-driven immediate visit and an explicit automation-only approval policy when both labels are present.

## Scope

Keep the configured queue label for normal intake. Accept `automerge-now` as an explicit immediate queue request. Treat `automerge-force` alone as a risk modifier. Preserve explicit stop signals, prepare-only mode, claims and current-head evidence. Both fixers hand off to the buddy and no longer accept the old force flag.

## Risks

An old issue force label must not authorize a merge alone. A mid-run label removal must invalidate dependent readiness and stop any merge based on the previous policy.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Unify automerge behavior

- [ ] 1.1 Route immediate processing and approval policy through the buddy

### Phase 2: Document and verify

- [ ] 2.1 Update pipeline documentation and add cross-skill regression scenarios
