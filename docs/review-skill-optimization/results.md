# Review context optimization results

## Experiment 1: concise coordinator and evidence reuse

**The first candidate fails the efficiency target on both models and does not establish equivalent finding/content retention.** Its shorter instructions do not establish a runtime saving. Better descriptions in some cases coexist with lost technical explanations and different reported defects.

Baseline: `002bf5cbf9e9ffe4b56120b4f79080cf61df79d4`. Candidate: `6862df0a20579c34c860b1d8dd6c0946cc7c12cf`. Frozen evaluator: `9c422c8a7fa124ddbad9769e3132bee118c4d74a` from evaluator PR #149. Six pinned cases (#8087, #8122, #8083, #8058, #8088, #8031), two models at high reasoning, two repetitions per version: 48 fresh CLI trials, all completed, no failures, retries, unknown completed-item types or detected input drift. All baseline trials ran before candidate trials; concurrency was three.

The target was at least 15% lower mean total tokens **and** completed tool items per model, conditional on finding and qualification retention. Equal trial counts mean the relative aggregate and mean changes are identical.

| Model | Total tokens, baseline → candidate | Change | Tool items, baseline → candidate | Change | Worker seconds, baseline → candidate | Report words, baseline → candidate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| gpt-6.1-sol | 39,874,752 → 42,042,056 | +5.44% | 487 → 536 | +10.06% | 4,046.8 → 4,140.8 | 11,771 → 13,651 |
| gpt-6-luna | 12,201,737 → 13,185,210 | +8.06% | 308 → 307 | −0.32% | 1,557.8 → 1,625.3 | 8,010 → 8,912 |

[All 48 trial measurements](experiment-1.csv) include cached/uncached input, output, reasoning subset, repetitions, elapsed time, report word counts and full-artifact digests. Total tokens include cached input; reasoning tokens are a subset of output, not an additional charge. No dollar-cost claim is made. Tool items count unique completed CLI invocation items, including failed command executions; they are not a model-dispatch count. Report words use whitespace splitting of the main artifact, not a readability score. Worker seconds exclude controller setup/integrity checks and judging.

Sol command traces show 147 → 196 skill/procedure-reading invocations and 11,218,254 → 10,788,216 returned command-output characters. This supports a focused retrieval hypothesis: the candidate slightly reduced printed text but introduced extra procedure-reading round trips. Character counts are diagnostic, not token measurements. The entrypoint plus its always-read guide was 15,219 bytes versus 20,488 bytes before; instruction size alone was a poor proxy for runtime efficiency.

### Token accounting

| Model / version | Cached input | Uncached input | Output | Reasoning subset |
| --- | ---: | ---: | ---: | ---: |
| Sol / baseline | 37,587,712 | 2,147,695 | 139,345 | 44,144 |
| Sol / candidate | 39,465,216 | 2,427,713 | 149,127 | 50,426 |
| Luna / baseline | 10,771,072 | 1,285,495 | 145,170 | 76,262 |
| Luna / candidate | 11,630,848 | 1,399,361 | 155,001 | 80,233 |

### Per-case means

Each cell compares baseline → candidate, with two repetitions per version. Exact trial rows remain in the CSV; percentages use unrounded means.

| Case | Model | Mean total tokens | Change | Mean tool items | Change | Mean worker seconds |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| #8087 | Sol | 2,551,115.5 → 3,147,280 | +23.37% | 36.5 → 51.5 | +41.10% | 320.0 → 281.9 |
| #8087 | Luna | 1,238,706.5 → 1,094,523 | -11.64% | 26 → 39.5 | +51.92% | 173.5 → 167.9 |
| #8122 | Sol | 2,542,160.5 → 2,877,331.5 | +13.18% | 32.5 → 38 | +16.92% | 263.7 → 265.7 |
| #8122 | Luna | 739,774 → 1,262,800.5 | +70.70% | 30 → 14 | -53.33% | 108.3 → 145.0 |
| #8083 | Sol | 2,691,862 → 2,388,692.5 | -11.26% | 31 → 40 | +29.03% | 301.5 → 238.2 |
| #8083 | Luna | 1,129,699 → 1,053,495.5 | -6.75% | 49.5 → 34 | -31.31% | 166.4 → 114.7 |
| #8058 | Sol | 3,144,449.5 → 2,588,418 | -17.68% | 43.5 → 31.5 | -27.59% | 344.1 → 353.7 |
| #8058 | Luna | 767,745.5 → 1,032,335 | +34.46% | 21 → 23 | +9.52% | 109.0 → 126.3 |
| #8088 | Sol | 3,502,670 → 4,101,633.5 | +17.10% | 38.5 → 39 | +1.30% | 323.4 → 347.1 |
| #8088 | Luna | 1,068,874.5 → 1,320,669.5 | +23.56% | 14.5 → 15.5 | +6.90% | 101.7 → 144.4 |
| #8031 | Sol | 5,505,118.5 → 5,917,672.5 | +7.49% | 61.5 → 68 | +10.57% | 470.7 → 583.8 |
| #8031 | Luna | 1,156,069 → 828,781.5 | -28.31% | 13 → 27.5 | +111.54% | 119.8 → 114.3 |

