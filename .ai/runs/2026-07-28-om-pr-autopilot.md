# Add om-pr-autopilot, the PR dispatcher skill

## Overview

Goal: give the collection one entry point that takes an open PR, works out what state it is actually in, and runs the matching chain of existing `om-*` skills — so an operator no longer has to know which engine a PR needs before invoking one.

## Scope

- A new `skills/om-pr-autopilot/` skill: thin router body plus references for the diagnosis signals, the state matrix, and the report templates, with its own copies of the standard step files per the cross-skill contract.
- Registration across the repository: roster, README catalog and counts, `AGENTS.md` count, the per-skill card, the docs index, the role doc, `UPGRADE_NOTES.md`, and `DECISIONS.md`.
- Address the review on PR #65 and reconcile the branch with a `main` that advanced by three skills while the PR was open.

## Non-goals

- Do not re-implement any engine's logic in the dispatcher; every fix, review, CI repair, QA capture, and merge stays with the delegated skill.
- Do not modify an existing skill's behavior — the only edit to an existing skill is the roster line the lint gate requires.
- Do not merge implicitly, apply a QA-approval label, or weaken the QA gate.

## Implementation Plan

### Phase 1: The skill

1. Author `SKILL.md` (the numbered diagnose → classify → chain → report algorithm) and the `references/` set.
2. Register the skill: roster entry, README catalog rows, the per-skill card.

### Phase 2: Review follow-up (PR #65)

1. Reconcile with the advanced `main` and resolve the roster conflict.
2. Major 1 — finish registration: skill counts and the `docs/skills/README.md` index row.
3. Major 2 — drop `om-merge-buddy` from the companion list; it is never dispatched.
4. Major 3 — give state-matrix row 4 the authorship guard row 5 already has, and separate `PUSHABLE` (mechanism) from authorship (permission) in the notes.
5. Minors and nits — the unresolved-conversation fallback, the card's `Required` column, `UPGRADE_NOTES.md` and `DECISIONS.md` entries with the naming carve-out, the release-manager role row, the `--dry-run` reporting clause, and the unattended no-`{prNumber}` stop.
6. Run the full validation gate and re-review the diff.

## Risks

- The dispatcher overlaps `om-auto-fix-pr`, which already contains review + CI + QA; the matrix must skip those rows after re-diagnosis rather than run them twice.
- A row that puts commits on a head branch can reach another author's PR if it tests push access instead of authorship — the failure the review caught in row 4.
- Skill counts drift whenever `main` gains a skill in parallel; they are verified against `ls -d skills/*/` after the base merge, not carried over from the review text.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: The skill

- [x] 1.1 Author SKILL.md and the references set — 00d6b55
- [x] 1.2 Register the skill (roster, README catalog, card) — 00d6b55

### Phase 2: Review follow-up (PR #65)

- [x] 2.1 Reconcile with the advanced main and resolve the roster conflict — 203c612
- [x] 2.2 Major 1 — skill counts and the docs index row — 677a313
- [x] 2.3 Major 2 — drop om-merge-buddy from the companion list — 677a313
- [x] 2.4 Major 3 — authorship guard on state-matrix row 4 — 677a313
- [x] 2.5 Minors and nits — 677a313
- [x] 2.6 Full validation gate and diff re-review — 677a313, self-review follow-up 57fd9d3

## External References

None. The review on PR #65 is the only input beyond the repository's own contracts.
