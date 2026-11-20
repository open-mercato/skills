# Record the evidence for direct automerge

## Goal

Give maintainers a durable PR comment explaining the decision, signals and check results when an automerge skill merges directly.

## Scope

Follow up on PR #194 in `om-auto-fix-issue` and `om-auto-fix-pr`. Use the `om-auto-merge-buddy` merge summary as the model for the two equivalent `--automerge-force` routes.

## Implementation Plan

### Phase 1: Record direct merge evidence

1. Add the merge evidence and outcome workflow to both direct automerge routes.
2. Cover the workflow with the existing automerge contract checks and run the repository gate.

## Risks

A stale or unsuccessful write must never be presented as a confirmed merge. Keep the existing signals and merge gates authoritative and recheck them after writing the evidence.

## Progress

PR: #196

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Record direct merge evidence

- [x] 1.1 Add the merge evidence and outcome workflow to both direct automerge routes. — 7b90e74
- [x] 1.2 Cover the workflow with the existing automerge contract checks and run the repository gate. — 1dc17bc
