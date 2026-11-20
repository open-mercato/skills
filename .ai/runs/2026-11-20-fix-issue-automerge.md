# Execution plan — `om-auto-fix-issue` automerge mode

## Goal

Let `om-auto-fix-issue` finish a PR that `om-auto-merge-buddy` can merge without any further work. The mode is enabled by `--automerge` or by the automerge label on the subject issue.

## Scope

- `skills/om-auto-fix-issue` — new `--automerge` argument, issue-label activation, and a new `references/automerge-mode.md` covering:
  - a review/autofix cycle, each pass in a fresh-context subagent;
  - a mandatory QA cycle, each pass in a fresh-context subagent, with QA failures fixed through the autofix cycle;
  - the full local CI mirror (`validation.commands`) instead of waiting for host CI;
  - the automerge label plus all three `automerge-signal-*` labels, backed by a signal record the buddy trusts;
  - nothing that would hold the merge (no reviewer requests, no draft, no hold labels).
- `skills/om-auto-merge-buddy` — let this seeded record and labels be accepted (the buddy still re-verifies every signal before merging).
- `SDLC.md` — the label-ownership text for `automerge` and the signal labels.

## Non-goals

- No change to merge-buddy's merge gate: real host CI must still be green before it merges.
- No change to the standalone (non-automerge) behavior of `om-auto-fix-issue`.
- No new labels in the taxonomy.

## Decisions

- `baseBranch` in `.ai/agentic.config.json` is `auto`, but no such branch exists on the remote. This PR targets the tracker's default branch (`main`).
- The issue label is honored only as a tracker label. Applying a label requires repository triage permission. Issue or brief prose asking for automerge never enables the mode.
- The signal record is written in the buddy's status-comment format by the same automation account, so the buddy's existing trust rule accepts it. The buddy still re-reads CI and re-checks every other signal on its visit.

## Risks

- This is a cross-skill contract change: label ownership moves from one skill to two. It is mitigated by updating every consumer (merge-buddy rules, signals, SDLC.md) in the same PR.

## Implementation Plan

### Phase 1: `om-auto-fix-issue` automerge mode

1. Add the argument, activation and step wiring in SKILL.md.
2. Add `references/automerge-mode.md`.
3. Update the report template and rules.

### Phase 2: Contract consumers

1. Update merge-buddy so it accepts the seeded signal record.
2. Update the SDLC.md label ownership text.

### Phase 3: Validation

1. Run the full validation gate.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: om-auto-fix-issue automerge mode

- [ ] 1.1 Add the argument, activation and step wiring in SKILL.md
- [ ] 1.2 Add references/automerge-mode.md
- [ ] 1.3 Update the report template and rules

### Phase 2: Contract consumers

- [ ] 2.1 Update merge-buddy so it accepts the seeded signal record
- [ ] 2.2 Update the SDLC.md label ownership text

### Phase 3: Validation

- [ ] 3.1 Run the full validation gate