### Repetition ranges

Minimum–maximum across only two repetitions; these are observed ranges, not confidence intervals.

| Case | Model | Baseline total tokens | Candidate total tokens | Baseline tool items | Candidate tool items |
| --- | --- | ---: | ---: | ---: | ---: |
| #8087 | Sol | 1,896,174–3,206,057 | 2,943,262–3,351,298 | 32–41 | 37–66 |
| #8087 | Luna | 1,001,891–1,475,522 | 979,518–1,209,528 | 17–35 | 15–64 |
| #8122 | Sol | 2,348,691–2,735,630 | 2,717,568–3,037,095 | 28–37 | 32–44 |
| #8122 | Luna | 711,744–767,804 | 1,257,246–1,268,355 | 11–49 | 13–15 |
| #8083 | Sol | 2,666,050–2,717,674 | 2,348,685–2,428,700 | 31–31 | 36–44 |
| #8083 | Luna | 1,067,034–1,192,364 | 650,113–1,456,878 | 14–85 | 16–52 |
| #8058 | Sol | 3,045,089–3,243,810 | 2,195,756–2,981,080 | 29–58 | 30–33 |
| #8058 | Luna | 671,436–864,055 | 988,427–1,076,243 | 12–30 | 11–35 |
| #8088 | Sol | 3,429,849–3,575,491 | 3,842,406–4,360,861 | 38–39 | 38–40 |
| #8088 | Luna | 790,799–1,346,950 | 1,274,238–1,367,101 | 13–16 | 15–16 |
| #8031 | Sol | 4,940,485–6,069,752 | 5,842,293–5,993,052 | 55–68 | 67–69 |
| #8031 | Luna | 921,282–1,390,856 | 793,814–863,749 | 11–15 | 10–45 |

### Findings and generated descriptions

Three independent agents judged eight opaque artifacts per case against the pinned source and tracker context, without version, model or resource labels. One explicit version label was masked in a judging copy; original artifacts and their digests remain unchanged. They checked the complete proposed reviews, not only structured finding lists. [All 48 source-evidenced judgments](assessments-1.json) include issue catalogs, accepted/disputed claims, omitted issues, qualification losses, description excerpts and preferences after unblinding. These are reference-informed agent judgments, not exhaustive human ground truth or numerical quality scores.

