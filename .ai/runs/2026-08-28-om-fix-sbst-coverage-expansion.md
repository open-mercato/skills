# Execution plan: optional SBST/CodaMosa coverage expansion for om-fix

Source doc: .ai/specs/2026-08-28-om-fix-sbst-coverage-expansion.md (from PR #93, not yet merged to main)

## 🎯 Goal
Add an entirely optional, config-gated `sbst` step to `om-fix` (runs the operator's own configured coverage-expansion command after a fix is verified green, never a hardcoded tool) and extend `om-setup-agent-pipeline`'s setup interview to offer wiring it up when it detects a coverage-expansion tool already installed in the target repo.

## Scope
- `skills/om-fix/SKILL.md` — one new optional step + step-0 this-skill-uses line.
- `skills/om-fix/references/regression-gate.md` — new "SBST expansion" section (create the file with minimal structure if it doesn't exist yet on this branch — the sibling PR #94 that introduces it is not yet merged).
- `skills/om-fix/references/agentic-setup.md` — this-skill-uses list gains `sbst.enabled`/`sbst.commands`.
- `skills/om-setup-agent-pipeline/SKILL.md` — minimal body additions only (tight budget, see Risks): `"sbst": null` in the example config, one field-reference bullet, one clause on the detection step.
- `skills/om-setup-agent-pipeline/references/interview-questions.md` — one new conditional question.
- `skills/om-setup-agent-pipeline/references/sbst.md` — new file, the full contract.
- `README.md` — document the `sbst` config block.
- `UPGRADE_NOTES.md` — new entry.

## Non-goals
- The mandatory differential Red/Green gate — that's the sibling spec/PR #94, already shipped separately.
- Installing or bundling any SBST tool — this only wires up one the operator already has.
- A `seedsDir` config key or singular `command` field — this spec deliberately keeps `commands` (array, mirrors `validation.commands`) and a fixed seed-path convention, per its Revision note.

## Risks
- `skills/om-setup-agent-pipeline/SKILL.md`'s body was already 19,759/20,000 chars before this PR (not ~19,630 as originally estimated) — very little headroom. Every body addition there must be a bare pointer into the new `references/sbst.md`; if `bash scripts/lint.sh` fails on budget, compress existing prose in that file rather than cutting the addition. Post-review-fix: 19,983/20,000 — still critically tight; a follow-up to decompose this file's body into `references/` is recommended but out of scope for this PR.
- This run's worktree is fresh off `origin/main`, which does not yet contain PR #94's `regression-gate.md` (not merged) — Implementation Plan step 1 below creates the file fresh rather than assuming it exists.

## Implementation Plan

### Phase 1: om-fix side

- 1.1 Create/extend `skills/om-fix/references/regression-gate.md` with an "SBST expansion" section
- 1.2 Add the new optional step to `skills/om-fix/SKILL.md` + step-0 this-skill-uses line
- 1.3 Update `skills/om-fix/references/agentic-setup.md`'s this-skill-uses list

### Phase 2: om-setup-agent-pipeline side

- 2.1 Write `skills/om-setup-agent-pipeline/references/sbst.md`
- 2.2 Add the conditional `sbst` question to `skills/om-setup-agent-pipeline/references/interview-questions.md`
- 2.3 Minimal `skills/om-setup-agent-pipeline/SKILL.md` body edits (config example, field-reference bullet, detection-step clause)

### Phase 3: Docs and gate

- 3.1 Document the `sbst` config block in `README.md`
- 3.2 Add the `UPGRADE_NOTES.md` entry
- 3.3 Full validation gate (`bash scripts/lint.sh`)

## Progress

PR: #95

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: om-fix side

- [x] 1.1 Create/extend `skills/om-fix/references/regression-gate.md` with an "SBST expansion" section — a8f1a04
- [x] 1.2 Add the new optional step to `skills/om-fix/SKILL.md` + step-0 this-skill-uses line — b3bec77
- [x] 1.3 Update `skills/om-fix/references/agentic-setup.md`'s this-skill-uses list — b935fb7

### Phase 2: om-setup-agent-pipeline side

- [x] 2.1 Write `skills/om-setup-agent-pipeline/references/sbst.md` — 63320e7
- [x] 2.2 Add the conditional `sbst` question to `skills/om-setup-agent-pipeline/references/interview-questions.md` — 9306e02
- [x] 2.3 Minimal `skills/om-setup-agent-pipeline/SKILL.md` body edits — 9306e02 (body now 19,990/20,000 chars — lint passes but headroom is nearly gone; flagged in the PR)

### Phase 3: Docs and gate

- [x] 3.1 Document the `sbst` config block in `README.md` — 04ceeb2
- [x] 3.2 Add the `UPGRADE_NOTES.md` entry — de4263f
- [x] 3.3 Full validation gate (`bash scripts/lint.sh`) — PASS (Lint OK.)
