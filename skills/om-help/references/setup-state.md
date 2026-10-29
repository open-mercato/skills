# Setup-state probe (step 3)

A cheap, read-only sweep of on-disk signals that tells "this repository hasn't
set up a capability" apart from "this request is blocked until it does."
Run it after reading the context (step 2) and before discovering installed
skills (step 4); every signal below degrades to a context note unless the
table marks it a hard gate.

## Context vs. blocker

Most gaps here are **context**, not a stop: name the gap in the answer, let
the capability's own skill run its own setup (most tracker-driven skills do
this already), and keep routing. A gap is a **hard gate** only when the
destination skill genuinely cannot produce a result without it — the
"Hard config gates" list below is the complete set of those; everything else
in the probe matrix is informational.

## Probe matrix

| Signal | Route |
|---|---|
| No `.ai/agentic.config.json` | `om-setup-agent-pipeline`. Context, not a blocker: most tracker-driven skills run setup themselves. `om-apply-upgrade-notes` and `om-pipeline-retro` are the two that stop instead — name that when routing to either. |
| Config present, `.ai/trackers/<tracker>.md` missing | A setup gap. Report it in the answer (previously skipped silently) — every tracker-dependent context signal in step 2 is unavailable until it exists. |
| `browser.provider` is null | Legacy Playwright is in use; browser-dependent skills (`om-auto-qa-pr`, `om-prepare-test-env`) still work. |
| Explicit `browser.provider`, but `.ai/browsers/<p>.md` missing | A setup gap — re-run `om-setup-agent-pipeline` to install the descriptor. |
| No `## Definition of Ready` heading in `SDLC.md` | The ticket-readiness gates in `om-backlog`, `om-auto-manage-issues`, and `om-prepare-issue` degrade to plain ticket hygiene — name that when routing to any of them. |
| `discovery.enabled` is true, but no `<!-- discovery:start -->` block in `SDLC.md` | `om-setup-discovery-pipeline --refresh`. |
| No `<paths.scripts>/test-env-up.*` | Context, not a blocker — QA skills invoke `om-prepare-test-env` themselves. `test-env.json` is gitignored; check for the launcher script, never the JSON. |
| No `.uxproof/contract.json` | `om-ux-setup`. Hard gate only for `om-figma-design-with-ds`; `om-ux-review-pr` degrades to a plainer pass without it. |
| No `AGENTS.md` and no `CLAUDE.md` | `om-setup-agent-pipeline` writes a starter. |
| No Task Router table in `AGENTS.md` | `om-create-agents-md`. |

## Hard config gates

These five block their one destination skill outright — no inline degrade exists:

| Gate | Blocks |
|---|---|
| No `harness` block | `om-evolve-harness` |
| `sessionShare.enabled` not `true` | `om-share-this-session` |
| No eject recipe in the dependency's `knowledge.sources` | `om-eject-and-customize` |
| No `platform.*` block | `om-gap-analysis` |
| No `design.provider` | `om-figma-design-with-ds` |

## What this probe cannot see

Stale descriptors and unapplied upgrade notes are undetectable from disk:
descriptors carry no version stamp, and applying upgrade notes leaves no
record. Never claim a descriptor or config is "out of date." When the user
says they upgraded the skills, the answer is always
`om-apply-upgrade-notes --dry-run` — a report, never a guess.
