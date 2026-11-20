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

- `baseBranch` is `"auto"`, which resolves to the tracker's default branch (`main`) through **default-branch**.
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

### Phase 4: Scope added mid-run by the user

1. Add the `automerge-signal-3-passes-local-ci-checks` signal, which the buddy accepts as an alternative to host CI.
2. Add `--automerge-force` / the `automerge-force` label: a direct merge that bypasses host requirements when the user has the rights.
3. Add automerge and automerge-force modes to `om-auto-fix-pr`, enabled by flags or PR labels.
4. Human QA verdicts drop `needs-qa`, and autofix fixes QA findings (review-pr, fix-pr, merge-buddy).
5. Re-run the full validation gate and a fresh review.

## Progress

PR: #194

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: om-auto-fix-issue automerge mode

- [x] 1.1 Add the argument, activation and step wiring in SKILL.md — 48959cc
- [x] 1.2 Add references/automerge-mode.md — 48959cc
- [x] 1.3 Update the report template and rules — 5764303

### Phase 2: Contract consumers

- [x] 2.1 Update merge-buddy so it accepts the seeded signal record — f8ff112
- [x] 2.2 Update the SDLC.md label ownership text — f8ff112

### Phase 3: Validation

- [x] 3.1 Run the full validation gate — 5764303

### Phase 4: Scope added mid-run by the user

- [x] 4.1 Add local-CI signal 3 alternative — 144f6da
- [x] 4.2 Add automerge-force direct merge with bypass — 144f6da
- [x] 4.3 Add om-auto-fix-pr automerge modes — 4bedc7c
- [x] 4.4 Human QA verdicts drop needs-qa; autofix fixes QA findings — 7bfdbc5
- [ ] 4.5 Re-run full gate and fresh review
