# Execution plan: om-help redesign around SDLC.md + a slim flow map

## Goal

Rework `skills/om-help/` so it routes correctly across the ~60-skill collection by reading `SDLC.md`'s Ticket lifecycle "Driven by" column as the primary routing source, falling back to a new, slim `references/flow-map.md` for what SDLC structurally cannot carry (chain-only skills, near-duplicate deciding criteria, and layers outside the ticket lifecycle). Ship as one **draft** PR per the operator's override (this draft is draft by intent; the operator reviews before marking it ready).

## Scope

- `skills/om-help/SKILL.md` and every file in `skills/om-help/references/`.
- `DECISIONS.md` (D2 entry), `BACKWARD_COMPATIBILITY.md` (D4 — protect om-help's `Next:` line), `scripts/lint.sh` (D3 — coverage-roster-style gate), `docs/skills/om-help.md`, the om-help row in the root `README.md`.
- One issue filed via `om-prepare-issue` for the missing Spec stage (D5) — tracker-only, no repo files.

## Non-goals

- `docs/skills/README.md` index gaps, drift in other skills' content, and `skills/om-setup-agent-pipeline/references/sdlc-template.md` itself (D6).
- Implementing the missing Spec stage — filed as a separate issue (D5), never built here.
- Flipping the PR to ready, or promoting it during the review pass — stays draft by operator instruction.

## Assumptions (autonomous calls, no user available to ask)

1. Verified all "Background facts" against `fc77110`/current HEAD via direct reads + an Explore agent; a few details drifted (see below) and the plan adapts to the verified state, not the brief's snapshot.
2. `docs/skills/README.md`'s skill-cards index has **no** om-help row at all (it's missing ~16 current skills, not just om-help) — out of scope per D6; only the root `README.md` row (line ~167) is in scope.
3. D3's coverage check compares every `skills/*` directory name against the union of `skills/om-setup-agent-pipeline/references/sdlc-template.md` and the new `skills/om-help/references/flow-map.md` (not the root `SDLC.md`, which is a generated, potentially-stale instance) — this is the stable, always-present source the lint gate can check in CI.
4. `flow-map.md` must therefore name every one of the 25 skills not mentioned in `sdlc-template.md` (computed via `comm`): `om-app-spec-writing`, `om-apply-upgrade-notes`, `om-auto-audit-dependencies`, `om-auto-continue-pr-loop`, `om-auto-create-pr-loop`, `om-auto-fix-pr`, `om-auto-implement-spec`, `om-auto-qa-scenarios`, `om-auto-sec-report`, `om-auto-sec-report-pr`, `om-create-agents-md`, `om-create-skill`, `om-eject-and-customize`, `om-evolve-harness`, `om-figma-design-with-ds`, `om-framework-context`, `om-gap-analysis`, `om-help`, `om-judge-agent-session`, `om-pr-autopilot`, `om-pre-implement-spec`, `om-qa-buddy`, `om-share-this-session`, `om-smart-test`, `om-troubleshooter`.
5. D5 issue: search for a credible duplicate first; file fresh only if none exists, category `documentation`, no spec, `--no-spec` passed to `om-prepare-issue` (process/doc change, no spec authority needed beyond this PR + SDLC.md itself).
6. No real user is present to answer om-help's own "ask at most one question" step during this design work — every design choice is made and recorded here instead.

## Risks

- Changing `scripts/lint.sh`'s gate affects every future skill PR (documented in the PR body per the brief).
- `references/rules.md` and `references/report-templates.md`/`agentic-setup.md` realignment only touches om-help's own copies (Cross-skill contract §5 sync question is deferred to the PR body as an open question for the operator, never answered unilaterally here).

## Implementation Plan

### Phase 1: New reference files — flow-map.md and setup-state.md

- [ ] 1.1 Write `skills/om-help/references/flow-map.md` (sections a/b/c; must cover all 25 skills from Assumption 4)
- [ ] 1.2 Write `skills/om-help/references/setup-state.md` (probe matrix + context-vs-blocker rule)

### Phase 2: Rewrite context-signals.md and routing-sources.md

