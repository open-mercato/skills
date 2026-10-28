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
- [ ] 3.1 Run the frozen paired benchmark with both models
- [ ] 3.2 Adjudicate findings and compare generated descriptions
- [ ] 3.3 Run the repository gate and final independent review
- [ ] 3.4 Publish measured results, finish PR metadata and clean owned snapshots

## Pre-benchmark evidence

PR: #150

All six configured repository commands pass locally. Independent read-only review approves contract preservation. Frontmatter and every pre-existing reference are byte-identical. Candidate implementation: `6862df0a20579c34c860b1d8dd6c0946cc7c12cf`. The frozen executor is `9c422c8a7fa124ddbad9769e3132bee118c4d74a`. The skill entrypoint is 10,780 bytes; entrypoint plus new always-read protocol is 15,219 bytes versus 20,488 bytes before. These are size measurements, not runtime savings.
