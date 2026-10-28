# om-pipeline-retro

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Classifies work the pipeline already finished and answers one question: how often did a change reach merge in a single pass, and what stopped it the rest of the time? It reads merged and closed-unmerged pull requests through the configured tracker, reconstructs each run from the standard agent marker comments, and sorts every run into one of four outcomes — clean single pass, hard recovery with the reason on the record, loop checkpoints posted by design, or a second pass whose cause nobody wrote down. Causes are then ranked by the wall-clock hours they cost beyond a clean run, so the most expensive problem is the one at the top rather than the one that happened most recently.

The verdict is deterministic: evidence comes from the tracker, the classification comes from a script that reads the assembled data on stdin and contacts nothing. It is strictly read-only — it never merges, edits, comments, or labels anything.

The count it reports of second passes with no recorded cause is a measurement of the pipeline's own record-keeping. Runs become classifiable once the skills driving them post their standard marker comments, and become fully explainable once those reports state an outcome.

## Parameters

- `--since <YYYY-MM-DD>` — how far back to look. Default: 30 days ago.
- `--limit <n>` — the most pull requests to examine per state, so a run examines up to twice this many and makes one tracker call for each. Default: 30.
- `--gap-minutes <n>` — the fallback window for a skill that posts no opening comment: marker comments further apart than this count as separate runs. Default: 60.

## Works with

Reads finished pull requests and their comments, reviews, and labels through the tracker, and produces a classified report only. When you decide to act on the top-ranked cause, it hands off to [om-prepare-issue](om-prepare-issue.md), which deduplicates against existing issues and labels the result itself.

---
*Source: [`skills/om-pipeline-retro/SKILL.md`](../../skills/om-pipeline-retro/SKILL.md)*
