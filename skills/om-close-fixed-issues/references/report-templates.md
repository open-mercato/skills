# Issue comments and final report

Comments state the disposition and evidence. Do not call a merged change deployed
or independently verified. Use one marker-idempotent comment per purpose and PR;
recognize older comments by their `Fixed by` / `references this issue` wording
plus the `om-close-fixed-issues` attribution, so reruns do not duplicate them.

## Close comment (step 4a — merged into the base branch)

```markdown
🤖 `om-close-fixed-issues` — issue closed

✅ Closed because #{prNumber} ({prUrl}) explicitly fixes this issue and merged
into `${BASE_BRANCH}` at ${mergedAt}, commit `${mergeCommitSha:0:7}`.
Credit: @{resolved human contributor}.

If this closure is wrong, reopen and add `do-not-close` to prevent another automatic closure.
```

Omit credit when only a bot is identifiable; preserve carry-forward attribution.

## Informational comment (step 4b — merged into a non-base branch)

```markdown
🤖 `om-close-fixed-issues` — non-base merge

#{prNumber} ({prUrl}) merged into `${baseRefName}`. This issue stays open until
the change reaches the configured base branch, `${BASE_BRANCH}`.
```

## Informational comment (step 4c — closed without merge)

```markdown
🤖 `om-close-fixed-issues` — closed without merge

#{prNumber} ({prUrl}) closed without merging on ${closedAt}; this issue stays open.${supersededBySuffix}
```

`supersededBySuffix` is ` Replacement: #{newPr} ({newPrUrl}).` when a replacement
was detected, otherwise empty.

## Final report (step 7)

Lead with the window and counts, then use one row per processed PR/issue pair.
The reason names the evidence behind the action without repeating protocol rules.

```markdown
✅ `om-close-fixed-issues` processed {since} → {today}: closed {N}, commented {M}, skipped {K}, unmatched-mentions {U}, dry-run-would-have {X}.

| PR | Issue | Action | Reason |
|---|---|---|---|
| {linked PR} | {linked issue} | {closed/commented/skipped} | {Explicit fix merged into base at SHA / non-base merge / closed unmerged / human hold / already closed.} |
```

Keep the count fields. Mark dry-run actions as proposed, and retain the required
`DRY-RUN:` mutation lines. No extra paragraph repeating totals.

## Unmatched issue mentions (print when any were recorded)

Only numbers step 3 resolved to **open issues** appear here. Do not close or
comment on them; show this diagnosis in dry runs too.

```markdown
### ⚠️ Issue mentions without a recognized closing keyword

| PR | Open issues mentioned | Evidence |
|---|---|---|
| {linked PR} | {issue links} | {Actual reference and why it is not an authoritative closing link.} |

These issues remain open. {N} configured `closeKeywords` extend the built-in
English terms. If a phrase is intended to close an issue, add that phrase's
single-word keyword to `.ai/agentic.config.json` and rerun.
```

When no custom keywords exist, say so directly. If no issue closed but unmatched
mentions exist, lead with that gap; do not imply the window contained no work.
Add only unresolved actions or material limitations after the table.
