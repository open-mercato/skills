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

<host verdict; include the generated reviewer-status and findings tables when multi ran>

## Staged files

<name-status list from the index>

## Prepared pull-request body

<repository template filled truthfully, without publishing it>

No commit, push, or pull request was created.

WORKTREE=<absolute path>
```
