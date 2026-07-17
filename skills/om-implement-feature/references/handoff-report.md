# Staged feature handoff report

This template is rendered by the final step of `om-implement-feature`.

```markdown
# Feature report — <title>

- Status: ready for human review
- Spec: `<path>`
- Worktree: `<absolute path>`
- Branch: `<branch>`
- HEAD: unchanged at `<start sha>`
- Suggested commit: `<conventional subject>`

## Implemented scope

<acceptance criteria and changed paths>

## Validation

<configured gate, integration tests, and UI evidence>

## Review

<host verdict; when a council ran, paste the reviewer-status table and the
findings-by-model matrix from the final round's review-summary.md verbatim>

## Staged files

<name-status list from the index>

## Prepared pull-request body

<repository template filled truthfully, without publishing it>

## Publish checklist (human)

1. Review the staged diff in the worktree.
2. Commit with the suggested subject and push the branch.
3. Open the pull request with the prepared body.
4. Release any tracker claim this run holds (label and assignee) so later
   automation is not fenced off.

No commit, push, or pull request was created.

WORKTREE=<absolute path>
```
