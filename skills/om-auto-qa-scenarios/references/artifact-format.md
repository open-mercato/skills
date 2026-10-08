# Artifact format — the markdown and HTML scenario files

Product format for step 7 of `om-auto-qa-scenarios`: the two files a tester
reads. They are written from the same in-memory data (areas, routes, PR
inventory) — the HTML is authored directly, never converted from the markdown —
so they always agree.

## `${REPORT_BASE}.md`

```markdown
# QA Scenarios — {window caption}

Report window: **{start} → {end}** (routes for base `{base}`).

## Executive Summary

- Reviewed **{count} PRs**: {n} merged into `{base}`, {m} into other branches ({list}){, k not yet merged}.
- Grouped into **{N} testing routes** below; the appendix lists every PR.
- {One sentence on the riskiest theme in this window.}
- {Only when present: X PRs merged without recorded QA sign-off; Y routes unresolved; Z PRs with unavailable metadata.}

## Recommended QA Order

| Priority | Area | Suggested focus |
|---|---|---|
| P0 | {Area} | {one sentence} |
| P1 | {Area} | {one sentence} |
| P2 | No direct manual QA — broad smoke only | {one sentence} |

## QA Areas

### P0 — {Area}

{2–3 sentences: what changed for a user in this window.}

**Representative PRs:** [#{n}]({url}), [#{n}]({url})
**Linked issue refs:** [#{k}]({url}) (fixes) · [#{k}]({url}) (mentioned)
**Guided session:** `om-qa-buddy {n}`

**Where QA should click**
- {route}

**What human QA should verify**
- {action} → {expected outcome}

**What can go wrong**
- {regression symptom}

{Repeat per area, P0 first.}

## Appendix: Full PR Inventory

One line per PR in the window, grouped by merge date (newest first).

### {YYYY-MM-DD}

- [#{n}]({url}) {title} — base `{base}` · QA: {needs-qa | skip-qa | qa-approved | qa-self-verified | none} · Issue refs: [#{k}]({url}) | none

### Not yet merged        <!-- only with --include-open -->

- [#{n}]({url}) {title} — QA: {…}

### Excluded

- {count} excluded ({reason per group}); {count} with metadata unavailable: [#{n}]({url}) (metadata unavailable)
```

Rules:

- Omit a line or section that would be empty (no "Not yet merged" without
  `--include-open`, no Excluded line when nothing was excluded).
- Area narrative ≤6 sentences; the appendix carries completeness.
- Link text is `#<number>`; the link target is the `url` the tracker returned —
  never a URL assembled from a template.
- Redact anything credential-shaped, customer-identifying, or internal-only
  that appears in a title; summarize instead of quoting PR bodies.

## `${REPORT_BASE}.html`

A stand-alone page that MUST:

- start with `<!DOCTYPE html>`, set `<html lang="en" dir="ltr">`, include
  `<meta charset="utf-8">` and a viewport meta, and a `<title>` equal to the
  markdown H1;
- carry one small inline `<style>` block using system fonts, readable in both
  light and dark (`prefers-color-scheme`) — no JavaScript, no web fonts, no
  remote CSS, images, or other assets;
- mirror every markdown section: Executive Summary (`<ul>`), Recommended QA
  Order (`<table>`), each QA area as a `<section>` with the same headings, and
  the appendix grouped by date (`<h3>` + `<ul>`);
- render every PR and issue link as `<a href="{url}" rel="noopener noreferrer">`;
- HTML-escape every title and text value taken from the tracker.

## Self-check before shipping

Run against both files and fix any hit before step 8:

- every `href` / markdown link target is one of the PR or issue URLs collected
  in steps 2–3 — nothing else;
- the HTML contains no `<script`, `on*=` handler, `@import`, or `src=`/`href=`
  to a non-tracker host;
- no raw diff hunks (`@@ `, `+++ `, `--- a/`), no pasted PR-body paragraphs, no
  credential-shaped strings;
- every PR in the enumerated set appears exactly once in the appendix, and the
  counts in the Executive Summary add up;
- no trailing whitespace or merge markers (`git diff --check` equivalent on the
  staged files).
