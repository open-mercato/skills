# Evidence and claim meaning

Each substantive claim has a source tag and a pointer in its canonical section. The tags describe provenance. They do not rank how well a source answers every possible question.

1. `[INTERVIEW]`: a real user, stakeholder or expert's account. Cite the note and date. Distinguish what happened from what the person predicts or says they would do.
2. `[DATA]`: a measurement, query or export. Cite the source system, period and filter; name missing metadata. Test data cannot support a real usage claim.
3. `[DOCUMENT]`: a contract, policy, decision record, tracker item or workshop decision. It supports what was specified or agreed. A document containing a guess remains a guess about users.
4. `[PRODUCT]`: repository code, design contracts, compatibility surfaces or specs. It supports what exists or was specified, not whether users need it.
5. `[BENCHMARK]`: a reference product checked at a cited link on a stated date. It supports that product's observed behaviour, not demand for ours.
6. `[SYNTHETIC]`: simulated interviews or persona walkthroughs. Keep these claims under *Hypotheses to test*, each with a real-world check. They never support a problem, user or success criterion.
7. `[ASSUMPTION]`: an unverified belief or prediction. Name its origin when known and link to its test in Riskiest assumptions. Never invent a source to complete the format.

## Separate observations, decisions and hypotheses

Make the meaning clear in the sentence or table context; do not add another tag system.

- **Observation:** report only what the source supports. “One interviewee described losing an afternoon” does not establish the frequency across a segment. “The interviewee said they would pay” is an account of a statement, not a purchase.
- **Decision:** name what the human chose, who chose it, and why. An accepted recommendation becomes a decision record. Its origin remains visible; acceptance does not confirm the beliefs behind it.
- **Hypothesis:** state what remains unverified, why it matters, and what would change the decision. An inferred need, emotion or cause remains a hypothesis unless the source supports it; name the observation behind it and keep a consequential interpretation separate from that observation. A human can accept the risk of building without a test. The factual claim keeps its assumption status.

For example, “We will start with freelance accountants” may be a `[DOCUMENT]` decision. “Freelance accountants need this every week” remains `[ASSUMPTION]` unless evidence supports it. Separate those sentences even when they share a source.

Goals and thresholds chosen by the owner are decisions, not observed baselines. Record their origin and rationale; if the user accepts a proposed threshold without empirical support, call it a provisional target. Never invent a measurement, numeric research answer or round number to fill a field. A missing baseline stays unknown.

## Source basis and readiness

Beside Coverage, summarize the independent basis in plain language: distinct interviewees when identifiable, datasets and periods, documented decisions, and important untested assumptions. Count repeated excerpts or exports from the same session once as a source. If independence cannot be established, say so rather than inventing a participant count. Do not make a validation percentage from tagged lines.

For ticket-level readiness, Problems and Target group must have relevant support from tiers 1 to 5, checked against the source's actual content. A founder's approved choice of segment, a competitor page, or an implemented screen alone does not establish the user's problem. Scope, non-goals and targets may rest on human decisions. Answer blocking questions and apply the mode's readiness conditions. Accepting risk does not waive missing evidence of the problem and users; an honest brief may remain ready only for research.

## Coverage compatibility

Keep the existing output line and counting scope so old briefs remain comparable:

- Count each tagged body line once. Exclude the header, Decision summary, Hypotheses to test, Definition of Ready addendum, and Collection plan.
- New writing puts one claim on each line. For a legacy line with multiple tags, use the first applicable tag in the numbered list above, as the previous counting rule did. Split mixed observations and hypotheses when refreshing; do not apply the strongest tag to an entire mixed assertion.
- Count canonical statements only in new briefs. Cross-references in other sections need no repeated tag. Preserve existing entries when refreshing, but remove repeated explanatory prose without deleting ids or changing decisions.
- `sourced = interview + data + document + product + benchmark`; `claims = sourced + synthetic + assumed`. These are tagged-line totals, not independent evidence totals.

Because synthetic claims are confined to the excluded Hypotheses section, the legacy synthetic count is zero in a conforming brief. Report that section separately in the header as `Synthetic hypotheses outside Coverage: {count}`; use the same explanation in the final report when any exist. Do not silently fold them into the old counter. A legacy brief lacking this note remains readable; inspect its Hypotheses section directly.

```text
Coverage: 33 claims — 29 sourced (interview 12, data 9, document 3, product 5, benchmark 0), 0 synthetic, 4 assumed; 2 entries on the collection plan
Synthetic hypotheses outside Coverage: 4
```

The final report uses `Coverage:` without the collection-plan suffix and emits `Collection plan: 2 entries waiting for material` separately. Count actual material requests, not deferred headings or general open questions. Report independent source basis in words, and determine readiness from the relevant claims, never from this aggregate.
