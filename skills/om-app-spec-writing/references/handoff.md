# Phase 5 — Hand-off to `om-spec-writing`

The procedure `om-app-spec-writing` runs after Phase 4: confirm the App Spec, cut it into feature briefs, and hand each brief to `om-spec-writing`. The App Spec answers *what* and *why* for the whole app; `om-spec-writing` answers *how* for one independently deployable capability. This file is the contract between the two levels.

## 1. Confirm (hard stop)

Present the handoff summary from `references/report-templates.md` — workflows, stories, atomic commits per phase, challenger and checkpoint status, docs-only mappings still ungrounded, open blockers — and wait for the user's confirmation. A BLOCKER question in §10 whose phase is next stops the hand-off: resolve it first.

## 2. Decompose

Cut the App Spec into **feature specs, one independently deployable capability each** (test: would it function without the others?). Walk the phases of §7 in order; a phase usually yields one to three features. For each feature, record in the App Spec's Changelog and in the report table:

| Feature | Phase | Draws on | Gap (atomic commits) | Brief |
|---|---|---|---|---|
| {one-line goal} | {§7 phase} | {§1.3 terms, §1.4 entities, §2 personas, WF/US ids, §3.5 pages, §4.5 modules} | {sum from §4/§6} | {path, once written} |

A feature that would need stories from two phases is two features. A shared module proposed in §4.5 is its own feature, ordered before its first consumer.

## 3. Write one brief per feature

Path: `${SPECS_DIR}/briefs/{YYYY-MM-DD}-{app-slug}-{feature-slug}.md` (kebab-case, no spaces). The shape keeps the headings `om-spec-writing` reads from a `— brief: <path>` handoff (the same headings `om-brainstorm` writes), so no change on the receiving side is needed:

```markdown
# {one-line feature goal}

- Date: {YYYY-MM-DD}
- Category: feature
- Priority signal: {low | medium | high | extreme} — {from the §7 phase order and business priority}
- Risk signal: {low | medium | high} — {from the gap score and upstream dependencies}
- Routing: om-spec-writing "{one-line feature goal} — brief: {this file's path}"
- App Spec: {repo-relative App Spec path} — source of truth for this feature; sections {§ list}

## Problem

{The workflow's journey and ROI this feature serves, in the App Spec's glossary terms (2–5 sentences).}

## Agreed direction

{The stories in scope (US ids with their happy/alternate/failure paths, condensed), the capability-ladder rung each one landed on, and what was rejected — including platform capabilities found to cover part of it.}

## Resolved unknowns

| Question | Answer (from the App Spec) |
|----------|----------------------------|
| {identity: which persona, internal or external surface} | {§2 decision} |
| {entity fields: key, type, multi-value, required} | {§1.4 table rows} |
| {decided §10 questions touching this feature} | {decision + rationale} |
| {acceptance criteria for this phase} | {§7 domain + business criteria} |

## Non-goals

- {§1.2 scope exclusions and the "NOT this workflow" boundaries that touch this feature}

## Affected areas (if known)

- {§4.5 modules, extension points, and pages from §3.5 — only what the App Spec established}
- {Upstream dependencies: gaps scoped `platform`, with their tracker references}
```

- **Resolved unknowns** is the load-bearing section: it pre-answers `om-spec-writing`'s Open Questions gate, so the feature spec asks only what the App Spec left open.
- **Docs-only mappings** that decide this feature go into Resolved unknowns with the `docs-only` label, so the feature spec verifies them instead of inheriting them.

## 4. Invoke `om-spec-writing`, one feature at a time

In §7 phase order, after the user confirms each feature:

```
om-spec-writing "{one-line feature goal} — brief: {brief path}"
```

The spec it writes lands in the same specs directory and commits the brief beside it. For unattended authoring of a confirmed brief, the same argument works with `om-auto-write-spec` — offer it; do not choose it for the user.

Missing `om-spec-writing` → stop after the briefs are written, name the skill, and print the install command (`npx skills add <collection-source> --skill om-spec-writing`); the briefs stay usable once it is installed.

## 5. The two-level contract

- **The App Spec wins.** A feature spec that contradicts it is corrected, or the App Spec is consciously amended — with a dated Changelog entry naming the feature spec — before implementation starts.
- **Traceability.** Each feature spec cites the App Spec path in its Problem Statement (the brief's `App Spec:` line carries it) and keeps the US ids it implements.
- **Scope stays cut.** A feature spec never absorbs stories from a later phase; new stories found while designing go back to the App Spec first (with a re-run of the cross-story impact matrix for the stories they touch).
