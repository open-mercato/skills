# Issue-management report

The issue body carries the clarified request; comments record new evidence or
status. Report outcomes without repeating either. Use `would` for dry runs.

## Single issue

```markdown
{✅/⚠️} `om-auto-manage-issues` {updated/checked/would update} {linked issue}: {useful change or result}.
Ready: {ready / not-ready — missing ticket-level items; name an explicit maintainer waiver when it determines readiness}.
{Other material evidence limit, only when not already covered by readiness.}
{Missing spec: reason and spec-required comment outcome; otherwise link a newly authored design.}
Next: {the concrete remaining action, or no action needed}.
```

## Batch

Lead with the resolved scope and totals: scanned, labeled, enriched, prepped,
not-ready, skipped. Then one row per issue; no boolean-field dump or repeated prose totals.

```markdown
| Issue | Result | Readiness | Next action |
|---|---|---|---|
| {linked issue} | {concrete delta or skipped and why} | {ready / not-ready with missing ticket-level items / not checked when skipped} | {remaining action; missing spec and comment outcome when applicable} |
```

Include every issue with `READY_STATUS=not-ready` and all its missing ticket-level
items. Keep spec gaps separate: a covering spec does not supply missing human
input, and a spec-required comment is not repeated as a ticket-level gap. Do not
infer readiness from a completed wording pass or invented answers. Honor an
explicit maintainer waiver per `references/enrich-existing-issue.md`.

Keep missing specs and claim/hold skips visible. Report the number matched but
unprocessed when `--limit` or the prep cap applies. Under `--dry-run`, include the
proposed body/comment edits in collapsed detail so the changes are reviewable,
without claiming they were posted. Preserve `SPEC_STATUS` and `READY_STATUS` internally, including during dry runs.

For each spec PR actually authored, end with exact lines:

```text
PR: #<number> (link: <full PR URL>)
Issue: #<number> (link: <full issue URL>)
Spec: <repo-relative path>
```
