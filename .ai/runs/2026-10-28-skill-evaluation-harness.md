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

- [ ] 1.1 Define generic evaluation configuration and output contracts
- [ ] 1.2 Prepare immutable skill and case snapshots

### Phase 2: Execute and measure

- [ ] 2.1 Run isolated Codex CLI trials and import native sessions
- [ ] 2.2 Measure tokens, tool calls, time, failures, and artifact text

### Phase 3: Report and verify

- [ ] 3.1 Produce paired JSON, CSV, Markdown and blinded descriptions
- [ ] 3.2 Test safety, malformed or failed runs, resume and metric accounting
- [ ] 3.3 Run six-PR comparison and document reuse for another skill
- [ ] 3.4 Run repository gate and independent review, then publish the ready PR
