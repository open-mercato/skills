# Per-item automerge overrides

## Goal
Let operators select force risk overrides and preparation-only behavior per queued PR.

## Scope
Update the merge buddy skill, its policy references and user docs. Preserve queue authorization, claims, protected human gates and signal evidence. No tracker schema or shared reference changes.

## Implementation plan
### Phase 1: Policy and documentation
1.1 Define fresh per-item label resolution, precedence, child arguments, replacement handling and audit.
1.2 Update skill card and README; exercise mixed queues, label changes and protected gates.
### Phase 2: Verification and publication
2.1 Run configured validation and authoritative PR review; address findings and publish ready.

## Risks
Force labels must not leak between workers or bypass protected gates. Prepare labels must win over merge mode even when added during a visit. Existing queue label remains required. `automerge-prepare` maps to existing `prepare-to-merge` mode. `--skip-risk-checks` is an explicit alias of the buddy's existing risk override; child `--force` is never forwarded because it means claim takeover.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Policy and documentation
- [ ] 1.1 Define fresh per-item label resolution, precedence, child arguments, replacement handling and audit.
- [ ] 1.2 Update skill card and README; exercise mixed queues, label changes and protected gates.

### Phase 2: Verification and publication
- [ ] 2.1 Run configured validation and authoritative PR review; address findings and publish ready.
