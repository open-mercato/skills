# Skill evaluation harness

## Goal
Compare two immutable revisions of one skill across repeatable cases and configurable models. Preserve quality while measuring token use, tool calls, elapsed time, and generated descriptions. Use the tool to optimize the collection one skill at a time.

Source doc: .ai/specs/2026-10-28-skill-evaluation-harness.md

## Scope
Add a dependency-free Node CLI, generic case configuration, a Codex CLI runner, native-session import, reports, tests, and documentation. Review PR replay is one case adapter. Keep all evaluated source and tracker state read-only. Store outputs outside input repositories. Never publish automatically.

## Non-goals
Changing existing skills, tracker contracts, pipeline labels, QA gates, release behavior, or installed global skill links. No automatic skill rewriting, winner promotion, model-price assumptions, or unverified quality scores.

## Phases and Steps
1. Define versioned configuration/results, safety boundaries, and source pinning.
2. Implement isolated preparation, explicit dry-run execution, and trustworthy metrics.
3. Compare generated artifacts and aggregate paired cases; import existing native trial evidence.
4. Test failure paths and document the skill-by-skill optimization workflow.
5. Exercise the real tool on six PRs with two versions and both requested models, then review and publish.

## Risks
External tracker mutations are forbidden in trials. Use read-only sandbox execution and frozen inputs, and audit source state after each run. Failed or partial runs remain visible. Cached tokens are reported separately. A fixed baseline-first order has warm-cache bias. Natural PRs lack complete ground truth. Treat automated prose metrics as heuristics, not language-standard certification. Logs can contain secrets: store privately, redact artifacts, and publish only explicitly reviewed summaries.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Define and prepare

- [x] 1.1 Define generic evaluation configuration and output contracts — 3039eef
- [x] 1.2 Prepare immutable skill and case snapshots — 3039eef

### Phase 2: Execute and measure

- [x] 2.1 Run isolated Codex CLI trials and import native sessions — a266c03
- [x] 2.2 Measure tokens, tool calls, time, failures, and artifact text — c51e737

### Phase 3: Report and verify

- [x] 3.1 Produce paired JSON, CSV, Markdown and blinded descriptions — 3039eef
- [x] 3.2 Test safety, malformed or failed runs, resume and metric accounting — a266c03
- [x] 3.3 Run six-PR comparison and document reuse for another skill — a266c03
- [x] 3.4 Run repository gate and independent review, then publish the ready PR — 00156f6

## Implementation evidence

Initial runtime snapshot: `a266c03`. All 15 initial disposable-repository/fake-Codex tests pass,
including a second generic skill, baseline phase ordering, independent sessions,
SIGTERM, native task/effort verification, unknown usage and resume drift. Runner:
local Node and Git. Every configured validation command passed in order: lint,
browser providers, tracker providers, run classifier, close keywords and 39 UX
design tests. The new suite is additive as `test:skill-eval`; CI configuration is
unchanged. Documentation includes the generic config, native import, manual
assessment/blinding, another-skill reuse and PR replay evidence requirements.

The six-case study completed all 24 CLI trials with two pinned skill revisions,
both requested models and high reasoning. Three independent blinded reviewers
assessed all 24 artifacts. The original four-run native pilot remains a separate
cohort. Results and description comparisons are published in
[skills PR #140](https://github.com/open-mercato/skills/pull/140#issuecomment-6477327051).
Raw traces, source snapshots, auth material and personal local paths remain
outside the repository. The reusable tool ships separately in
[PR #149](https://github.com/open-mercato/skills/pull/149); no merge is authorized.

Independent-review follow-up: the reusable tool now counts every expected CLI
pair, including pairs that never started, while native cohorts cover imported
pairs only. Execution, import and cleanup share one atomic writer lock; ownership
and execution/import input checks occur inside it. Assessments bind to canonical
whole-artifact digests and stale retry/reimport judgments are rejected. Legacy
stored results receive derived report digests without mutation. All 22 evaluator
tests and all six configured validation commands pass locally, including 39 UX
tests. The frozen `a266c03` executor and live-study inputs/results were untouched.
Independent re-review approves all three fixes in `00156f6`. Reporting the legacy
study with that revision preserved every resource aggregate and attached 24
digest-bound assessments without rewriting stored trial results. Final changes
after that reviewed implementation are documentation and publication metadata.
