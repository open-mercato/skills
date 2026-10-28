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
- [ ] 1.2 Commit the plan and publish the experiment proposal

### Phase 2: Candidate
- [ ] 2.1 Implement the concise coordinator and evidence-reuse protocol
- [ ] 2.2 Verify safety/contracts and independently review the candidate

### Phase 3: Evaluation and publication
- [ ] 3.1 Run the frozen paired benchmark with both models
- [ ] 3.2 Adjudicate findings and compare generated descriptions
- [ ] 3.3 Run the repository gate and final independent review
- [ ] 3.4 Publish measured results, finish PR metadata and clean owned snapshots
