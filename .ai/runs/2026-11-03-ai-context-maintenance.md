# AI context maintenance skill

## Goal
Add `om-ai-context-maintenance` to archive old run artifacts as verified `.tgz` files alongside the remaining unpacked runs.

## Scope
A standalone skill, deterministic archive helper and regression tests, discovery/catalog entries, and the coverage roster. Default retention is 14 UTC calendar days; CLI parameters and the same-name repo-local override configure retention and exclusions, and existing `paths.runs` selects the run root.

## Non-goals
Do not rotate this repository's actual runs, change resume parsers, schedule maintenance, delete existing archives, or change shared pipeline formats/configuration.

## Implementation Plan

### Phase 1: Skill and archival behavior
1.1 Author the skill and safe archive helper with retention, preview, active-run exclusions, verification, and recovery guidance.
1.2 Add isolated regression tests for retention, archive round trips, safety failures and repeat runs.

### Phase 2: Integration and verification
2.1 Register the skill in the coverage roster and user-facing catalogs.
2.2 Run the full validation gate and authoritative PR review, address findings, and finalize the ready PR.

## Risks
Archiving removes unpacked paths, so active/uncertain runs and open-PR artifacts must stay unpacked. Archive publication and source deletion require verified bytes and quiescent writers. Existing readers do not search compressed runs; restoration is explicit. No existing shared reference content is changed.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Skill and archival behavior

- [x] 1.1 Author the skill and safe archive helper — 459dbdd
- [x] 1.2 Add isolated archival regression tests — 459dbdd

### Phase 2: Integration and verification

- [ ] 2.1 Register the skill in discovery catalogs
- [ ] 2.2 Validate, review, and finalize the PR
