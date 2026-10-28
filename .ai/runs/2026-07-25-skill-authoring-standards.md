# Execution plan — codify skill coding standards in AGENTS.md & CODE_REVIEW.md

## Overview

Make the collection's three implicit skill-authoring standards — **token economy
via granulation into `references/`**, **coherent communication templates**, and
**consistent emoji-glossary usage** — explicit, scannable, and reviewer-enforced,
so every new skill builder follows them and every reviewer checks them.

The standards already exist but are scattered: the layering philosophy lives in
`skills/om-create-skill/references/philosophy.md`, the emoji glossary and
reporting style are duplicated verbatim into all 30 skills' `references/rules.md`,
and AGENTS.md buries them inside two ~400-word Cross-skill-contract paragraphs
(§3 communication, §5 layering). `CODE_REVIEW.md` has **no** checkpoint for any of
the three — a reviewer using it today cannot fail a bloated body, a terse report,
or a drifted glossary.

This run adds a crisp, checkable **"Skill authoring standards"** section to
AGENTS.md that distills the three standards and points to the canonical sources
(no re-explaining), and adds matching **review checks + severity guidance** to
CODE_REVIEW.md so the review gate enforces them.

### Goal

One sentence: turn the collection's token-economy, communication-template, and
emoji-glossary conventions into explicit followable rules in AGENTS.md and
matching enforceable checks in CODE_REVIEW.md.

### Scope

- `AGENTS.md` — add a scannable "Skill authoring standards" section (token
  economy / communication templates / emoji glossary) with pointers to the
  canonical sources; keep it distillation + pointers, not duplication.
- `CODE_REVIEW.md` — add review priorities and repo-specific checks for the three
  standards, plus severity guidance for each.

### Non-goals

- No changes to any `skills/**` content — the per-skill `rules.md`, `philosophy.md`,
  and `gates.md` already hold the canonical text; this run only makes the top-level
  docs point at and enforce them.
- No changes to `scripts/lint.sh` (these standards are review-enforced, not
  greppable) or `.ai/agentic.config.json`.
- No emoji-glossary content change — the canonical line stays verbatim.

### Risks

- **Duplication drift.** Restating the emoji glossary or philosophy in AGENTS.md
  would create a second source that drifts from the 30 `rules.md` copies.
  Mitigation: AGENTS.md references the canonical location and reproduces only the
  one glossary line already mirrored everywhere, marked as canonical.
- **Over-prescription.** Adding rules that contradict the existing "don't
  over-split" guidance. Mitigation: mirror `philosophy.md`'s own guardrails
  (skills under ~150 lines stay whole; don't split finer than the terrain).

## Progress

PR: #61

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: AGENTS.md authoring standards

- [x] 1.1 Add "Skill authoring standards" section (token economy, communication templates, emoji glossary) with canonical pointers — 0353c9b

### Phase 2: CODE_REVIEW.md enforcement

- [x] 2.1 Add review priorities + repo-specific checks + severity guidance for the three standards — 71a4bc6

### Phase 3: Validation & self-review

- [x] 3.1 Run the lint gate, breaking-change/self review, confirm docs-only scope — 2ef2505
