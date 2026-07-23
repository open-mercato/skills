# Report templates — issue comments (step 4) and final report (step 7)

The authoritative comment templates and the final run report for
`om-close-fixed-issues`. Reporting style contract: `references/rules.md`
(Reporting style) — full sentences, explain the why, never compress; emojis
structure the output, the text carries the meaning. Fill the placeholders
exactly; rendered examples with concrete values are in
`references/examples.md`.

## Close comment (step 4a — merged into the base branch)

```markdown
✅ Fixed by #{prNumber} ({prUrl}) — merged at ${mergedAt} (commit `${mergeCommitSha:0:7}`).

Closed automatically by the `om-close-fixed-issues` skill. Credit to @${prAuthor} (or the original author when the PR is a carry-forward — see the PR body for credit details).

If this is incorrect, reopen the issue and add the `do-not-close` label so future runs leave it alone.
```

## Informational comment (step 4b — merged into a non-base branch)

```markdown
ℹ️ #{prNumber} ({prUrl}) references this issue and was merged into `${baseRefName}`, which is not the configured base branch (`${BASE_BRANCH}`). Leaving this issue open until the change lands on `${BASE_BRANCH}`.

Posted automatically by the `om-close-fixed-issues` skill.
```

## Informational comment (step 4c — closed without merge)

```markdown
ℹ️ #{prNumber} ({prUrl}) referenced this issue but was closed **without merging** on ${closedAt}.${supersededBySuffix}

This issue remains open. Posted automatically by the `om-close-fixed-issues` skill.
```

`supersededBySuffix` expands to ` It was superseded by #{newPr} ({newPrUrl}).`
when a replacement PR was detected in the window, and to the empty string
otherwise.

## Final run report (step 7)

Print this table when the run finishes. The **Reason** column carries a full
sentence per row — state what happened and why that led to the action, so a
reader who did not watch the run can audit every decision from the table
alone:

```markdown
## om-close-fixed-issues — {since} → {today}

| PR | Issue | Action | Reason |
|----|-------|--------|--------|
| #1421 | #1350 | ✅ closed | PR #1421 was merged into the base branch at commit `abc1234`, so the fix is live and the issue is done. |
| #1419 | #1288 | ℹ️ commented-not-closed | PR #1419 was merged into `release/0.5.0`, which is not the configured base branch, so the issue stays open until the change lands there. |
| #1412 | #1299 | ℹ️ commented-unmerged | PR #1412 was closed without merging and was superseded by #1415, so the issue stays open with a pointer to the replacement. |
| #1410 | #1270 | ⚠️ skipped | The issue carries the `do-not-close` label, which humans use to keep housekeeping runs away from it. |
| #1408 | #1260 | ⚠️ skipped | The issue was already closed before this run, so there was nothing to reconcile. |
```

Finish with the counts (`closed N`, `commented M`, `skipped K`,
`dry-run-would-have X`) and a short paragraph in full sentences summarizing
the run — the window processed, anything unusual (stale locks recovered,
cross-repo references ignored), and whether a human needs to look at anything.
