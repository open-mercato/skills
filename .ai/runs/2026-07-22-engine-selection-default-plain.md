# Execution plan: default the implementation engine to plain, gate the loop behind >20 steps or --loop

## Goal

`om-auto-implement-spec` (and the chains that route through it) should pick the cheap plain engines (`om-auto-create-pr` / `om-auto-continue-pr`) by default. The expensive loop engines (`om-auto-create-pr-loop` / `om-auto-continue-pr-loop`) are selected only when the spec's implementation plan has **more than 20 steps** or the caller explicitly passes a new **`--loop`** flag.

## Scope

- `skills/om-auto-implement-spec/references/engine-selection.md` — replace the fuzzy "roughly >8–10 phases/steps, UI work, unlikely to finish in one pass" heuristic with the deterministic rule: plain unless total Steps > 20 or `--loop`.
- `skills/om-auto-implement-spec/SKILL.md` — add the `--loop` argument; align step 2 (both engine branches) and the Chaining note with the new rule.
- `skills/om-auto-fix-issue/SKILL.md` + `references/feature-route.md` — the feature route delegates to `om-auto-implement-spec` and restates the loop criteria; align the wording and pass `--loop` through.

## Non-goals

- No behavior change inside the four engine skills themselves.
- No change to the loop skills' internal Simple-run/Spec-implementation-run classification.
- No tracker descriptor changes.

## Risks

- Consumers outside this repo may cite the old ">8–10" heuristic in local overrides; the rule change is documented in the PR body (no UPGRADE_NOTES entry — no descriptor/config contract changes).

## Implementation Plan

### Phase 1: Core rule

- 1.1 Rewrite `engine-selection.md`: plain engine is the default; loop only when the plan's total Step count exceeds 20 or `--loop` was passed; keep the create-vs-continue axis unchanged.
- 1.2 Update `om-auto-implement-spec/SKILL.md`: add `--loop` to Arguments, rewrite step 2's engine-choice wording on both branches, fix the Chaining parenthetical.

### Phase 2: Consumer alignment

- 2.1 Update `om-auto-fix-issue`: `--loop` pass-through in Arguments, feature-route.md wording aligned to the new rule.

### Phase 3: Gate

- 3.1 Run `bash scripts/lint.sh`, self-review the diff, fix findings.

## Progress

PR: #47

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Core rule

- [x] 1.1 Rewrite engine-selection.md with the deterministic plain-default rule — 86011f3
- [x] 1.2 Add --loop and align om-auto-implement-spec SKILL.md step 2 — 86011f3

### Phase 2: Consumer alignment

- [x] 2.1 Align om-auto-fix-issue arguments and feature-route wording — b4c1665

### Phase 3: Gate

- [x] 3.1 Lint gate + self-review — b4c1665
