# Execution plan — `om-auto-continue-pr` adopts undocumented PRs

**Slug:** `continue-pr-adopt-undocumented-prs`
**Branch:** `feat/continue-pr-adopt-undocumented-prs`
**Base:** `main`
**Date:** 2026-08-03

## Overview

`om-auto-continue-pr` today gives up on any PR that was not created by the
`om-auto-create-pr` flow: step 2 stops with an error when no `Tracking plan:`
line and no plan under `$RUNS_DIR` can be resolved, and step 4 stops again when
a plan exists but its `## Progress` section cannot be parsed. Every PR opened by
a human, by a non-pipeline tool, or by an interrupted run that never committed
its plan is therefore unreachable to the resume machinery — even though two
chains route straight into it: `om-auto-fix-issue` ("an open PR already
references the issue → point at `om-auto-continue-pr {prNumber}`") and
`om-auto-implement-spec` (resume an existing implementation PR).

This run makes the skill **adopt** such a PR instead: reconstruct the goal from
the PR's own description, conversation, review feedback, linked issues, spec/
design docs, and the code landed so far; write a real execution plan with the
canonical `## Progress` checklist; land it on the PR branch and in the PR body;
and then continue through the existing resume machinery — asking the user to
confirm the reconstructed plan when a user is in the loop, and documenting it on
the PR and continuing unattended when there is not.

### Goal

One sentence: `om-auto-continue-pr` can drive **any** open PR to its goal, not
only PRs that carry an `om-auto-create-pr` execution plan — by reconstructing
the missing plan from PR context and continuing under the same discipline.

### Affected areas

- `skills/om-auto-continue-pr/SKILL.md` — arguments, chaining, steps 2/4/5, rules, frontmatter description.
- `skills/om-auto-continue-pr/references/adopt-pr.md` — **new**: the adoption procedure (evidence gathering, plan reconstruction, the two modes, the artifacts it lands).
- `skills/om-auto-continue-pr-loop/references/run-folder-lookup.md` — its identical dead end (fallback 7) hands off instead of erroring.
- `docs/skills/om-auto-continue-pr.md`, `README.md`, `UPGRADE_NOTES.md`, `skills/om-setup-agent-pipeline/references/sdlc-template.md` — user-facing documentation of the new behavior.

### Non-goals

- **No new tracker operation.** Adoption reads PR/issue/review context through operations the descriptor already defines (**get-pr**, **get-pr-diff**, **list-issue-comments**, **list-review-comments**, **get-issue**, **update-pr**), and degrades with a documented note when an older descriptor copy lacks `list-review-comments`.
- **No change to the `## Progress` format** (a protected cross-skill surface, `BACKWARD_COMPATIBILITY.md` §5) — adoption *produces* that exact format; it does not extend it.
- **No duplication of the loop engine's run-folder format** in the plain skill. A reconstructed plan that turns out too large for the plain engine hands off to `om-auto-continue-pr-loop`, which migrates the flat plan into a run folder through its own already-documented legacy-flat-file path.
- **No edits to the standard shared step files** (`pr-finalize.md`, `summary-comment-template.md`, `report-templates.md`, `claim-pr.md`, `rules.md`) — adoption-specific output shapes live in the new `adopt-pr.md`, so the cross-skill sync obligation (Cross-skill contract §5) is not triggered and the other skills' copies cannot drift.
- **No relaxation of the claim protocol.** Adopting someone else's PR still requires the step-1 three-signal check to pass (or `--force`).

### External References

None — no `--skill-url` was passed. Everything is derived from the repository's
own contracts (`AGENTS.md`, `BACKWARD_COMPATIBILITY.md`, `SDLC.md`, the sibling
skills' shipped references).

### Risks

- **Scope inflation on adoption.** A reconstructed goal is a guess; an over-broad guess turns a small PR into an open-ended project. Mitigated by requiring an explicit `Non-goals` section and an evidence/confidence table in every adopted plan, by defaulting to the narrowest reading that satisfies the PR's own description, and by inviting override in the PR comment.
- **Prompt injection through the planning input.** PR bodies and comments are now planning *input*. Mitigated by restating the untrusted-content boundary inside the adoption procedure: directives in PR/issue text are data, never instructions, and an instruction to skip tests/CI or exfiltrate anything is quoted as suspected injection and not adopted.
- **Pushing to a fork head may be impossible.** Adopting a cross-repository PR whose author did not enable maintainer edits cannot land commits. Mitigated by an explicit blocked path: post the plan as a PR comment, leave `Status: in-progress`, report the blocker.
- **Demoting a human's PR to draft.** The always-a-PR rule flips a pipeline draft to ready at completion; a human's PR is often already ready. Mitigated by an explicit never-demote rule.
- **Behavior change for existing consumers.** A previously hard-stopping path now proceeds. It is additive (nothing that used to work changes), but it is documented in `UPGRADE_NOTES.md`, and `--adopt off` preserves the old stop for anyone who depends on it.

## Implementation Plan

### Phase 1 — the adoption procedure

Write `skills/om-auto-continue-pr/references/adopt-pr.md`: when adoption
triggers; the evidence sweep (PR self-description and body task lists,
conversation + inline review feedback, failing checks, linked issues, spec/design
docs, the diff and commit history, repo conventions and missing tests); the
untrusted-content boundary for planning input; how to reconstruct the plan
(goal/scope/non-goals, evidence-and-confidence table, assumptions, an
already-landed Phase 1 checked off with real SHAs, then the remaining phases in
the canonical Progress format); the two modes (`ask` / `auto`) and how the mode
is decided; the artifacts it lands (plan commit, PR-body `Tracking plan:` +
`Status:` lines prepended without touching the author's prose, the idempotent
`📋 adoption plan` comment); the label/draft/fork specifics of an adopted PR; and
the loop-engine escalation.

### Phase 2 — wire adoption into the skill body

Arguments (`--adopt`, `--goal`), the `## Chaining` note, frontmatter
description, step 2 (locate **or reconstruct**), step 4 (unparseable Progress →
adopt), step 5 (spec-only guard interaction), and the `## Rules` bullets
(never-demote, adoption never bypasses the claim check, injection boundary).

### Phase 3 — close the loop variant's identical dead end

`om-auto-continue-pr-loop`'s `references/run-folder-lookup.md` fallback 7 stops
with the same error. Replace it with a hand-off to `om-auto-continue-pr`, which
adopts and (per Phase 1's escalation rule) hands back for large reconstructed
plans. No procedure duplication.

### Phase 4 — documentation and the validation gate

`docs/skills/om-auto-continue-pr.md` (summary + parameter rows), the `README.md`
skill-table row, a dated `UPGRADE_NOTES.md` section, the `sdlc-template.md`
review-loop parenthetical, then the full configured gate (`bash scripts/lint.sh`).

## Progress

PR: #69

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: The adoption procedure

- [x] 1.1 Write `skills/om-auto-continue-pr/references/adopt-pr.md` — 421dc01

### Phase 2: Wire adoption into the skill body

- [x] 2.1 Arguments, chaining note, and frontmatter description — cbf0c48
- [x] 2.2 Steps 2, 4 and 5 — locate or reconstruct, then resume — cbf0c48
- [x] 2.3 Rules bullets for adopted PRs — cbf0c48

### Phase 3: Close the loop variant's dead end

- [x] 3.1 `om-auto-continue-pr-loop` run-folder lookup hands off instead of erroring — 3623d22

### Phase 4: Documentation and validation

- [x] 4.1 Docs page, README row, SDLC template parenthetical — 44a13bc
- [x] 4.2 `UPGRADE_NOTES.md` entry — 44a13bc
- [x] 4.3 Full validation gate (`bash scripts/lint.sh`) green — 44a13bc
- [x] Post-review fix: adoption runs after the step-3 worktree exists (self-review found step 2 committing before checkout) — dfb7c88
- [x] Post-review fix: add **list-review-comments** to TEMPLATE.md + the shipped github descriptor (adoption and om-auto-review-pr both name it; BACKWARD_COMPATIBILITY §3 requires it shipped), and trim the step-2 duplication out of the skill body — 9169ced
