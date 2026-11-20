# Handle host review blocks in immediate automerge

## Goal

Finish an immediate automerge visit with a confirmed guarded squash or a precise host review blocker that resumes only when relevant facts change.

## Scope

Update Merge Buddy's finish and resume policies, clarify GitHub's merge actor contract, and add regression coverage for the two-label path.

## Implementation plan

1. Define the native-review refusal and resume behavior, including the case where an explicitly configured merge actor can complete the squash.
2. Verify the policy and existing gates with the Merge Buddy tests and the repository validation commands.

## Risks

Treat incomplete host evidence conservatively and preserve human vetoes, prepare-only behavior, and exact-head merge guards.

## Progress

PR: #202

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Handle host review refusals

- [x] 1.1 Define and test the merge refusal policy — d801bf4
- [x] 1.2 Run validation and review the final change — 16ad0b1
