# Review skill: guidance audit and experiment

This is an implementation audit, not a claim that every authoring practice is universally satisfied.

Primary sources, checked 2026-10-28:
- [Anthropic skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).
- [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).

| Guidance | Existing implementation | Experiment |
| --- | --- | --- |
| Be concise; assume a capable model | Strong domain rules, but the 85-line entrypoint contains about 20 KB of prose | Shorter coordinator with explicit behavior preserved |
| Reveal detail progressively | References exist, but traces show eager loading of unused branches | Explicit branch-local loading |
| Keep references shallow and discoverable | Main workflow links directly to its reference files | Preserve those direct links |
| Match freedom to task fragility | Exact markers, claims and gates; flexible technical review | Preserve this distinction |
| Use clear workflows and feedback | Review, validation, autofix and CI procedures exist | Reuse collected evidence across phases |
| Evaluate first and iterate from failures | Six frozen cases and the reusable evaluator now exist | Fresh controls, two intended models, repeated paired trials |
| Observe navigation and context use | Traces expose repeated 100 KB rule loads and roughly 1 MB search/log outputs | Path-first search and focused excerpts |
| Use scripts for deterministic repeated work | Evaluator handles measurement; review remains reasoning-heavy | No new script without a demonstrated need |
| Test the models actually intended | Initial Sol/Luna study exists | Repeat both at equal effort; Claude-family behavior remains untested |

The structure already follows much of the guidance. The measured gap is runtime context use: agents can overfetch despite layered files. The proposed reference supplies retrieval and reuse rules while leaving necessary inspection open-ended. Mandatory safety and validation never become lazy optional material.

This PR does not apply the previous Controlled English rewrite, alter report formats, change `om-code-review`, or synchronize shared references. The baseline and candidate use identical companions. See the dated specification and run plan for hypotheses, acceptance criteria and evidence limits.

Measured outcomes and the focused revision proposal: [experiment results](review-skill-optimization/results.md).
