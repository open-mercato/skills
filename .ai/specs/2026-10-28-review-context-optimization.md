# Evidence-efficient PR review

## Problem and outcome
The existing review skill repeatedly loads unchanged procedures and repository rules. Broad content searches and CI-log dumps add context without reliably adding evidence. The first six-case comparison showed that shorter prose alone did not reduce total tokens or tool calls and could lose findings.

Reduce repeated context collection while retaining the same review behavior, valid findings, inherited-feedback dispositions, validation evidence, compatibility checks, and merge/QA gates. This experiment optimizes `om-auto-review-pr` only.

## Proposed change
Replace the long coordinator with a concise ordered router. Add one skill-specific reference for evidence collection and reuse. Fetch a sufficient metadata snapshot once; retain its identity and provenance. Batch independent reads, select paths before searching content, inspect scoped CI evidence, and load a conditional procedure only when its branch applies. Pass available evidence to the unchanged review engine rather than asking it to recollect that evidence.

No fixed read, token, or tool-call ceiling may truncate a necessary review. Missing, incomplete, changed or contradictory evidence must trigger further inspection. Reuse applies to evidence collection, not permission to skip required validation runs. Review source changes invalidate affected evidence.

## Preserved contracts
Keep the skill name, frontmatter routing description, arguments, exact chaining markers, tracker operations, config keys, claims, labels, QA semantics, severity rules, autofix ownership/order, isolated worktrees, cleanup, bounded CI follow-up and always-loaded safety rules. Keep every standard reference and companion skill unchanged. A new reference is specific to this skill; no collection-wide shared-rule synchronization is needed.

## Experiment
Use the six previously frozen PR cases (#8087, #8122, #8083, #8058, #8088, #8031), with identical task text, source commits and captured evidence. The baseline is main `002bf5cbf9e9ffe4b56120b4f79080cf61df79d4`; its review/engine/spec skills match the earlier strong baseline `b6885a83dc0877ca2c96b66b8562384c63dd5035`. The candidate differs only in the targeted review skill. Pin the evaluator from PR #149 and record its source digest.

Run gpt-6.1-sol and gpt-6-luna at high reasoning, with two repetitions per case/variant/model: 48 fresh CLI trials. Complete the baseline phase before candidate trials. Preserve every failed or interrupted attempt and exclude incomplete pairs from resource means without hiding them. Do not reuse previous measurements as fresh controls.

Report per-model and per-case paired input/cached/uncached/output/reasoning/total tokens, completed tool items, elapsed time and generated-description metrics. Target at least 15% lower mean total tokens and completed tool items per model; this is a hypothesis, not a promised outcome. Report variation across repetitions and fixed-order/cache limitations.

Independently judge blinded artifacts and source-check disagreements. The candidate must retain the baseline's adjudicated valid functional/design findings, material inherited requests and evidence qualifications, with no new unsupported blocking request or weakened safety/merge gate. Do not turn known case answers into candidate instructions or worker context. Natural cases provide a partial reference set, not exhaustive recall.

If quality or efficiency fails, make at most one focused revision based on observed causes and benchmark the revision transparently. Report unsuccessful experiments honestly; never label a quality regression an optimization because it is cheaper.

## Validation and publication
Run the configured repository gate and an independent skill review. Check the routing description, standard-reference bytes and protected contracts against baseline. Publish the pre-implementation plan and final measurements/description comparisons in the new PR's comments. All six source PRs stay read-only. Do not change installed skill links or merge any PR.

## Migration & Backward Compatibility
Instruction-only additive reference and coordinator rewrite. No public names, paths used by other skills, tracker/config contracts, label meanings or parser markers change.
