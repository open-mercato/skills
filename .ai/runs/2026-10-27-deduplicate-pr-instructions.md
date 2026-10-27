# Remove duplicate PR workflow instructions

## Goal

Reduce repeated instructions in `om-auto-create-pr` and `om-auto-review-pr` without changing their behavior.

## Scope

Change only the two entrypoints. Keep each required operation, decision branch, gate, and output field. Keep shared references unchanged. This PR is stacked on #140 so its diff contains only the additional optimization.

Non-goals: language fixes in #140, changes to other skills, removal of required validation, workflow reordering, or merge.

## Ownership map

| Repeated instruction | Retained authority |
| --- | --- |
| Repo-local override in step 0 | Mandatory entrypoint preflight and step-0 `agentic-setup.md` |
| Worktree checkout, reuse, install, cleanup details | Each skill's `worktree-setup.md`, loaded at its worktree step |
| Create workflow review ownership and Progress fixes | Its step-10 `review-report.md` |
| Review engine checklist and validation details | Its step-8 `review-report.md` and invoked `om-code-review` |
| Review autofix order, tests, commits and fork handling | Its step-11 `review-report.md` |

The body keeps the numbered algorithm and the branch conditions. Safety and QA rules remain loaded on every run. No standard reference file is edited, so no additional shared-copy synchronization is needed.

## Risks

A shorter instruction could hide a branch. Compare the retained reference against each removed sentence. Keep step numbers unchanged so existing references still resolve.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Remove repeated instructions

- [ ] 1.1 Deduplicate entrypoints against their retained references

### Phase 2: Verify and publish

- [ ] 2.1 Run the configured gate and compare behavior contracts
- [ ] 2.2 Review and publish the separate optimization PR
