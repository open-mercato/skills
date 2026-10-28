# Review context optimization results

**Recommendation: retain the baseline for adoption.** Across 96 completed trials, neither instruction rewrite establishes the requested combination of lower tokens/tool use and retained findings/qualifications. The focused revision has a real observed tool-count reduction on Luna, but its total tokens rise; Sol's total-token change is small and uncached input rises. Keep this PR experimental and do not merge or install the proposal on this evidence.

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

## Experiment 2: concrete grouped reads

Keep the concise coordinator and the unchanged engine/contracts. Make grouping known independent reads concrete: one content operation can read several known files with filename/line provenance; separate parallel reads still incur separate tool items. Avoid heading/inventory probes before a necessary known-file read, reserve discovery for unknown paths or large corpora, and keep retrieval inside the existing workflow rather than a second reconnaissance phase. Preserve evidence invalidation, mutable-state readbacks, all checks and complete reports. Do not insert case-specific answers or fixed inspection budgets.

This is the single focused revision allowed by the committed plan, frozen at `c19f1acd571fe196a208010b2b8c914627c58893`. Its entrypoint plus new always-read guide total 13,782 bytes versus the old entrypoint's 20,488 bytes, a 32.73% reduction in these owned instruction files. Unchanged references and companions are excluded from both size figures. This is not a measurement of the full prompt or all required instructions. All six repository gates pass locally; the read example passes with real references and paths containing spaces; independent contract review approves.

The second complete 48-trial comparison uses fresh controls and identical evaluator, tasks, source/context pins, requested models, high reasoning, two repetitions and concurrency three. All 48 trials completed without failures, retries, unknown completed-item types or detected input drift. Together, the studies contain 96 completed trials. All initial outcomes remain preserved.

**The combined efficiency target fails again.** Luna makes substantially fewer tool invocations, but total tokens increase. Sol's token change is small compared with control-to-control variation. There is no demonstrated 15% reduction in both metrics on both models.

| Model | Total tokens, fresh baseline → revision | Change | Tool items, fresh baseline → revision | Change | Worker seconds, baseline → revision | Report words, baseline → revision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| gpt-6.1-sol | 42,110,261 → 41,836,015 | −0.65% | 436 → 406 | −6.88% | 4,006.9 → 3,890.3 | 12,299 → 13,636 |
| gpt-6-luna | 13,407,762 → 13,695,982 | +2.15% | 386 → 241 | −37.56% | 1,711.2 → 1,519.7 | 8,479 → 9,217 |

[All 48 revised-study trial measurements](experiment-2.csv) preserve exact counts, repetitions and full-artifact digests. Sol uncached input increases 6.35%; Luna uncached input decreases 11.44%. These dimensions differ from total tokens, so no monetary-cost conclusion is inferred without pricing and complete accounting.

### Token accounting

| Model / version | Cached input | Uncached input | Output | Reasoning subset |
| --- | ---: | ---: | ---: | ---: |
| Sol / baseline | 39,749,120 | 2,220,578 | 140,563 | 45,639 |
| Sol / candidate | 39,332,352 | 2,361,640 | 142,023 | 49,285 |
| Luna / baseline | 11,732,224 | 1,506,340 | 169,198 | 94,058 |
| Luna / candidate | 12,213,632 | 1,334,078 | 148,272 | 73,903 |

### Per-case means

Each cell compares baseline → candidate, with two repetitions per version. Exact trial rows remain in the CSV; percentages use unrounded means.

