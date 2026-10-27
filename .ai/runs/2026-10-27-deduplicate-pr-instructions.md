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

## Verification evidence

All five configured commands pass. Both remote checks pass at `c0c7cb0`, and the matching lint workflow completed. The review found no actionable defects. GitHub author self-approval is unavailable, so the report is a COMMENT review and a separate reviewer owns native approval. All reference files, frontmatter, arguments, step numbers, code blocks, tracker-operation lists, security sections, and machine fields remain unchanged. The entrypoints remove 140 words.

## Risks

A shorter instruction could hide a branch. Compare the retained reference against each removed sentence. Keep step numbers unchanged so existing references still resolve.

## Progress

PR: #147

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Remove repeated instructions

- [x] 1.1 Deduplicate entrypoints against their retained references — 37d0a05

### Phase 2: Verify and publish

- [x] 2.1 Run the configured gate and compare behavior contracts — c0c7cb0
- [x] 2.2 Review and publish the separate optimization PR — c0c7cb0
