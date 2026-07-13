# Execution plan: add "See how it works!" section title above README video

- Date: 2026-07-13
- Slug: readme-see-how-it-works
- Branch: feat/readme-see-how-it-works
- Owner: pkarw

## Overview

### Goal

Add a section heading ("See how it works!") above the YouTube video link that PR #21 added to `README.md`, so the video sits in its own titled section.

### Scope

- `README.md` only — insert `## 🎬 See how it works!` directly above the YouTube thumbnail link (line 49), matching the emoji-prefixed `##` heading style used throughout the README.

### Non-goals

- No other README restructuring or copy edits.
- No changes to the video link itself.

### External References

- None.

## Implementation Plan

### Phase 1: README update

- 1.1 Insert `## 🎬 See how it works!` heading above the YouTube link in `README.md`.

### Phase 2: Validation

- 2.1 Run the validation gate (`bash scripts/lint.sh`) and re-read the diff.

## Risks

- Docs-only; the only risk is heading placement/style mismatch, mitigated by re-reading the diff against the surrounding headings.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: README update

- [ ] 1.1 Insert "See how it works!" heading above the YouTube link

### Phase 2: Validation

- [ ] 2.1 Run validation gate and re-read diff
