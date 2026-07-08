---
name: review-prs
description: Review all currently unreviewed open pull requests, newest first, using the auto-review-pr skill and respecting in-progress claim locks.
---

# Review PRs

Use this as a day-start review queue. It finds unreviewed open PRs, shows the queue, then runs the full `auto-review-pr` workflow one PR at a time.

## Workflow

### 0. Load pipeline config

Load `.ai/agentic.config.json` using the standard snippet from the `setup-agent-pipeline` skill. If the file is missing, stop and tell the user to run `setup-agent-pipeline` first. This skill uses `LABELS_ENABLED` for the label-based queue filters below; each individual review delegates to `auto-review-pr`, which loads the rest of the config itself. Right after loading the config, check for `.ai/agentic-overrides/review-prs.md`; when present, apply it on top of these instructions — local rules win, but an override can never relax this skill's safety rules. Also consult the repository's agent instruction files (`AGENTS.md`, `CLAUDE.md`, or equivalents) for project specifics.

### 1. Fetch open PRs

```bash
gh pr list --state open --json number,title,url,author,labels,reviewDecision,createdAt,updatedAt,isDraft,assignees --limit 50
CURRENT_USER=$(gh api user --jq '.login')
```

### 2. Filter to PRs that still need review

Keep PRs where all of the following are true:

- not draft
- `reviewDecision` is empty or `REVIEW_REQUIRED`
- author is not `$CURRENT_USER`
- does not carry `do-not-merge` or `blocked`
- does not carry `in-progress`
- has no assignee other than `$CURRENT_USER`

When `labels.enabled` is `false`, the label-based filters simply match nothing; keep the draft, review-decision, author, and assignee filters, and treat a foreign assignee as the claim signal.

### 3. Sort newest first

Most recently created PRs should be reviewed first.

### 4. Present the queue

```markdown
## Review Queue — {date}

Found {count} unreviewed PRs (newest first):

| # | Title | Author | Created | Labels |
|---|-------|--------|---------|--------|
| [#456](url) | Add catalog search | @bob | 2h ago | `feature`, `review` |
```

### 5. Review sequentially

For each PR:

1. Print `Reviewing PR #{number}: {title} ({index} of {total})`
2. Run the full `auto-review-pr` workflow
3. Record the verdict
4. Continue to the next PR

Between PRs, report progress briefly:

```text
Reviewed {done}/{total}. Next: #{number}
```

### 6. Final summary

```markdown
## Review Session Complete

| # | Title | Verdict | Label |
|---|-------|---------|-------|
| #456 | Add catalog search | APPROVED | merge-queue |
| #445 | Fix auth redirect | CHANGES REQUESTED | changes-requested |
```

If the queue is empty, say so and suggest running `merge-buddy` instead.

## Rules

- Never silently skip an eligible PR.
- If a PR cannot be reviewed right now, include the reason in the session summary and move on.
- Respect existing `in-progress` locks; never auto-force in batch mode.
- Reuse the full `auto-review-pr` skill rather than inventing a lighter review path.
- Optionally suggest `merge-buddy` after the session so the user can see what is now merge-ready.