| Case | Model | Mean total tokens | Change | Mean tool items | Change | Mean worker seconds |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| #8087 | Sol | 2,878,825.5 → 3,057,455 | +6.20% | 37.5 → 26.5 | -29.33% | 288.7 → 289.4 |
| #8087 | Luna | 1,905,760.5 → 1,503,661 | -21.10% | 18.5 → 17 | -8.11% | 205.3 → 140.1 |
| #8122 | Sol | 2,825,004 → 3,084,947.5 | +9.20% | 24.5 → 29.5 | +20.41% | 270.3 → 272.5 |
| #8122 | Luna | 951,555 → 1,045,005.5 | +9.82% | 68 → 12.5 | -81.62% | 151.3 → 126.2 |
| #8083 | Sol | 2,649,282.5 → 2,733,490 | +3.18% | 31 → 32.5 | +4.84% | 248.2 → 225.0 |
| #8083 | Luna | 842,987.5 → 1,506,878.5 | +78.75% | 22 → 16.5 | -25.00% | 103.2 → 134.7 |
| #8058 | Sol | 3,435,133.5 → 2,653,413.5 | -22.76% | 32 → 26 | -18.75% | 355.4 → 402.2 |
| #8058 | Luna | 778,925 → 731,813 | -6.05% | 11 → 37.5 | +240.91% | 137.7 → 133.2 |
| #8088 | Sol | 3,891,421 → 3,678,176 | -5.48% | 41 → 35.5 | -13.41% | 341.6 → 292.6 |
| #8088 | Luna | 1,089,260 → 1,023,351.5 | -6.05% | 45 → 23.5 | -47.78% | 145.4 → 113.6 |
| #8031 | Sol | 5,375,464 → 5,710,525.5 | +6.23% | 52 → 53 | +1.92% | 499.2 → 463.4 |
| #8031 | Luna | 1,135,393 → 1,037,281.5 | -8.64% | 28.5 → 13.5 | -52.63% | 112.7 → 112.0 |

### Repetition ranges

Minimum–maximum across only two repetitions; these are observed ranges, not confidence intervals.

| Case | Model | Baseline total tokens | Candidate total tokens | Baseline tool items | Candidate tool items |
| --- | --- | ---: | ---: | ---: | ---: |
| #8087 | Sol | 2,282,981–3,474,670 | 2,667,251–3,447,659 | 24–51 | 23–30 |
| #8087 | Luna | 1,595,394–2,216,127 | 1,031,436–1,975,886 | 16–21 | 12–22 |
| #8122 | Sol | 2,588,796–3,061,212 | 2,685,674–3,484,221 | 22–27 | 26–33 |
| #8122 | Luna | 901,348–1,001,762 | 828,211–1,261,800 | 32–104 | 11–14 |
| #8083 | Sol | 2,344,316–2,954,249 | 2,453,608–3,013,372 | 24–38 | 31–34 |
| #8083 | Luna | 732,985–952,990 | 1,415,060–1,598,697 | 11–33 | 16–17 |
| #8058 | Sol | 3,423,120–3,447,147 | 2,539,607–2,767,220 | 31–33 | 24–28 |
| #8058 | Luna | 615,509–942,341 | 703,041–760,585 | 9–13 | 36–39 |
| #8088 | Sol | 3,846,470–3,936,372 | 2,805,354–4,550,998 | 36–46 | 28–43 |
| #8088 | Luna | 824,020–1,354,500 | 718,999–1,327,704 | 39–51 | 10–37 |
| #8031 | Sol | 5,109,029–5,641,899 | 5,633,182–5,787,869 | 39–65 | 42–64 |
| #8031 | Luna | 957,310–1,313,476 | 992,587–1,081,976 | 18–39 | 13–14 |


### Variance and outlier sensitivity

The primary comparison uses every complete pair against its own study's fresh control. No controls are swapped or selected after observing results. The same baseline commit produced 5.61% more total tokens and 10.47% fewer tool items on Sol in study 2 than study 1; on Luna, 9.88% more tokens and 25.32% more tool items. Two repetitions and fixed phase order do not establish a universal performance effect.

| Model | Median paired token change | Token pairs lower / higher | Median paired tool change | Tool pairs lower / higher |
| --- | ---: | ---: | ---: | ---: |
| Sol | −6.21% | 7 / 5 | +3.08% | 6 / 6 |
| Luna | +8.95% | 5 / 7 | −32.54% | 8 / 4 |

These medians describe per-case/repetition ratios and are secondary diagnostics, not the preregistered aggregate criterion. Neither metric has tied pairs.

