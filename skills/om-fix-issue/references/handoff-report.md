# Staged issue handoff report

This template is rendered by the final step of `om-fix-issue`.

```markdown
# Fix report — <issue id> <title>

- Status: ready for human review
- Worktree: `<absolute path>`
- Branch: `<branch>`
- HEAD: unchanged at `<start sha>`
- Issue claim: held (`in-progress`) until publish or abort
- Suggested commit: `<conventional subject>`

## Root cause and change

<concise evidence-backed summary and changed paths>

## Validation

<every configured command and result, plus targeted regression evidence>

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
4. Release the issue claim: remove the `in-progress` label and the harness
   assignee through the tracker (or ask the agent to run the release step) so
   later automation is not fenced off.

No commit, push, or pull request was created.

WORKTREE=<absolute path>
```
