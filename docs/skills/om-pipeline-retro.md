# om-pipeline-retro

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Classifies work the pipeline already finished and answers one question: how often did a change reach merge in a single pass, and what stopped it the rest of the time? It reads merged and closed-unmerged pull requests through the configured tracker, reconstructs each run from the standard agent marker comments, and sorts every run into one of four outcomes — clean single pass, hard recovery with the reason on the record, loop checkpoints posted by design, or a second pass whose cause nobody wrote down. Causes are then ranked by the wall-clock hours they cost beyond a clean run, so the most expensive problem is the one at the top rather than the one that happened most recently.

The verdict is deterministic: evidence comes from the tracker, the classification comes from a script that reads the assembled data on stdin and contacts nothing. It is strictly read-only — it never merges, edits, comments, or labels anything.

The count it reports of second passes with no recorded cause is a measurement of the pipeline's own record-keeping. Runs become classifiable once the skills driving them post their standard marker comments, and become fully explainable once those reports state an outcome.

## Parameters

- `--since <YYYY-MM-DD>` — how far back to look. Default: 30 days ago.
- `--limit <n>` — the most pull requests to examine per state, so a run examines up to twice this many and makes one tracker call for each. Default: 30.
- `--gap-minutes <n>` — the fallback window for a skill that posts no opening comment: marker comments further apart than this count as separate runs. Default: 60.
- `--sessions [<dir|file>]` — also read saved agent session exports. Omit the value to search the conventional locations (`.ai/session-exports/`, `.ai/sessions*.json`). Off by default.

## Saved sessions

The tracker only knows what a run chose to post, so a run that was interrupted before it could report — or that never opened a pull request at all — leaves nothing there. That is what the "cause not stated" bucket is made of. The evidence usually still exists on the machine that produced it, as a saved session export, and `--sessions` reads it.

Those exports are sensitive: a raw agent transcript can carry credentials, private prompts, absolute paths, and the full output of every tool the run invoked. So the skill never reads one. A verifier script opens the files and emits only derived data — a hygiene verdict, the skills the session names, the request it belongs to, its declared outcome, its causes — and the transcript itself never enters a context window, a report, or the repository. Sessions appear in the report by filename alone.

Verification comes before classification and has its own verdict. A session file that the repository *tracks*, or that sits inside the repository without being ignored, is reported ahead of every retro figure and its contents are not read at all — a committed transcript is a live exposure, and that matters more than any number in the report.

What sessions add: a cause for a run whose pull request recorded none, and one signal the tracker cannot show at all — a run that opened and never recorded a completion, which is a run that did not finish. What they never add: a run count (one session is one run, so counts stay single-sourced from the tracker), a demotion out of a class the tracker established, or a guess. A verified session that belongs to no request in the window is reported as exactly that: a run that left no readable trace anywhere in the tracker.

## Works with

Reads finished pull requests and their comments, reviews, and labels through the tracker, and produces a classified report only. When you decide to act on the top-ranked cause, it hands off to [om-prepare-issue](om-prepare-issue.md), which deduplicates against existing issues and labels the result itself.

---
*Source: [`skills/om-pipeline-retro/SKILL.md`](../../skills/om-pipeline-retro/SKILL.md)*
