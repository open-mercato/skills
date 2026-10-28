# Worked examples

Use the comment purposes and report fields in `references/report-templates.md`.
The base branch below is a value resolved from the example repository's config.

## Dry-run preview

```text
Window: 2026-04-01 → 2026-04-17; repo: acme/widgets; base: trunk
DRY-RUN: would close #1350 — PR #1421 explicitly fixes it and merged into trunk at 8a60110.
DRY-RUN: would comment on #1288 — PR #1419 merged into release/0.5.0; issue stays open.
DRY-RUN: would comment on #1299 — PR #1412 closed unmerged; replacement #1415.
closed 0, commented 0, skipped 2, unmatched-mentions 0, dry-run-would-have 3.
```

## Missing closing keywords

```markdown
⚠️ `om-close-fixed-issues` closed 0 issues; two PRs mention open issues without recognized closing links.

| PR | Open issue | Evidence |
|---|---|---|
| #91 | #88 | `Zamyka #88` is not a configured closing keyword. |
| #90 | #62 | `Naprawia #62` is not a configured closing keyword. |

No custom `closeKeywords` are configured. If these phrases mean the issues are
fixed, add `"closeKeywords": ["zamyka", "naprawia"]` to `.ai/agentic.config.json`
and rerun. Neither issue was changed.
```

## Closure comment

```markdown
🤖 `om-close-fixed-issues` — issue closed

✅ Closed because #1421 (https://github.com/acme/widgets/pull/1421) explicitly
fixes this issue and merged into `trunk` at 2026-04-15T14:02:31Z, commit `8a60110`.
Credit: @alice.

If this closure is wrong, reopen and add `do-not-close` to prevent another automatic closure.
```
