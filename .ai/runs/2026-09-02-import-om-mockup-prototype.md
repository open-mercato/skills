# Run: import-om-mockup-prototype

Source doc: `.ai/specs/2026-08-26-interactive-prototype-skill.md` (merged via #91); this run executes its **Phase 2 — Add the skill here** (steps 8–14). Subject issue: #104. Import source: branch `feat/om-mockup-prototype-decouple` of the upstream monorepo (its Phase 1 PR is open, CI-green, awaiting review) — **not** upstream `main`, which still carries the coupled version. This PR is therefore `blocked` / do-not-merge until the upstream Phase 1 PR merges and the import is re-verified against the merged commit.

## Goal

Add `skills/om-mockup-prototype` — the interactive prototype skill with the anchored-comment engine — to this collection, product-agnostic and lint-clean, with the roster, standard references, docs, and the new screen-anatomy override scaffolding the spec's step 13 defines.

## Scope

- `skills/om-mockup-prototype/**` (new)
- `skills/om-setup-agent-pipeline/references/skill-coverage.md` (roster line)
- `docs/skills/om-mockup-prototype.md`, `docs/skills/README.md` (if it indexes skills), `README.md`, `docs/roles/designer.md`, `DECISIONS.md`, `CHANGELOG.md`

Non-goals: no changes to any other skill's content; no tracker operations added to the imported skill (it produces a directory, not a PR); no Phase 3 work (upstream consuming the installed skill).

## Implementation Plan

### Phase 1: Import and gates (spec steps 8–10)

1.1 Import the decoupled skill (SKILL.md, scripts, references/assets, snapshot, screen-patterns source) from the upstream Phase 1 branch; clear the content gate: remove every forbidden-pattern hit (product name incl. the brand block in the page template, scoped packages, monorepo paths, bare base-branch word), drop the dangling `om-ds-mockup` cross-skill pointer, adopt the question-based scope boundary decided on #91 ("does this flow make sense" here; "is this screen faithful to the system" routes to a design-system composer where one exists).
1.2 Add the roster entry in `om-setup-agent-pipeline/references/skill-coverage.md` so the roster-sync gate passes.
1.3 Add `references/agentic-setup.md`, `references/rules.md`, `references/report-templates.md` tailored from the canonical copies to the steps this skill actually performs (no tracker operations; hand-off report only).

### Phase 2: Contract shape (spec steps 11–13)

2.1 Restructure SKILL.md into `## Arguments` / `## Workflow` / `## Rules` (+ Security boundaries), second person, within frontmatter and body budgets.
2.2 Ship the default token snapshot in `references/` with provenance documented in product-agnostic terms; verify initialization in a repository with no design system produces a rendering prototype whose header states the bundled source.
2.3 Ship `references/screen-anatomy-template.md` (derived from the upstream anatomy reference with product specifics stripped) plus init scaffolding: when the repo-local override (`.ai/skills/om-mockup-prototype/references/screen-patterns.md`) is missing, copy the template there, pre-filled from the `om-ux-setup` contract (`.uxproof/`) when present; the hand-off names the anatomy source used. Verify both branches (override created; source named).

### Phase 3: Documentation (spec step 14)

3.1 `docs/skills/om-mockup-prototype.md`; README rows (interactive skills + designer table); `docs/roles/designer.md` row and tip; dated `DECISIONS.md` entry framed as extending the UX layer from #57; `CHANGELOG.md` entry. Verify lint passes and every cross-reference resolves.

## Risks

- The import source is an unmerged upstream branch: if Phase 1 review changes those files, this PR must re-import before merge. Mitigated by the `blocked` label, the do-not-merge note, and a recorded source commit SHA to diff against the merged commit.
- The lint's product-agnosticism grep scans every file under `skills/`, including JSON and JS assets; a missed token in a large asset fails CI. Mitigated by running `bash scripts/lint.sh` after each phase.
- Step 13 is new behavior (not decoupled behavior): the override scaffolding must not break the upstream flow when Phase 3 later points the monorepo at this copy; the template stays inert unless the override file is missing.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Import and gates

- [ ] 1.1 Import decoupled skill and clear the content gate
- [ ] 1.2 Roster entry
- [ ] 1.3 Standard reference files tailored from canonical copies

### Phase 2: Contract shape

- [ ] 2.1 SKILL.md restructured into Arguments/Workflow/Rules
- [ ] 2.2 Default token snapshot with product-agnostic provenance
- [ ] 2.3 Screen-anatomy template and override scaffolding

### Phase 3: Documentation

- [ ] 3.1 Docs, roster tables, DECISIONS and CHANGELOG entries
