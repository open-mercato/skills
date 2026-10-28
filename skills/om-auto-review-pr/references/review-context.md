# Collect evidence once per revision

This is retrieval guidance for the existing workflow. It never removes a review check, validation command, safety rule or required tracker readback.

## Reuse a complete working context

Keep the PR identity, base/head revisions, changed paths, mode, config, applicable instructions, feedback and validation evidence together. A path or result already read in full need not be printed again for another phase. Pass that material and its provenance to `om-code-review`; its workflow and gates still run. A companion may use evidence already in its context instead of fetching the same bytes again.

Load setup and shared rules every run. Other references are branch procedures: read their needed sections when their workflow step applies. Do not preload autofix, fork replacement, manual-QA, label-transition or CI-wait detail for branches that do not execute. Keep every reference reachable from the main workflow.

Reuse requires the same content and scope. A changed head, base, config, rule, dependency state or generated input invalidates affected evidence. Refresh mutable tracker state at the descriptor's required readbacks, after mutations and during CI follow-up. Never substitute old or supplied results for a validation execution that the engine or local rules require. Distinguish observed execution from attributed evidence.

## Batch independent collection

Request a sufficient PR metadata snapshot for both claim checking and review setup. Fetch missing fields rather than repeating a complete request. Collect conversation and inline feedback once; deduplicate by issue while retaining author, source and disposition. Fixed, explicitly declined or deferred feedback does not silently become a new mandatory request.

Batch known independent reads and queries in one tool invocation when supported. Keep dependent actions, claim decisions, mutations and adaptive follow-ups sequential. Do not repeat successful status queries or print a file twice merely because another workflow step mentions it.

## Find paths before printing contents

Start from the changed-file inventory and the repository's task router. Read the applicable instructions, checklists and compatibility policy once. Find relevant implemented specs and current consumers by filename/path and exact symbols, then read the matching sections and sufficient surrounding code. Resolve documented exceptions before turning a general convention into a finding.

Prefer a narrow search over the changed area or known consumers. Use a file-list search before a content search across a large docs/spec tree. Inspect headings or matching line locations before printing a long file. Expand the scope when a dependency, ambiguity or evidence gap requires it. Do not dump an entire corpus or concatenate unrelated procedures. Do not truncate a necessary finding or stop analysis at a tool-call budget.

For example, discover matching spec paths, then inspect their contract sections; do not print every line mentioning a common domain word. For a boundary change, inspect the actual producer, consumer and failure/retry path rather than treating a search hit as proof. Across multiple writes, trace commit boundaries, later failures and recovery as well as the successful path.

## Inspect CI evidence at its source

Use structured check/workflow state for the exact head before reading logs. Preserve required-check fallback and the descriptor's workflow-completeness guard. For large logs, locate the configured command, its result, scope/filter and relevant failures, then print those excerpts. Compare an alternate invocation with the actual script/alias before calling it equivalent.

Cover every configured gate row. A scoped task, intentional skip, pending run or unavailable log is not an unqualified full-suite pass. Read more when the association, scope or outcome is ambiguous. Never infer absence from an empty pattern match alone, and never clear a captured conflict or failed check merely because a local preview or search did not reveal it.

## Keep one evidence-backed result

Produce the engine's complete artifact and its required human projection. Avoid a second inventory or rewritten report merely to hand the same facts between phases. Preserve every actionable finding, material qualification, validation result and parser marker. Link existing detail in follow-ups; refresh and explain only what changed.
