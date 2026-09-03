# Evidence tiers for discovery

Every claim in the brief carries a tag naming the strongest tier it honestly supports, and a pointer to its source. The tag is part of the contract with the reader — and with `om-spec-writing`, which turns untagged or weakly tagged claims into Open Questions.

1. `[INTERVIEW]` — a real user, stakeholder, or expert said it. Cite the note file and date; quote when the wording matters.
2. `[DATA]` — an extract, a query, an export. Cite the file, the period, and the filter.
3. `[DOCUMENT]` — a client document, a contract, a policy, a tracker item, a decision record, the decisions and constraints recorded in a workshop export. Cite it. (What a person *said* in a workshop or an interview is `[INTERVIEW]`; what the room *decided* is `[DOCUMENT]`.)
4. `[PRODUCT]` — the repository itself: code, the design contract, compatibility surfaces, specs. Cite the file or the rule.
5. `[BENCHMARK]` — a competitor or reference product, checked on a date. Cite the link and the date checked; a benchmark without both is an assumption.
6. `[SYNTHETIC]` — a persona walkthrough or a simulated interview. Allowed only under *Hypotheses to test*, never as support for a problem, a user, or a success criterion.
7. `[ASSUMPTION]` — the team's or the agent's belief. Allowed, labeled, and paired with a test in the assumption map.

Rules:

- Never dress an `[ASSUMPTION]` as an `[INTERVIEW]`, or a `[SYNTHETIC]` walkthrough as `[DATA]`. Inflating a tier to make a section read well destroys the value of every other tag.
- A claim with no source is not a claim: tag it `[ASSUMPTION]` or move it to the collection plan.
- The ticket-level items of the Definition of Ready (`SDLC.md`) must rest on tiers 1 to 5. A brief whose problem statement or users rest on tiers 6 and 7 says so in the coverage line and does not satisfy the tier, whatever else it contains.
- Numbers carry their provenance in the same line ("about 40 tickets a month `[DATA]` support export, May to July"); a round number with no source is removed, not tagged. A data file whose source system, period, or filter is not recorded is still `[DATA]`, with the gap named on the line and a data request on the collection plan; it is not promoted to a fact by being a file.
- Counting for the coverage line: one claim per body line that carries a tag; a line with two tags counts once, under its strongest tier; the header, the Hypotheses section, the Definition of Ready addendum, and the collection plan are not counted.

## The coverage line

The brief header carries one line, recomputed on every write, with the collection-plan count appended:

```
Coverage: 37 claims — 29 sourced (interview 12, data 9, document 3, product 5, benchmark 0), 4 synthetic, 4 assumed; 2 entries on the collection plan
```

The final report carries the same numbers as two output-contract lines, `Coverage:` without the suffix and `Collection plan: 2 entries waiting for material`, because consumers parse them separately. An entry is one item of the collection plan — a whole section, a sub-section such as the benchmark, or a thin section the user wants stronger. A reader who sees "0 sourced" knows what they are holding.