The high-call Luna CLI control completed successfully; it was not an infrastructure failure. As an explicitly secondary sensitivity check, excluding **both #8122 repetitions from both versions** leaves ten Luna pairs: total tokens 11,504,652 → 11,605,971 (+0.88%) and tool items 250 → 216 (−13.60%). The primary result remains unchanged. This shows that the size of the headline tool reduction depends substantially on that case.

Returned command-output characters fall 12,260,031 → 11,822,694 on Sol and 12,992,155 → 9,433,576 on Luna. Skill/procedure-reading command items fall 149 → 138 and 126 → 81, respectively. These are trace diagnostics, not token measures: fewer calls and less returned text did not deliver the required metered-token reduction. Full reports grow 10.87% on Sol and 8.70% on Luna.

### Findings and descriptions

The same three independent judges assessed all 48 new artifacts with version/model/resource labels hidden. Two explicit collection-version phrases were masked only in their viewing copies; digests bind the full originals. They reused verified facts for the identical pinned sources while checking new claims and all new generated descriptions. [All second-study judgments](assessments-2.json) retain the source evidence, exact bindings and qualifications after unblinding.

| Case | Baseline → revision findings/content | Description assessment |
| --- | --- | --- |
| #8087 checkout | Core conflict, policy-scope, waiver and QA requirements remain. Baseline Luna r1 underweights the captured conflict; revision preserves it. Unsupported precise #8089 overlap assertions still appear. A concrete changelog conflict is independently supported by the actual captured target, without proving #8089 patch equality. | Sol baseline r2 and revision r1 tie as preferred. Revision Sol reports clearly separate inherited scope requests from independently verified implementation defects. Some Luna CI qualifications remain missing. |
| #8122 CLI | Baseline Sol r1 incorrectly demands localization despite SPEC-065; baseline Luna r1 reopens declined eject work. Revision avoids both errors. All eight still miss the inherited-property diagnostic edge. | Revision Sol r1 preferred. Clearer descriptions preserve the existing-destination safeguard and distinguish stale description wording from actual CLI behavior. |
| #8083 calendar | The fix remains supported. Revision Sol reports are preferred, but revision Luna r2 invents a still-live claim despite a captured release and misattributes mergeability evidence. Baseline Luna r1 calls an inherited nit new. | Good prose on technical behavior does not repair an unsupported workflow state. Both revision Sol artifacts handle the inherited optional concern precisely. |
| #8058 messages | Sol revision r1 retains full prepare/execute/undo mechanism and final deletion consequence; revision r2 retains only concern/disposition. The baseline repetitions show the same depth/scope trade-off; baseline r2 additionally explains why an after-snapshot timestamp cannot prove deletion ownership. Revision Luna r1 retains partial explanation outside Findings but invents an individual follow-up mapping. | Full technical explanation often coexists with unjustified mandatory escalation of deferred scope. Revision Sol r2's structured `skip-qa` proposal also conflicts with its own required-coverage premise. Retaining a concern, retaining its mechanism and preserving its disposition are separate dimensions. |
| #8088 SSO | Resolved inherited security fixes and optional nits remain. One Sol repetition per version catches reporting policy. Baseline Sol r1 additionally catches a contradictory “Zero auth module changes” spec row; revision omits it. Revision Luna r1 misattributes an older failed check to the reviewed head. | Baseline Sol r1 preferred. Some revision prose improves scope/test-matrix precision, while temporal CI attribution and a supported documentation finding are lost. |
| #8031 CPQ | Baseline Sol union: fencing, late modifiers, tax-picker ACL mismatch. Revision Sol union: fencing, late modifiers, stale explicit totals; it loses the ACL finding and gains the total-preservation scenario. Revision Sol r2 also finds test-discovery and dialog-fallback inconsistencies. All eight miss numeric-tax, precision, explicit-order, outer-commit and postcommit-recovery gaps from the partial reference catalog. | Revision Sol r1 has preferred technical coverage only with its unsupported mandatory group-pricing expansion removed. Luna finds no accepted new functional design issue in either version. Deliberate module-disable and group-pricing choices are still sometimes escalated without a violated contract. |

