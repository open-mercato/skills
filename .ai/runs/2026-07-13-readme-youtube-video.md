# Execution plan: add YouTube video to main README

- Date: 2026-07-13
- Slug: readme-youtube-video
- Branch: feat/readme-youtube-video
- Owner: pkarw

## Overview

### Goal

Add the provided YouTube video thumbnail link to the main `README.md`, placed directly above the `## 🛠️ Local development` section.

### Scope

- `README.md` only — insert the markdown snippet supplied in the brief:
  `[![Watch on YouTube](https://img.youtube.com/vi/zPNW-xtwNsE/maxresdefault.jpg)](https://www.youtube.com/watch?v=zPNW-xtwNsE)`

### Non-goals

- No other README restructuring or copy edits.
- No changes to skills, scripts, or docs beyond the README.

### External References

- None (`--skill-url` not provided).

## Implementation Plan

### Phase 1: README update

- 1.1 Insert the YouTube thumbnail link into `README.md` above the `## 🛠️ Local development` heading.

### Phase 2: Validation

- 2.1 Run the validation gate (`bash scripts/lint.sh`) and re-read the diff.

## Risks

- Docs-only change; the main risk is markdown rendering placement. Mitigated by re-reading the rendered diff. The thumbnail URL (`maxresdefault.jpg`) is served by YouTube for the given video id; if the video were removed the image would 404, which is acceptable for a README link.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: README update

- [x] 1.1 Insert YouTube thumbnail link above Local development section — 57ad0c7

### Phase 2: Validation

- [ ] 2.1 Run validation gate and re-read diff
