# Panels, fresh runs, and believing what repeats (steps 2 and 5)

Why a panel and not three personas, why fresh panels and not the same five twice, and how findings are consolidated across runs.

## Individually believable, collectively wrong

A persona written from good material reads as a real person. Five of them written from the same material, in the same context, drift toward one voice and one distribution that no population has. Two defences, both cheap:

- **Composition follows the data.** Segments come from the brief's Target group; when a `[DATA]` line gives proportions, the panel matches them (three of five freelancers when the data says sixty percent). When there is no data, the panel spans the segments evenly and the report says the composition is assumed.
- **The indifferent are in the panel.** Most people barely care about most topics. Every panel includes at least one persona for whom the product's problem is minor, because a panel that is all engaged over-reports interest and under-reports the reasons people do nothing.

## Fresh panels, separate contexts

Each run samples new personas from the same segment definitions — the same roles and situations, new instances — so that a finding that repeats is repeating across people, not across a memory. Each persona runs in its own fresh-context subagent with only its persona block, the retrieved passages for the current question, and the subject; personas never see each other's answers, and the interviewer never carries one persona's specifics into the next. A panel whose answers cluster (same objections in the same words, the same tool proposed by everyone) is flagged as homogeneous and resampled from different corners of the segments before the run counts.

## Runs

`--runs` defaults to two; three when the decision is consequential. One run is exploration: it may go into the report only under *Seen once, not reported as a finding*.

## Consolidation across runs

- A finding — barrier, missing case, contradiction — is reported only when it appeared in **every** run. Its **weight** is the count of personas across runs that hit it; its **spread** is how much that count varied between runs.
- Two findings are ranked apart only when the gap between their weights is larger than the spread; otherwise they are reported as tied. A ranking is a chain of comparisons, and a comparison inside the error bar is noise.
- What appeared in one run only goes to *Seen once*, with the persona and the run, so a human can decide whether to chase it.
- The outlier paragraph: the one persona in fifteen who refused, quit, or misread the product is reported on its own, with the reason, because averages hide exactly the case that changes a decision.

## Saturation

Across the interviews of all runs, track the topics each interview raises (a topic is a distinct theme the persona brought up, in the persona's words, normalised by the interviewer). When fewer than one topic in twenty is new over the last several interviews, the panel has saturated: more runs would confirm, not add. When it has not, the report says how many topics were still new in the last run, so the user can decide to run more or to stop and go to real people. Saturation of a synthetic panel says nothing about real users; it says the material has been exhausted.

## What this does not do

It does not produce numbers. A share of personas who "would" is not an estimate of anything; the weight and spread above are for ranking the panel's own findings, and they never leave the report as a percentage of users.
