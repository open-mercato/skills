# Review context optimization results

## Experiment 1: concise coordinator and evidence reuse

**The first candidate fails the efficiency target on both models.** Its shorter instructions do not establish a runtime saving. Source-based, version-blinded quality adjudication is in progress; no quality-success claim is made yet.

Baseline: `002bf5cbf9e9ffe4b56120b4f79080cf61df79d4`. Candidate: `6862df0a20579c34c860b1d8dd6c0946cc7c12cf`. Frozen evaluator: `9c422c8a7fa124ddbad9769e3132bee118c4d74a` from evaluator PR #149. Six pinned cases (#8087, #8122, #8083, #8058, #8088, #8031), two models at high reasoning, two repetitions per version: 48 fresh CLI trials, all completed, no failures, retries, unknown completed-item types or detected input drift. All baseline trials ran before candidate trials; concurrency was three.

The target was at least 15% lower mean total tokens **and** completed tool items per model, conditional on finding and qualification retention. Equal trial counts mean the relative aggregate and mean changes are identical.

| Model | Total tokens, baseline → candidate | Change | Tool items, baseline → candidate | Change | Worker seconds, baseline → candidate | Report words, baseline → candidate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| gpt-6.1-sol | 39,874,752 → 42,042,056 | +5.44% | 487 → 536 | +10.06% | 4,046.8 → 4,140.8 | 11,771 → 13,651 |
| gpt-6-luna | 12,201,737 → 13,185,210 | +8.06% | 308 → 307 | −0.32% | 1,557.8 → 1,625.3 | 8,010 → 8,912 |

[All 48 trial measurements](experiment-1.csv) include cached/uncached input, output, reasoning subset, repetitions, elapsed time, report word counts and full-artifact digests. Total tokens include cached input; reasoning tokens are a subset of output, not an additional charge. No dollar-cost claim is made. Tool items count unique completed CLI invocation items, including failed command executions; they are not a model-dispatch count. Report words use whitespace splitting of the main artifact, not a readability score. Worker seconds exclude controller setup/integrity checks and judging.

Sol command traces show 147 → 196 skill/procedure-reading invocations and 11,218,254 → 10,788,216 returned command-output characters. This supports a focused retrieval hypothesis: the candidate slightly reduced printed text but introduced extra procedure-reading round trips. Character counts are diagnostic, not token measurements. The entrypoint plus its always-read guide was 15,219 bytes versus 20,488 bytes before; instruction size alone was a poor proxy for runtime efficiency.

## One planned refinement

Keep the concise coordinator and the unchanged engine/contracts. Make grouping known independent reads concrete: one content operation can read several known files with filename/line provenance; separate parallel reads still incur separate tool items. Avoid heading/inventory probes before a necessary known-file read, reserve discovery for unknown paths or large corpora, and keep retrieval inside the existing workflow rather than a second reconnaissance phase. Preserve evidence invalidation, mutable-state readbacks, all checks and complete reports. Do not insert case-specific answers or fixed inspection budgets.

This is the single focused revision allowed by the committed plan. Freeze its new commit, repeat the complete 48-trial design with fresh controls and the same evaluator/tasks/settings, preserve this first outcome, and compare source-adjudicated findings and descriptions before recommending adoption.

## Limits

This is an exploratory natural-case suite with two repetitions, partial reference concerns and no exhaustive human gold labels. It measures read-only proposed reviews/actions, not tracker-write execution. Baseline-first order can warm caches. Requested models are pinned, but resolved model identities are not emitted by these CLI sessions. Controller and judge resource use is excluded. Private raw traces and tracker context are retained locally; only sanitized measurements, findings and description examples are published.
