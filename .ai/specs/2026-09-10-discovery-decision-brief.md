# Discovery questions and a brief people can use

## Problem and goal

`om-discover` protects source provenance but requires recommendations for nearly every question, chooses questions by section coverage, and repeats decisions across a long brief. The user approved a revision after reviewing the skill and an existing product brief. Help the user resolve consequential unknowns with fewer questions and make the resulting decision easy to find.

## Non-goals

- Do not rewrite any product's existing brief or change its decisions.
- Do not publish, commit, or install the revised skill into other repositories.
- Do not remove evidence requirements, confirmation of product decisions, stable identifiers, or existing output markers.
- Do not change shared reporting conventions across the collection. The user-authorized reporting correction applies to `om-discover` only.

## Approach

Use small rounds of independent questions, selected by their effect on the current decision. Ask about experience without suggesting the answer. Offer recommendations for choices when the available material supports a useful tradeoff. Let the user describe one concrete event.

Add a short Decision summary before the existing brief sections. Keep the existing headings and table columns; append missing ownership and change-control fields. Write each substantive rule in its canonical row and refer to it elsewhere. Describe evidence sources separately from observations, decisions, and hypotheses; accepting a hypothesis as a risk does not verify it.

Keep the Coverage marker and its historic tagged-line counting scope. Explain its limits and report synthetic hypotheses separately because that section is excluded from the legacy count. Readers must judge readiness from the underlying sections, not the aggregate count. This avoids silently changing the meaning of counts in old briefs.

Prioritize missing material needed for the current decision. Optional, irrelevant sections keep their headings with a short deferred reason and create no research task. Quick sessions use available material and one small round; they retain evidence, coherence, and compression checks. Skip the synthetic-panel offer without a concrete flow. Fix source transcription errors locally; ask the user only about unresolved decisions or unavailable facts.

Use design-thinking methods within the existing conversation: ground the need in a real situation, distinguish interpretation from observation, compare materially different directions when the choice is open, and select a prototype or other experiment for a specific unknown. Preserve settled scope, round limits, section headings and tables; do not require separate workshop artifacts.

## Acceptance criteria

1. Default rounds contain at most three independent questions. Larger batches require the user's preference; dependent questions wait for their answer.
2. Research questions contain no recommended answer or arbitrary example targets. Decision recommendations distinguish supporting evidence from assumptions.
3. The summary states the current decision, relevant observations, proposed or agreed scope, the consequential unknown, and next action. It aims for at most 500 to 900 words and is shorter when the material is thin.
4. All 17 existing section headings, existing table columns, stable ids, source tags, argument names, and output marker shapes remain usable. Missing table fields are appended. Legacy briefs need no rewrite to be read.
5. Coverage is explicitly a tagged-line count, not independent validation. Repeated sources and team decisions do not become demand evidence. Synthetic hypotheses excluded from that count remain visible in a separate header note.
6. The skeptic checks solution/problem fit and whether the planned test measures the relevant assumption. A declared preference is never reported as actual payment.
7. Quick mode does not force unused sections into research, invent a Key flow, or silently add interview rounds.
8. Relevant mode requirements are conditional on the current decision's risks, while build readiness still requires sourced problems/users and explicit consequential decisions.
9. The collection lint passes, and scenario exercises check behavior on sparse material and an existing product with conflicting requirements, with an independent pass when agent capacity is available. Review findings are fixed before applying the patch to the user's source checkout.
10. Inferred motives and causes stay assumptions unless the material supports them; a founder's account of a user is not silently presented as direct user research.
11. An open problem frame names the person, situation and desired outcome without prescribing a feature. Explicitly chosen solutions and constraints remain binding.
12. When there is a consequential choice of approach, record the considered alternative and reason in the existing Decisions row. Do not force an option quota or another interview round.
13. A proposed prototype identifies the learning question, observable result and decision affected. Its form follows that question; research, manual delivery or existing data may suffice.

14. Interview capture fields allow successful current approaches and the absence of a problem without presupposing pain, cost or failed alternatives.
15. Discovery reporting has one scoped instruction: summarize the outcome, basis, consequential unknown and next action; merge related points while preserving machine markers and canonical brief fields.
16. `Next:` emits only an authorized, unstarted action ready to run, with supported arguments preserved. Unaccepted, declined, completed and blocked actions produce `none`.
17. An existing-product screen check selects `--app` or an actual static prototype; an explicitly chosen narrative review passes the brief and describes that limit. Pass the agreed flow and research directory.
18. Refresh collects tracker decisions before drafting. Material or decisions changed after review return through draft, quality and skeptic checks before confirmation and write.

## Validation

Run the collection's `bash scripts/lint.sh`, the skill creator's frontmatter validation when its runtime is available, and `git diff --check`. Compare the original and revised interface for compatibility. Use isolated subagent exercises with supplied fictional material; evaluate observable decisions and generated output rather than literal instruction wording. Store generated examples and execution notes outside deliverables.
