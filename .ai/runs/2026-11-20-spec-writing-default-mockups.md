# Spec writing: clickable mockups by default for UI features

## Goal

Every feature spec that adds or changes a user-facing UI ships with a clickable low-fi prototype built by `om-mockup-prototype`, linked from the spec's `Prototype:` line — unless the user opts out (`--no-mockup` / `--no-mockups`, or an explicit request in their own words) or already supplied the mockups/designs. Specs without any UI (API, backend, fix, refactor, infra) skip the step. `om-auto-write-spec` (and everything that delegates to it: `om-auto-fix-issue`'s feature route, `om-prepare-issue`, `om-auto-manage-issues --write-missing-specs`) inherits the behavior through `om-spec-writing --autonomous`.

## Scope

- `om-mockup-prototype`: a spec-driven input (`--spec <path>`) and an `--autonomous` mode usable only by a spec-writing caller, with the boundary confirmation replaced by recorded `[ASSUMPTION]`s. Output under `${PROTOTYPES_DIR}/specs/<slug>/revision-NNN/`. The discovery mode is unchanged.
- `om-spec-writing`: new `--no-mockup` (alias `--no-mockups`) argument and a new "Mockup prototype" workflow step after Design; skip rules; graceful degradation when `om-mockup-prototype` is not installed.
- `om-auto-write-spec`: forward the opt-out flag, reuse the prototype (its browser evidence) as the proposed-UI visuals, keep static HTML mockups only as the fallback.
- Docs: `docs/skills/*.md` for the three skills, `UPGRADE_NOTES.md`, `DECISIONS.md`.

## Non-goals

- Changing the discovery flow of `om-mockup-prototype` (brief + panel), its output markers, or its manifest format name.
- Mockups for non-UI specs.
- Detailed visual design or design-system styling (prototypes stay neutral low-fi).

## Implementation Plan

### Phase 1: om-mockup-prototype spec mode

1. Add `--spec` and `--autonomous` to `om-mockup-prototype` (SKILL.md, agentic-setup, prototype-format, rules).

### Phase 2: om-spec-writing default mockups

1. Add the `--no-mockup` argument, the mockup step and its `references/mockups.md`.

### Phase 3: om-auto-write-spec consumes the prototype

1. Forward the opt-out flag and reuse the prototype as proposed-UI evidence.

### Phase 4: Documentation

1. Update docs pages, `UPGRADE_NOTES.md`, `DECISIONS.md`.

## Risks

- `om-mockup-prototype` was interactive-only by decision; the new `--autonomous` mode is restricted to spec-writing callers and still never decides business policy — every unresolved choice is an `[ASSUMPTION]` surfaced in the spec's Resolved assumptions.
- Generated mockups are linked as `Proposed prototype:`, never `Prototype:` — main reserves `Prototype:` for owner-accepted designs.
- Prototype generation adds tokens/time to every UI spec; the opt-out flag and the no-UI skip bound it.

## Progress

PR: #195

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: om-mockup-prototype spec mode

- [x] 1.1 Add spec-driven and autonomous modes to om-mockup-prototype — 1f30692

### Phase 2: om-spec-writing default mockups

- [x] 2.1 Add the default mockup step to om-spec-writing — d1ea498

### Phase 3: om-auto-write-spec consumes the prototype

- [x] 3.1 Forward the opt-out and reuse the prototype in om-auto-write-spec — 2ff2870

### Phase 4: Documentation

- [x] 4.1 Update docs, upgrade notes and decisions — fa698ae

### Review fixes

- [x] R.1 Apply om-auto-review-pr findings — 060ea8e, 447efed
