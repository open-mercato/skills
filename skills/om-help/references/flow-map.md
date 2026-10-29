# Flow map — what SDLC.md structurally cannot carry (step 5/6)

`SDLC.md`'s Ticket lifecycle "Driven by" column is the primary routing source
(`references/routing-sources.md` §3): it names the stage and the skill, in
order, for the ~35 skills that drive a ticket from idea to merged PR. This map
holds exactly three things that table cannot: (a) which of its own named
skills are chain steps, never a direct recommendation; (b) the deciding
criterion between skills that otherwise look interchangeable; (c) the skills
that operate outside the ticket lifecycle entirely — setup, harness/meta,
reporting windows, and knowledge. It never restates a stage SDLC.md already
describes.

Every skill named below is still subject to the step-4 discovery filter and
the chain-only/flags/hard-block rules in the skill body's Rules section
(`references/skill-discovery.md`); a name here with no installed counterpart
is reported as not installed, same as a stale `SDLC.md` row.

## (a) Chain-only skills — never recommended directly

SDLC.md's "Driven by" column mixes entry points with chain steps a user never
invokes on their own (the rule and the drift finding both live in the skill
body's Rules and `references/routing-sources.md`; this table is just the
roster):

| Chain-only skill | Needs | Route to instead |
|---|---|---|
| `om-fix` | a PREVIOUS STEP block from `om-root-cause` | `om-auto-fix-issue {issueId}` |
| `om-open-pr` | a previous-step block; returns blocked without one | `om-auto-create-pr` (or whichever orchestrator already has the worktree/plan) |
| `om-auto-create-pr-loop` | invoked by `om-auto-create-pr` itself when `--loop` was passed or the plan exceeds `engine.loopStepThreshold` | `om-auto-create-pr` |
| `om-auto-continue-pr-loop` | invoked by `om-auto-continue-pr` itself when the tracking artifact is a run folder | `om-auto-continue-pr` |

`om-root-cause` and `om-verify-in-repo` are also chain steps folded into
`om-auto-fix-issue` — recommend them standalone **only** on an explicit
read-only ask ("analyse issue N, don't fix it" / "is issue N still real?").

## (b) Deciding criteria between near-duplicate skills

| Choice | What decides |
|---|---|
| `om-auto-create-pr` vs `-loop` | `om-auto-create-pr` selects this itself (its own `om-auto-create-pr/references/engine-selection.md` owns the threshold) — never recommend the loop skill up front. |
| `om-auto-continue-pr` vs `-loop` | The plan artifact: a run folder or a PR carrying `Tracking run folder:` means the loop; a flat plan file means `om-auto-continue-pr`. |
| `om-auto-fix-pr` / `om-pr-autopilot` / `om-approve-merge-pr` | State already known, never merges / state unknown, diagnose first / merge now. |
| `om-auto-review-pr` / `om-review-prs` / `om-code-review` | One PR / a sweep of other authors' unreviewed PRs (`--subagents` for a fresh reviewer per PR, `--parallel N` to bound concurrency) / a local report only, no tracker mutation. |
| `om-merge-buddy` vs `om-pr-autopilot` | A read-only scan of the whole open queue vs diagnosing and driving one PR. |
| `om-auto-implement-spec` vs `om-pre-implement-spec` | Spec readiness — see the spec-state classification in `references/context-signals.md`. |
| `om-auto-sec-report-pr` vs `om-auto-sec-report` | Security report on one unit (a PR, spec, or branch diff) vs a window of merged PRs since a date or PR number (default last 7 days). |
| `om-qa-buddy` / `om-auto-qa-pr` / `om-ux-review-pr` / `om-integration-tests` / `om-smart-test` | Human-led manual QA with a published runbook / automated browser evidence / advisory design-contract review / writes and runs E2E coverage for a flow worth keeping / re-runs only the tests affected by the diff. |
| `om-auto-fix-issue` / `om-troubleshooter` / `om-root-cause` | Issue id → unattended PR end to end / a pasted symptom with no issue, interactive / a chain step, never recommended standalone (see (a)). |
| `om-app-spec-writing` vs `om-gap-analysis` vs `om-ux-shape` vs `om-discover`/`om-brainstorm` | Business requirements for a whole app / a folder of client docs checked against the platform / a screen, state, or AI-behavior to shape / a product-level question with no brief, or one idea. |
| `om-create-skill` vs `om-create-agents-md` | Author or split a collection skill (or its overlay) vs write or refresh the repository's own `AGENTS.md`. |

## (c) Layers outside the ticket lifecycle

Five of the skills below are hard-gated on a config key or file — the
complete list of those gates lives once in `references/setup-state.md`
§Hard config gates; this table does not repeat which key gates which skill.

### Setup

| Skill | When |
|---|---|
| `om-apply-upgrade-notes` | After an upgrade of the skills collection. Never claim a descriptor is stale (no version stamp exists to prove it) — recommend `--dry-run` and let it report. |
| `om-eject-and-customize` | Customizing one part of an installed dependency. Hard-gated — see above. |

### Harness / meta

| Skill | When |
|---|---|
| `om-create-skill` | Authoring or splitting a skill; writing an overlay. |
| `om-evolve-harness` | Turning an agent failure into a harness case. Hard-gated — see above. |
| `om-judge-agent-session` | Judging a session or an eval-harness result. |
| `om-share-this-session` | Sharing a session publicly. Hard-gated — see above. |

Documented sequence when a session needs all three: share → judge →
evolve-harness.

### Reporting windows

| Skill | When |
|---|---|
| `om-auto-audit-dependencies` | Dependency advisories across every detected ecosystem. |
| `om-auto-qa-scenarios` | A QA plan for a window of merged PRs. |

### Knowledge and discovery-adjacent

| Skill | When |
|---|---|
| `om-framework-context` | The version or docs of an installed dependency; also the one owner of `knowledge.sources` (`references/agentic-setup.md`). |
| `om-gap-analysis` | A folder of client docs checked against the platform. Hard-gated — see above. |
| `om-app-spec-writing` | Business requirements for a whole app, before any ticket exists. |
| `om-figma-design-with-ds` | Design-tool work against the design contract. Hard-gated — see above. |
| `om-troubleshooter` | A pasted stack trace or error log with no issue id (the misroute this replaces: `references/routing-sources.md`). |
| `om-pre-implement-spec` | Readiness review for a spec before implementation (see (b)). |
| `om-pr-autopilot` | One open PR, state unknown — diagnose then drive (see (b)). |
| `om-help` | This skill — the router itself. |

Each name above must still clear the discovery check in
`references/skill-discovery.md` before it is ever recommended as runnable.