| Case | Findings and retention | Description comparison |
| --- | --- | --- |
| #8087 checkout | Both retain actual-target conflict, inherited policy-scope request, human security waiver and QA gate. Some Luna reports make unsupported exact-overlap or missing-parity claims. No new checkout defect established. | Sol baseline r1 and candidate r1 tie as preferred. Strong versions separate human merge requirements from code defects and qualify CI scope. |
| #8122 CLI | All eight miss the low-impact inherited-property dependency diagnostic edge. Candidate Sol r1 additionally catches stale public install guidance. Existing CI failure, CLI console exemption and eject safeguards need separate treatment. | Candidate Sol r1 preferred. Generic Luna PASS rows lose scope/skip distinctions; the shared missed edge is not evidence of a candidate-caused regression. |
| #8083 calendar | Pristine hydration works. Bounded repeated lookup is an inherited optional concern. Baseline Luna r2 falsely blocks on a missing literal i18n alias despite successful execution of its target script. | Sol baseline r1 and candidate r2 preferred. Candidate avoids that false blocker, but Luna reports still lose affected-graph/advisory qualifications. |
| #8058 messages | The concurrent prepare/execute branch mismatch is real and explicitly deferred. Candidate Sol reports preserve concern/disposition but omit the mechanism and new undo consequence. Coverage/convention findings vary; no reachable cross-org exploit established. | Both candidate Sol reports preferred for scope and evidence handling, while losing useful technical explanation. Luna repeatedly escalates the deferred race; candidate Luna r1 also overstates automatic manual-QA routing. |
| #8088 SSO | All retain resolved inherited security fixes and optional nits. One Sol repetition per version also catches the explicit error-reporting policy violation. Conflict and QA remain merge requirements. | Candidate Sol r2 preferred for precise authorization-versus-observability wording and declined-as-required disposition. Some Luna candidate CI assertions miss available alias evidence or overstate exact execution. |
| #8031 CPQ design | Baseline Sol union: fencing, outer-commit boundary, rounding canonicalization, stale explicit totals. Candidate Sol union: fencing, numeric-tax loss, explicit-order recovery, late modifier ordering. Three baseline mechanisms are not retained; new findings do not establish equivalence. Luna misses these design gaps in both versions. | Candidate Sol r2 preferred for supported fencing/tax/recovery explanations without demanding deliberately excluded group pricing. Other reports confuse scope decisions with mandatory defects. |

“Preferred” applies to individual artifacts, allowing ties; it is not a win rate or proof that a version retains all findings. For example, a better scope decision can coexist with a missing mechanism. The CPQ lock in the pinned spec is PostgreSQL session advisory locking, not a Redis lease.

Predeclared partial reference concerns from the prior study are not waived when a fresh control misses them: the CLI diagnostic edge and CPQ postcommit-outcome recovery remain known gaps. A shared miss is not a causal refactor regression, but it prevents claiming preservation of all previously established useful results.

| Description example | Baseline | Candidate | Assessment |
| --- | --- | --- | --- |
| Messages, Sol | Explains how a recipient snapshot can precede global-delete execution and direct undo down the stale branch | “Preserve that disposition rather than reopening them as independent discoveries.” (r1) | Better disposition; technical explanation and new undo consequence lost in both candidate repetitions |
| SSO, Sol | “No surviving credential was demonstrated from this ordering.” (r1) | “No additional authorization correctness defect was established.” (r2) | Both qualify security impact; candidate r2 separately retains the reporting-policy violation |
| CPQ, Sol | “An API update adds a 10% discount while resending `taxAmount: 20` and `totalGrossAmount: 120`.” (r1) | “Stopping the first worker before its *next* write cannot stop the sales write already in progress.” (r2) | Both give concrete scenarios, but address different retained/lost issue sets |

Main-artifact word counts rise 15.97% on Sol and 11.26% on Luna. Shorter instructions did not produce shorter descriptions. Format, ordering, detail and qualification retention matter separately from length.

## One planned refinement

Keep the concise coordinator and the unchanged engine/contracts. Make grouping known independent reads concrete: one content operation can read several known files with filename/line provenance; separate parallel reads still incur separate tool items. Avoid heading/inventory probes before a necessary known-file read, reserve discovery for unknown paths or large corpora, and keep retrieval inside the existing workflow rather than a second reconnaissance phase. Preserve evidence invalidation, mutable-state readbacks, all checks and complete reports. Do not insert case-specific answers or fixed inspection budgets.

This is the single focused revision allowed by the committed plan, frozen at `c19f1acd571fe196a208010b2b8c914627c58893`. Its hot-path instructions total 13,782 bytes, with every existing reference and companion unchanged. All six repository gates pass locally; the read example passes with real references and paths containing spaces; independent contract review approves. The complete fresh 48-trial comparison uses the same evaluator/tasks/settings. Initial results remain preserved, and adoption depends on measured resources plus finding/description retention.

## Limits

This is an exploratory natural-case suite with two repetitions, partial reference concerns and no exhaustive human gold labels. It measures read-only proposed reviews/actions, not tracker-write execution. Baseline-first order can warm caches. Requested models are pinned, but resolved model identities are not emitted by these CLI sessions. Coordinator, authoring, controller and judge resource use is excluded; these tables are not the all-in cost of conducting the experiment. Private raw traces and tracker context are retained locally; only sanitized measurements, findings and description examples are published.