- [ ] 2.1 Update `skills/om-help/references/context-signals.md` (SPECS_DIR classification, autopilot boundary, fixed rows, new delivery shapes, PR fields)
- [ ] 2.2 Update `skills/om-help/references/routing-sources.md` (SDLC.md source + precedence order, new drift rows, no-Task-Router route, honest help.data wording)

### Phase 3: om-help's own SKILL.md, agentic-setup.md, rules.md, report-templates.md

- [ ] 3.1 Rewrite `skills/om-help/SKILL.md` (new workflow, D2 wording, description mentioning SDLC.md)
- [ ] 3.2 Update `skills/om-help/references/agentic-setup.md` (report missing tracker descriptor, read extra setup-state keys, knowledge-route consistency)
- [ ] 3.3 Realign `skills/om-help/references/rules.md` (move om-help specifics out of shared bullets, restore Label commentary + One explanation bullets)
- [ ] 3.4 Update `skills/om-help/references/report-templates.md` (prerequisite line, interactive/autonomous marker, flags rule, setup-question shape)
- [ ] 3.5 Review `skills/om-help/references/skill-discovery.md` for needed changes (expected: none beyond step renumbering in SKILL.md)

### Phase 4: Outside-the-skill files

- [ ] 4.1 `DECISIONS.md` — dated D2 entry (no-catalog → no-memory, alternatives rejected)
- [ ] 4.2 `BACKWARD_COMPATIBILITY.md` — protect om-help's `Next:` line (D4)
- [ ] 4.3 `scripts/lint.sh` — coverage gate (D3)
- [ ] 4.4 `docs/skills/om-help.md` — fix staleness (SKILLS_ROOT, knowledge.sources default, om-framework-context)
- [ ] 4.5 Root `README.md` — refresh the om-help row

### Phase 5: D5 issue

- [ ] 5.1 Run `om-prepare-issue` once for the missing Spec stage issue; link it from the PR

### Phase 6: Validation, acceptance walkthrough, review

- [ ] 6.1 Full validation gate green
- [ ] 6.2 Acceptance-scenario table (paper walkthrough, in PR body)
- [ ] 6.3 `om-auto-review-pr --autofix` pass; PR stays draft

## Progress

PR: #156

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: New reference files — flow-map.md and setup-state.md

- [x] 1.1 Write `skills/om-help/references/flow-map.md` — a8fe0a3
- [x] 1.2 Write `skills/om-help/references/setup-state.md` — a8fe0a3

### Phase 2: Rewrite context-signals.md and routing-sources.md

- [x] 2.1 Update `skills/om-help/references/context-signals.md` — ff3aa8b
- [x] 2.2 Update `skills/om-help/references/routing-sources.md` — ff3aa8b

### Phase 3: om-help's own SKILL.md, agentic-setup.md, rules.md, report-templates.md

- [x] 3.1 Rewrite `skills/om-help/SKILL.md` — 3fcb51e
- [x] 3.2 Update `skills/om-help/references/agentic-setup.md` — 3fcb51e
- [x] 3.3 Realign `skills/om-help/references/rules.md` — 3fcb51e
- [x] 3.4 Update `skills/om-help/references/report-templates.md` — 3fcb51e
- [x] 3.5 Review `skills/om-help/references/skill-discovery.md` — 3fcb51e (step-number fix only)

### Phase 4: Outside-the-skill files

- [x] 4.1 `DECISIONS.md` — 5792ce2
- [x] 4.2 `BACKWARD_COMPATIBILITY.md` — 5792ce2
- [x] 4.3 `scripts/lint.sh` — 5792ce2
- [x] 4.4 `docs/skills/om-help.md` — 5db1640
- [x] 4.5 Root `README.md` — 5db1640

### Phase 5: D5 issue

- [x] 5.1 File the Spec-stage issue via `om-prepare-issue` — issue #157 (tracker-only, no commit)

### Phase 6: Validation, acceptance walkthrough, review

- [x] 6.1 Full validation gate green (two pre-existing, unrelated failures documented in the PR body)
- [x] 6.2 Acceptance-scenario table in PR body
- [x] 6.3 Self code-review pass — findings fixed in 88422df; PR stays draft per the operator override