The tax-picker gap is concrete: the spec's editor role can manage sessions/quotes, but `/api/sales/tax-rates` requires `sales.settings.manage`, while `quotes.manage` only implies settings viewing. Default employee grants mask the custom-role failure. Losing that supported finding is not offset by discovering a different valid issue.

| Generated-description contrast | Baseline | Revision | Implication |
| --- | --- | --- | --- |
| CLI exception handling | Baseline Sol r1: “Translate the new CLI messages.” | Sol r2: “This is a documented scope decision, not a newly discovered regression.” | Revision better respects the actual CLI exception and declined eject scope |
| Messages mechanism | Sol r2: “Do not infer ownership of a global deletion merely from an after-snapshot timestamp” | Sol r1: “The saved recipient branch can differ from the branch actually executed.” / “Its undo restores only the recipient row and leaves the message globally deleted.” | Both provide useful mechanisms; ownership advice and deferred-scope treatment still vary |
| Messages scope-only account | Sol r1: “They are separate residual risks, not independent new discoveries from this review.” | Sol r2: “Preserve that disposition; do not reopen them as independently discovered blockers.” | Both preserve scope while omitting the useful technical mechanism/consequence in those repetitions |
| CPQ scenario selection | Sol r2: “Default employees currently have settings-management permission, so they would conceal this gap in testing.” | Sol r1: “a caller can submit a 10% discount together with the unchanged explicit tax 20 and gross 120.” | The revision adds a useful total-preservation scenario but loses the separate role/ACL failure |

No candidate uniformly dominates its controls. Some unsupported baseline requests disappear, while new workflow errors and missing source-supported details appear. Report length increases again, so terseness of instructions does not imply shorter or more equivalent generated descriptions.

## Adoption decision and next hypothesis

Retain the baseline and leave the proposed rewrite as an experimental draft. Static contract preservation and passing validators do not establish runtime finding equivalence. Both resource experiments fail the preregistered joint target; the source judgments also do not establish the requested retention of useful results. Neither installation nor merge is part of this experiment.

The reusable evaluation method is worth retaining: it exposed proxy failures that a byte-count comparison would miss. A next isolated hypothesis should target deterministic, narrowly scoped context collection or CI-evidence extraction, with verified provenance/invalidation and every existing gate retained. Measure it against fresh controls and unseen cases; use counterbalanced order if a future task permits it. This is a proposal for a subsequent experiment, not a claimed optimization result or a third hidden iteration here.

## Validation and integrity

All six configured repository checks pass locally for the frozen revision; its grouped-read example passes with real references and paths containing spaces. Independent contract review approves the unchanged workflow/safety/QA/validation contracts. An independent publication reviewer verified both CSVs, aggregates, every per-case mean/range, paired medians, exclusion sensitivity, byte claims, all 96 public artifact/case mappings, final quality/adoption prose and description quotations. Publication/privacy checks pass.

The final trace audit observed explicit assigned-entrypoint paths in all 96 trials, explicit code-engine entrypoint paths in 79 of 80 code trials and explicit spec-engine entrypoint paths in all 16 design trials. One fresh baseline trial (`m1-pr8087-r1-baseline`) reads companion checklist/output references without an observable engine-entrypoint read; retain this procedure-conformance qualification rather than assuming full execution or silently rerunning it. Access itself is not proof of checklist completion. All records remain in the primary comparison. The 3,107 completed command items match reported tool-item sums, with no live GitHub/network or mutation command patterns flagged. This is an additional heuristic diagnostic, not a complete semantic parser or sandbox proof. After judging, frozen inputs re-verify unchanged. Cleanup and final tracker/CI evidence are recorded in the run plan and PR comments. Raw traces and captured tracker context remain private; sanitized measurements and judgments are published here.

## Limits

This is an exploratory natural-case suite with two repetitions, partial reference concerns and no exhaustive human gold labels. It measures read-only proposed reviews/actions, not tracker-write execution. Baseline-first order can warm caches. Requested models are pinned, but resolved model identities are not emitted by these CLI sessions. Coordinator, authoring, controller and judge resource use is excluded; these tables are not the all-in cost of conducting the experiment. Private raw traces and tracker context are retained locally; only sanitized measurements, findings and description examples are published.
