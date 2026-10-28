# Review context optimization experiment

## Goal
Retain useful review results while reducing tokens and completed tool calls. Complete the experiment autonomously and publish its results in PR comments.

Source doc: .ai/specs/2026-10-28-review-context-optimization.md

## Scope
One review coordinator, one skill-specific evidence reference, an Anthropic-guidance audit and a frozen baseline/candidate benchmark. Preserve standard references, companions, safety, validation and write-side workflow contracts. Use the existing evaluator; do not change it to favor the candidate.

## Plan and hypotheses
1. Audit actual trace waste and official Anthropic authoring guidance.
2. Commit this plan before editing the skill and open a separate draft PR.
3. Implement evidence reuse and a concise router; independently review contract preservation.
4. Run 48 fresh trials on six frozen cases, both intended models at high reasoning and two repetitions.
5. Judge exact artifacts without variant/model/resource labels; compare findings, descriptions and measured resources.
6. If necessary, make one focused revision and transparently rerun it. Publish the outcome and ready reviewed changes.

Efficiency hypothesis: at least 15% lower mean total tokens and tool items per model. Quality gate: retain the baseline's established functional/design findings and material qualifications without new unsupported blockers. No fixed context cap, skipped check or hidden failed trial is an acceptable saving.

## Risks
Natural PRs lack exhaustive ground truth. Repetitions help expose sampling variance but do not prove universal superiority. Baseline-first order can warm caches. Globally discoverable skill metadata may remain. Read-only trials evaluate proposed reviews/actions, not tracker side effects. Keep raw traces and captured automation links private. Publication is authorized on the experiment PR only; no source PR mutations or global skill installation changes.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Evidence and plan
- [x] 1.1 Inspect measured waste, existing contracts and official guidance
- [x] 1.2 Commit the plan and publish the experiment proposal — b19264e

### Phase 2: Candidate
- [x] 2.1 Implement the concise coordinator and evidence-reuse protocol — 6862df0
- [x] 2.2 Verify safety/contracts and independently review the candidate — 6862df0

### Phase 3: Evaluation and publication
- [x] 3.1 Run the frozen paired benchmark with both models
- [x] 3.2 Adjudicate findings and compare generated descriptions
- [x] 3.3 Run the repository gate and final independent review
- [x] 3.4 Publish measured results, finish PR metadata and clean owned snapshots

## Pre-benchmark evidence

PR: #150

All six configured repository commands pass locally. Independent read-only review approves contract preservation. Frontmatter and every pre-existing reference are byte-identical. Candidate implementation: `6862df0a20579c34c860b1d8dd6c0946cc7c12cf`. The frozen executor is `9c422c8a7fa124ddbad9769e3132bee118c4d74a`. The skill entrypoint is 10,780 bytes; entrypoint plus new always-read protocol is 15,219 bytes versus 20,488 bytes before. These are size measurements, not runtime savings.

## First experiment and revision decision

All 48 initial trials completed without failures, retries or input drift. Sol used 5.44% more total tokens and 10.06% more tool items; Luna used 8.06% more tokens and 0.32% fewer tool items. The efficiency target fails. [Results and the single planned retrieval refinement](../../docs/review-skill-optimization/results.md) were recorded before that refinement was implemented.

All 48 initial artifacts are now independently source-adjudicated with exact digest bindings. Quality/content retention is not equivalent: improved scope handling coexists with lost baseline mechanisms, and some established reference concerns are missed by both fresh versions. The sanitized assessment data and description examples are linked from the results.

The one focused revision is frozen at `c19f1acd571fe196a208010b2b8c914627c58893`. All six local gates, grouped-read example checks and independent contract review pass. Its complete fresh 48-trial run and all source judgments are finished. Initial owned snapshots were cleaned only after all judges finished; traces, results, bindings and reports remain retained. No further candidate edits were made during either frozen run.

## Final measured outcome

The studies contain 96 completed trials, without failed/retried trials, unknown completed-item types or detected input drift. The revised Sol comparison is −0.65% total tokens / −6.88% tool items, with uncached input +6.35%; Luna is +2.15% total tokens / −37.56% tool items, with uncached input −11.44%. Both fail the preregistered joint target. The Luna tool reduction becomes −13.60% in the explicitly secondary whole-CLI-case exclusion; no primary control or trial is dropped.

All 96 full artifacts were source-adjudicated by independent agents with version/model/resource labels hidden. Supported gains coexist with lost findings and qualifications, including the fresh-control tax-picker ACL gap, missing technical explanations and unsupported workflow assertions. Partial known-reference gaps shared by controls and proposals are not blamed causally on the refactor, but remain unfulfilled retention evidence.

Decision: retain the baseline for adoption; keep PR #150 as an experimental draft. Publish both outcomes and their data, without installing or merging the proposal. [Full results, tables, description examples and artifact-bound judgments](../../docs/review-skill-optimization/results.md).

Final gate runner: **local**. All six configured commands pass in order. Independent final publication review verifies the resource calculations, all 96 public artifact/case bindings across the two datasets, description quotations and the bounded adoption conclusion. Privacy checks find no host paths, credential patterns or signed URLs in the public data. After all source judging, frozen inputs re-verify unchanged at digest `b0834a7b9e23f6bfdb710e435ef4def1b5e169b3fc30dd5e26085658eea53565` before owned snapshot cleanup.

The final heuristic trace audit observes 96 assigned-entrypoint paths, 79 of 80 code-engine entrypoint paths and all 16 spec-engine entrypoint paths. One fresh Luna checkout control reads engine references without an observable engine-entrypoint read; this conformance limitation is disclosed and its recorded cost/artifact remain included. No benchmark trial is rerun or dropped to repair model behavior.

Publication is complete in [PR #150](https://github.com/open-mercato/skills/pull/150), with the [consolidated results comment](https://github.com/open-mercato/skills/pull/150#issuecomment-6481022203) and all sanitized data committed. The PR remains draft with `changes-requested`, `refactor`, `skip-qa`, `priority-low` and `risk-medium`; a consolidated rationale records each choice. Human-only hard-block labels and QA approvals are not granted. The run's `in-progress` claim is released; `ci-monitoring` records only bounded final-head CI follow-up, whose result is maintained in the [release/rationale comment](https://github.com/open-mercato/skills/pull/150#issuecomment-6482702858).

Both studies' owned source/variant worktrees are removed after source judging and integrity verification. All 96 raw trial results/streams, reports, exact bindings, judgments and measurement provenance remain retained privately. The primary source checkout keeps its pre-existing tracker edit and untracked environment backup (unread); installed review/create skill links remain unchanged. No source PR, installed proposal, merge or dependency installation is part of this work.
