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
