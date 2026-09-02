# Evidence tiers for discovery

Every claim in the brief carries a tag naming the strongest tier it honestly supports, and a pointer to its source. The tag is part of the contract with the reader — and with `om-spec-writing`, which turns untagged or weakly tagged claims into Open Questions.

1. `[INTERVIEW]` — a real user, stakeholder, or expert said it. Cite the note file and date; quote when the wording matters.
2. `[DATA]` — an extract, a query, an export. Cite the file, the period, and the filter.
3. `[DOCUMENT]` — a client document, a contract, a policy, a tracker item. Cite it.
4. `[PRODUCT]` — the repository itself: code, the design contract, compatibility surfaces, specs. Cite the file or the rule.
5. `[BENCHMARK]` — a competitor or reference product, checked on a date. Cite the link and the date checked; a benchmark without both is an assumption.
6. `[SYNTHETIC]` — a persona walkthrough or a simulated interview. Allowed only under *Hypotheses to test*, never as support for a problem, a user, or a success criterion.
7. `[ASSUMPTION]` — the team's or the agent's belief. Allowed, labeled, and paired with a test in the assumption map.

Rules:

- Never dress an `[ASSUMPTION]` as an `[INTERVIEW]`, or a `[SYNTHETIC]` walkthrough as `[DATA]`. Inflating a tier to make a section read well destroys the value of every other tag.
- A claim with no source is not a claim: tag it `[ASSUMPTION]` or move it to the collection plan.
- The ticket-level items of the Definition of Ready (`SDLC.md`) must rest on tiers 1 to 5. A brief whose problem statement or users rest on tiers 6 and 7 says so in the coverage line and does not satisfy the tier, whatever else it contains.
- Numbers carry their provenance in the same line ("about 40 tickets a month `[DATA]` support export, May to July"); a round number with no source is removed, not tagged.

## The coverage line

The brief header carries one line, recomputed on every write:

```
Coverage: 37 claims — 29 sourced (interview 12, data 9, document 3, product 5), 4 synthetic, 4 assumed; 2 sections on the collection plan
```

The same numbers end the final report as the `Coverage:` output-contract line. A reader who sees "0 sourced" knows what they are holding.
