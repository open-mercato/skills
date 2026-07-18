# Execution Plan: add `om-auto-implement-issue` skill + FR routing in `om-auto-fix-issue`

## Goal

Add a new skill `om-auto-implement-issue` that implements a **feature request (FR)** issue end to end by combining `om-spec-writing` and `om-auto-create-pr`: it first lands a spec on a PR, then implements that spec on the same branch. Modify `om-auto-fix-issue` so an FR issue is routed to the new skill (write a spec + implement) instead of the bug-confirmation autofix chain — after checking the feature is not already implemented.

## Scope

- **New skill** `skills/om-auto-implement-issue/` — a router `SKILL.md` plus `references/` (FR triage gate, spec-first flow, PR linkage), reusing the `om-auto-create-pr` worktree/validation/label/review machinery and the `om-spec-writing` process.
- **Modify** `skills/om-auto-fix-issue/SKILL.md` — add an issue-classification step that delegates FRs to `om-auto-implement-issue` and keeps bugs on the existing chain; update the frontmatter description accordingly.
- **Docs** — README skill table + one-line `DECISIONS.md` entry.

## Non-goals

- No changes to `om-spec-writing`, `om-auto-create-pr`, or the tracker descriptor themselves — the new skill delegates to them unchanged.
- No new tracker operations; only existing named operations are used.
- Not implementing any actual FR — this run only ships the skills.

## Risks

- Lint gate is strict (product-agnostic tokens, no direct tracker CLI, frontmatter name==dir). Mitigate by reusing shared boilerplate verbatim and running `scripts/lint.sh` before the PR.
- Routing ambiguity between bug vs FR in `om-auto-fix-issue`. Mitigate with an explicit, conservative classifier (label-first, then title/body signal) that defaults to the existing bug chain when unsure.

Source doc: none (meta-skill authoring; the new skill's own spec-writing step is the design surface for FRs it later handles).

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Author `om-auto-implement-issue`

- [ ] 1.1 Write `skills/om-auto-implement-issue/SKILL.md` router body
- [ ] 1.2 Write `references/fr-triage.md` (FR-vs-bug + not-already-implemented gate)
- [ ] 1.3 Write `references/spec-first-flow.md` (spec → first commit → draft PR)
- [ ] 1.4 Write `references/pr-linkage.md` (PR body, Closes/Source doc, labels)

### Phase 2: Route FRs from `om-auto-fix-issue`

- [ ] 2.1 Add issue-classification + FR delegation step to `om-auto-fix-issue`
- [ ] 2.2 Update `om-auto-fix-issue` frontmatter description and Rules

### Phase 3: Spec-when-missing in `om-prepare-issue`

- [ ] 3.1 Add "write + PR a spec via om-spec-writing when none found (repo or open PRs)" branch to `om-prepare-issue`

### Phase 4: Docs + gate

- [ ] 4.1 Update README skill table and DECISIONS.md
- [ ] 4.2 Run `scripts/lint.sh` and self code-review
