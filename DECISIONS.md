# Decisions

Engineering decisions behind this repository. Read this before proposing structural changes.

## Why a separate repository

These skills were authored and battle-tested inside the [Open Mercato](https://github.com/open-mercato/open-mercato) monorepo, where they live under `.ai/skills/` and are distributed to standalone apps by the monorepo's own tooling. An earlier internal design (spec `2026-04-24-mercato-cli-skills-sync` in the monorepo) explicitly rejected a separate skills repository — correctly, for the problem it was solving: internal distribution to scaffolded apps.

This repository solves a different problem: public adoption outside the Open Mercato ecosystem. The PR pipeline the skills implement is not product-specific; any team with a GitHub repo can run it. A separate repo lets the skills be installed with one command into any project, keeps them free of monorepo assumptions, and replaces nothing internal — the monorepo remains the source of truth for its own `.ai/skills/`, and no sync tooling between the two exists in v1. Divergence is expected and acceptable: this repo generalizes, the monorepo specializes.

## Layout

`skills/<name>/SKILL.md`, with optional `references/` and `scripts/` per skill. This is the layout the [skills.sh](https://skills.sh) CLI (`npx skills add open-mercato/skills`) scans and installs into `.claude/skills/` and the equivalent directories of other coding agents. No registry submission is required. Frontmatter contract: `name` must equal the directory name, `description` must be present — enforced by `scripts/lint.sh` in CI.

## Naming

The skills keep their upstream `om-*` names (`om-auto-create-pr`, `om-fix`, …). An earlier revision dropped the prefix; it came back deliberately, for drop-in compatibility with the upstream monorepo: with identical names, a repo that already keeps specialized versions under `.ai/skills/om-*` shadows the installed skills automatically via the repo-local override convention (see Project fit below), and existing slash-command muscle memory keeps working. The one skill with no upstream counterpart, `om-setup-agent-pipeline`, takes the prefix for consistency. One deliberate divergence from upstream naming: upstream `om-auto-fix-github` is `om-auto-fix-issue` here — with the tracker provider layer the skill fixes issues from any configured tracker, so the GitHub-specific name would misdescribe it. In a drop-in install the upstream monorepo keeps its own `om-auto-fix-github` alongside; the two do not shadow each other.

## Configuration

All skills read a single per-repo config file, `.ai/agentic.config.json`, written once by the `om-setup-agent-pipeline` skill. This mirrors the config-file design merged upstream (Open Mercato PR #3686, which replaces per-skill override documents with a wizard-generated config). Base branch, validation commands, label taxonomy, QA gate, and working paths all come from that file; nothing is hard-coded. A skill invoked in a repo without the config runs `om-setup-agent-pipeline` itself before continuing — interactively when a user is present to answer the setup questions, with `--defaults` when running unattended — so the pipeline self-configures on first use instead of bouncing the user.

## Product-agnosticism gate

CI greps `skills/**` for tokens that would betray monorepo leakage: Open Mercato product references, a hard-coded base branch name, a hard-coded package manager, and upstream-only file conventions. The `om-` prefix itself is not banned — it is the naming convention (see Naming); agnosticism is about behavior, not the name. The gate is scoped to `skills/**`; README, LICENSE, and this file may reference the upstream project.

Several tokens were initially banned and later deliberately unbanned as they turned from upstream leakage into generic, configurable conventions: `AGENTS.md` (an open standard — reading it is exactly how the skills pick up project specifics), `.ai/specs` (now the default value of the `paths.specs` config key, not a hard-coded upstream path), `BACKWARD_COMPATIBILITY.md` and the task-routing concept (now project-doc generators in `om-setup-agent-pipeline` that derive their content from the target repository, not from the upstream monorepo). The gate still bans what is genuinely product-specific: Open Mercato references, a hard-coded base branch or package manager, and upstream helper names.

## Project fit: AGENTS.md, SDLC.md, overrides

Project-specific knowledge lives in three places, none of them inside the installed skills. Machine-readable settings go in `.ai/agentic.config.json`. Prose specifics (coding standards, architecture, conventions) go in the repo's own `AGENTS.md`/`CLAUDE.md`, which every skill reads before working; `om-setup-agent-pipeline` scaffolds a starter when none exists. Per-skill behavior changes go in a repo-local skill of the same name at `.ai/skills/<skill-name>/SKILL.md`, which every installed skill checks for right after loading the config and follows when present — local rules win, but a local skill can never relax the installed skill's safety rules. A local skill that only extends the installed one `@`-imports or references it and adds rules on top; where a coding agent does not expand `@`-imports natively, "read the referenced skill and honor it" works the same. This replaced the earlier `.ai/agentic-overrides/<skill-name>.md` convention: the local variant now lives where the upstream monorepo already keeps its own skills, and is itself a complete skill — so a repo can move from extending a skill to fully owning it without changing paths, and installing this collection into the upstream monorepo makes the installed skills defer to the specialized `om-*` versions automatically. `om-setup-agent-pipeline` also generates `SDLC.md`, a human-readable description of the ticket flow the skills automate (stages, label state machine, QA gate, claim protocol), so the process is documented for people, not only encoded in skills. The same setup generates — each only when missing, always derived from the target repository rather than copied from upstream — `CODE_REVIEW.md` (repo review rules, auto-applied by om-code-review), `BACKWARD_COMPATIBILITY.md` (protected contract surfaces; review skills flag violations as Critical and implementation skills warn the user), and an `AGENTS.md` with a task-routing table built by scanning the repo layout.

## Test environment: agnostic, not stripped

An earlier revision (see Deferred) removed the upstream ephemeral-environment machinery from `om-integration-tests` entirely, leaving each skill to rediscover how to run the app. That under-served the QA path: `om-auto-verify-pr-ui` needs a *running* app to drive a browser against, and re-deriving the boot on every run is slow and non-deterministic. The resolution is a dedicated, product-agnostic skill — `om-prepare-test-env` — that owns "get the app running and make it reusable" without assuming a stack. It does one of three things, chosen from what the repo actually contains: reuse the repo's own ephemeral/test environment when it ships one (open-mercato's is exactly this case); generate Docker/testcontainers-style bring-up scripts for the project's detected backing services when a disposable environment is wanted and none exists; or run the app directly (docker/dev/production build) for apps that need no services (a static/SSR site is exactly this case). It writes a shared environment descriptor (`<paths.qa>/test-env.json`) so `om-auto-verify-pr-ui` and `om-integration-tests` attach to one booted instance instead of each booting their own. This keeps the collection agnostic — the machinery is discovered or generated per repo, never copied from upstream — while restoring the boot-once/attach-many property the upstream ephemeral env provided. Two config keys back it: `paths.scripts` (default `.ai/scripts`, generated launchers — committed, reproducible) and `paths.qa` (default `.ai/qa`, running-state descriptor + per-run QA artifacts — gitignored).

`om-auto-verify-pr-ui` is migrated from upstream but generalized on two axes beyond stack-agnosticism: it is **tracker-optional** (with a tracker + PR number it claims the PR and posts evidence as a comment; without one it verifies the local worktree and writes a JSON+Markdown report plus screenshots to `<paths.qa>/artifacts_<runId>/`), and it delegates the boot to `om-prepare-test-env` rather than hard-coding an ephemeral command. The upstream name is kept per the naming policy (drop-in compatibility with the monorepo's own `.ai/skills/om-auto-verify-pr-ui`).

## Tracker abstraction

No skill calls a tracker CLI or API directly. Skills name **tracker operations** (**get-issue**, **create-pr**, **comment-pr**, **merge-pr**, …) and a single committed descriptor file, `.ai/trackers/<tracker>.md` — selected by the config's `tracker` field and installed by `om-setup-agent-pipeline` — defines how each operation executes. The collection ships the GitHub descriptor (`gh` CLI) plus a `TEMPLATE.md` documenting the full contract; a new provider (Linear, Jira, …) is one descriptor file, no skill changes. The descriptor is a markdown instruction layer rather than code on purpose: it is read by the agent at runtime, so it works identically across coding agents, and the repo's committed copy is the override point — teams edit it to extend or replace any operation, the same "local file wins" model as repo-local skills. Split setups (issues in Linear, PRs on GitHub) implement issue operations against the issue tracker and delegate the PR sections to the GitHub descriptor. An earlier design kept `gh` calls inline in the skills and deferred extraction until a second provider existed; the extraction was pulled forward because inline calls made every skill GitHub-shaped and blocked the drop-in/override story. CI now enforces the layer: the lint gate rejects `gh` commands inside `skills/**` outside the shipped tracker descriptors.

## Browser-provider abstraction

Browser automation uses the same committed markdown-descriptor pattern as
trackers, under `.ai/browsers/<provider>.md` and selected by
`browser.provider`. The shared operation contract separates agent-driven
exploration, assertions, screenshots, and autonomous tool provisioning from the
skills that consume them. Fresh setups select agent-browser; Playwright remains
shipped as a compatibility provider, and absent config keys/legacy
`test-env.json` files continue to mean Playwright. Repository-native E2E suites
stay authoritative regardless of the exploration provider. This boundary avoids
hard-wiring every QA skill to a single CLI while keeping the repo's committed
descriptor as the customization point.

## Feature-request path: spec-then-implement

Bugs and feature requests need different triage. The autofix chain's gate
(`om-verify-in-repo`) proves a defect is real and still unfixed — the wrong
question for a feature, which has no bug to reproduce and would be wrongly stopped
with `NO_ACTION_NEEDED`. So the issue entry path now classifies first:
`om-auto-fix-issue` routes a feature request to the new `om-auto-implement-issue`,
which composes `om-spec-writing` and `om-auto-create-pr` — it confirms the feature
is unbuilt, lands a spec on the PR as the first commit (design visible before
implementation), then implements the spec phase-by-phase through the existing
worktree/validation/label/review machinery. The new skill is a thin router that
delegates to those two skills rather than duplicating their protocols. In the same
spirit, `om-prepare-issue` stops merely recommending a spec for substantial
features: when none exists in the repo or an open PR, it authors one via the same
`--spec-only` spec PR and links it on the issue — its one exception to being
tracker-only, and design-only (never implementation).

`om-spec-writing`'s Open Questions gate is a hard human stop, which is correct when
a person is driving but would strand an `om-auto-*` run (e.g. `om-auto-fix-issue`
routing a feature request, or `om-prepare-issue` authoring a required spec). Since
the `om-auto-*` family is autonomous by definition, `om-auto-implement-issue` runs
**autonomous by default**: instead of stopping at the gate it resolves each open
question with a conservative, reversible default, records the assumptions in the
spec, and posts the questions + applied defaults as an issue/PR comment for a human
to override before merge — keeping the PR draft/`needs-qa` when any default is
high-stakes. A `--interactive` flag opts back into the human stop for the cases
where a person wants to make the design calls. Progress beats stalling, as long as
every assumption is surfaced and reversible and nothing merges on assumptions
alone.

A user-facing FR also ends with UI proof: `om-auto-implement-issue` runs
`om-auto-verify-pr-ui` (evidence-only) after implementation, so a real-browser
pass/fail report and screenshots land as a PR comment via `attach-image-evidence`.
It stays evidence-only — screenshots for the reviewer, `needs-qa` kept, never a
self-granted `qa-approved` — and is skipped for non-UI FRs, `--no-ui`, or when no
runnable UI surface exists. A UI-verify that cannot run is noted, not fatal: the PR
is still implemented and reviewed.

## Issue skills split: create vs manage

`om-prepare-issue` conflated two jobs — filing a *new* issue and improving
*existing* ones — so the second job was split out. `om-prepare-issue` keeps its
name and owns the create path (dedupe, spec-linking, codebase analysis, the
step-2b spec PR) and now also applies the SDLC labels (category + inferred priority
+ risk) on creation. A new sibling, `om-auto-manage-issues`, owns existing issues,
single or in bulk: it applies missing SDLC labels and, for a laconic issue (a
one-line body or just a title and a screenshot), analyzes the screenshot with the
terse text, clarifies the wording non-destructively (the reporter's original is
preserved) via the new **update-issue** tracker operation, and posts the agent's
understanding as a comment to confirm. It is idempotent (adds only missing labels,
posts the understanding once) and claim-aware (skips issues another actor is
working), so it is safe to sweep the backlog — default scope is the last ~25 open
issues, worst-described first, narrowable by state/label/author/limit.

## One PR opener, reused: pr-open-reuse + implement-by-continuation

Several skills open or update PRs, and `om-auto-implement-issue` opens a spec-first
PR and then needs to implement it — which naively means running `om-auto-create-pr`,
which opens *its own* PR. That second PR is a collision. Two decisions resolve it:

- **`om-auto-implement-issue` implements by continuation, not by create.** After it
  opens the one spec PR (with a tracking plan), implementation is handed to
  `om-auto-continue-pr` (or `om-auto-continue-pr-loop` for a large, many-step spec —
  the skill chooses per the plan size, which also dictates the plan format it
  writes). The continue skills resume from the plan **on the existing PR** and reuse
  the identical implement/validate/review/label/summary machinery without opening
  anything new. So there is exactly one PR.
- **PR opening + labeling is one reusable procedure**, documented once in
  `om-auto-create-pr/references/pr-open-reuse.md` and pointed at by the create,
  continue, and implement skills: **prefer the `om-open-pr` skill when it is
  installed** (it already implements commit → push → open draft PR → normalize
  labels, so reuse it instead of duplicating), and **fall back to the inline
  `create-pr` + label path when it is not** — `om-open-pr` is an optional
  enhancement that removes duplication without changing behavior, so a repo that
  installs `om-auto-create-pr` alone still works. The invariant across all of them:
  never open a second PR for work that already has one.

`om-auto-manage-issues` also gained a read-only implementation-prep pass: it can run
a root-cause/impact analysis (delegating to `om-root-cause` for bugs when installed)
and post it as an "implementation notes" comment so an existing issue is ready to
fix — autonomously, never interactively, and defaulting off for batches because it
reads code per issue.

## PR-side driver: om-auto-fix-pr

The issue side had a single-command end-to-end driver (`om-auto-fix-issue`); the PR
side did not — getting a PR merge-ready meant running `om-auto-review-pr`,
`om-stabilize-ci`, and `om-auto-verify-pr-ui` by hand and remembering to update the
branch first. `om-auto-fix-pr` is that missing driver: it merges the latest base in
first, then loops review-autofix → CI-stabilize → UI-verify (re-merging base when it
advances) until the PR is approvable, green, and QA-evidenced. It is a pure
orchestrator — it delegates every hard step to the existing skills rather than
duplicating their logic — and it deliberately stops short of merging: it leaves the
PR merge-ready and hands off to `om-approve-merge-pr`/`om-merge-buddy` so the QA gate
stays the single enforcement point. Two behaviors are explicit: non-blocking review
findings (nits/low/out-of-scope) become follow-up issues via
`om-followup-issue-from-pr` instead of blocking or bloating the PR, and fork PRs keep
the carry-forward supersede/credit rules from `om-auto-review-pr`'s fork flow.

## 2026-07-20 — Skill consolidation: four fewer skills, standard step files per skill

Four changes reduced the collection to thirty skills without losing behavior:

- **`om-auto-verify-pr-ui` → `om-auto-qa-pr`**, and it now checks the PR's review state first: on an unreviewed PR it runs `om-auto-review-pr` before the browser UI QA, so a code review always precedes the UI pass. The rename also drops the "verify" framing for the plainer "QA".
- **`om-sync-merged-pr-issues` → `om-close-fixed-issues`** — a plain rename to name the skill after what it does (close the issues a merged PR authoritatively fixes); behavior is unchanged.
- **`om-stabilize-ci` absorbed into `om-auto-fix-pr`.** CI stabilization was only ever invoked from the PR driver, so a standalone skill meant a second thing to install and keep in sync. Its procedure is now `om-auto-fix-pr`'s own step, and a new `--ci-only [--branch <name>]` mode covers the standalone use it previously served — a plain branch or no-PR change driven to green CI.
- **`om-auto-implement-issue` absorbed into `om-auto-fix-issue`.** The router was a thin dispatcher over the bug and feature routes; folding it in makes `om-auto-fix-issue` the single issue-to-PR entry point. It classifies the issue, sends bugs down the fix chain, and takes features through the feature route — claim, spec resolution (author via `om-auto-write-spec` when none exists, implement via `om-auto-implement-spec`), and contract verification — on one PR. `--spec-only` still stops after the spec PR.

Alongside the consolidation, every skill's repeatable procedures now live in per-skill `references/<step>.md` files under standard names (`agentic-setup.md`, `worktree-setup.md`, `claim-pr.md`, `pr-finalize.md`, `review-report.md`, `rules.md`); `SKILL.md` keeps the numbered main algorithm, and `om-auto-create-pr` holds the canonical copy. These standard files are **deliberately duplicated in each skill that uses them** rather than shared through cross-skill file pointers. The decision is standalone installability over DRY: a skill cherry-picked with `npx skills add … --skill <one>` must run without depending on a file that lives inside a sibling skill. The cost is that a standard step file edited in one skill can drift from the others, so the contributor rule (now recorded in AGENTS.md) is: when you change a standard file in one skill, ask whether to sync the others.

## 2026-07-21 — Chain locks are handed off, never dropped and re-acquired

The autofix chain's original contract released the issue lock in `om-open-pr` and let `om-auto-review-pr` "claim the PR fresh." That left a window — observed on a production PR (open-mercato/skills#39) and reproduced deterministically on the skills-evaluation mock repo — where the PR under active review carried **no** lock signal at all: a concurrent actor's three-signal check read "not in progress" and could legitimately start duplicate work, and humans watching the tracker saw no owner and no state. Worse, because the parent skill framed the chained review as an embedded engine run, the descriptive "it will claim fresh" re-claim was skippable in practice — the production round-1 review ran with no claim comment ever posted.

The contract is now transfer-based. `om-open-pr --handoff <next-skill>` claims the PR for the chain (assignee + `in-progress` + hand-off comment) *before* releasing the issue lock; every downstream skill treats an inherited same-user lock as re-entry, posts a take-over comment naming itself **before any work product**, and never releases a lock its run did not open — the chain's driving skill releases exactly once, at the end of its run or on its failure path. The generic contract lives in every skill's `references/claim-pr.md` under "Chained hand-off" (synced across all copies per the standard-file rule); `om-auto-fix-pr`'s pre-existing outer-lock pattern is the same idea and is unchanged.

In the same change, `om-auto-fix-issue`'s bug route gained a UI-verification step: a fix whose diff touches a user-facing surface gets `om-auto-qa-pr` evidence whether or not a spec exists (previously UI QA only ran on the spec-driven routes), skippable with `--no-ui`.

## 2026-07-23 — Atomic spec PRs, autofix opt-in, one label-rationale comment, templated reporting

Four related course-corrections from production use (open-mercato/cezar#621, #624):

- **Atomic spec PRs — implement-by-continuation reversed.** The earlier decision ("One PR opener, reused" above) had `om-auto-implement-spec` grow the implementation on the spec PR's branch and "reframe" the PR (title/body/label rewrite) once code landed. In practice that mixed two review lifecycles in one diff and broke the atomic-PR principle. Now the spec PR is a design deliverable that stays design-only; implementation always ships on its **own PR** carrying `Refs #{specPr}` + `Source doc:`, the continue skills refuse to land implementation on a spec-only branch (they hand off to `om-auto-implement-spec`), and the whole reframe machinery is deleted. "Never a second PR" still holds where it matters: one **implementation** PR per spec, resumed rather than duplicated.
- **Review autofix is opt-in on foreign PRs.** `om-auto-review-pr` pushed fixes to any PR it reviewed — including other people's. Now one flag decides (`AUTOFIX_ELIGIBLE`, set in its step 2): the loop runs only when the PR author is the automation identity or `--autofix` was passed; otherwise the run ends with review + labels + author handoff. The fixing chains (`om-auto-fix-pr`, `om-auto-fix-issue`) pass `--autofix` explicitly; `om-review-prs` sweeps review-only.
- **One label-rationale comment, updated in place.** Per-change one-sentence label comments plus a `·`-concatenated consolidated comment produced duplicate, hard-to-read timelines (and Codex runs dropped the emojis entirely). The contract is now a single marker-idempotent `🏷️ label rationale` comment per skill per PR/issue — one label per line with its emoji and a full-sentence reason — rewritten via the new **update-comment** tracker operation on every label change. `mark-pr-ready` is exercised wherever a run makes a draft PR merge-ready.
- **Reporting is template-based and deliberately un-laconic.** Output quality diverged by runtime (rich on Claude, terse on Codex) because most report shapes were inline prose with "concise" wording. Every skill's user-facing report/comment shapes now live in `references/report-templates.md` (or the template file its steps name, e.g. `om-code-review`'s `output-format.md`), emoji-structured with full-sentence guidance, and every `rules.md` copy carries binding "Label commentary" and "Reporting style" rules. Machine-parsed chain contracts (`om-root-cause` brief, `om-fix`/`om-open-pr` output contracts, chaining reference lines) deliberately stay plain. **Amended on 2026-08-13 below:** completeness remains mandatory, but a human-facing channel may use a bounded projection of a fuller agent artifact.

## 2026-08-13 — Review reports split the agent and PR audiences

The 2026-07-23 decision correctly made templates, complete sentences, and the
reason behind every verdict/finding mandatory, but it used output volume as a
proxy for completeness. PR #80 approved a narrower rule: `om-code-review`
keeps an exhaustive agent/chain artifact, while the PR review body is a bounded
projection with mandatory title/mode, verdict and counts, validation outcome,
every blocker and major with its fix, lower-severity counts, test gaps, and any
compatibility marker. Mandatory safety content may exceed the limit; it is
never omitted. Lower-severity detail renders only while budget remains, with an
exact omitted count pointing to the full run report.

This is a channel contract, not permission for terse improvisation. Templates,
full sentences, concrete rationale, deterministic fallback to the full report,
and machine-parsed chaining/CEZ markers remain binding. To avoid contradictory
installed skills, the implementation updates all 34 `references/rules.md`
copies and affected report-template preambles in one PR; the user explicitly
selected the collection-wide sync during PR #80's review.

## 2026-07-24 — Executor placement is plan-time data; abstract model tiers per executor

The loop skills' executor-dispatch trigger ("many Steps SHOULD dispatch") was a run-time judgment call, re-made on every resume with less context than the planner had. Placement now lives in a new `Exec` column of PLAN.md's Tasks table (`inline` / `dispatch` / `group:<id>`, optional `:cheap|:standard|:capable` tier suffix), filled once at planning time and followed mechanically by the dispatcher — decided with full context, committed, auditable, stable across resumes. Tiers are abstract, never vendor model names (the collection installs into arbitrary harnesses): harnesses with subagent model selection map them best-effort, others ignore them — and since mechanical complete-spec Steps are transcription work, the cheap tier removes the cost reason to keep small independent Steps inline. Grouped Steps still land one commit per Step (bisect-by-Step is untouched), and plans without the column keep today's run-time heuristic exactly. Tiers also work ex post: a problematic executor result gets one rescue attempt on a fresh executor one tier above (bounded — one rescue per Step, never above `capable`) before the safety stops halt the run, so a transient capability shortfall self-heals instead of parking the whole run for the user.

## 2026-07-24 — Engine self-routing: om-auto-create-pr owns plain-vs-loop

The plain-vs-loop decision moved from `om-auto-implement-spec` into `om-auto-create-pr` itself: the engine drafts its execution plan, counts the Steps, and hands off to `om-auto-create-pr-loop` when `--loop` was passed or the count exceeds the new `engine.loopStepThreshold` config key (default 20, previously hard-coded). A bare brief now escalates exactly like a spec run, and the orchestrators only forward `--loop` and pick create-vs-continue — on resume the run's artifact format (`Tracking plan:` file vs `Tracking run folder:`) selects the continue engine, never a re-applied count, since the plan format is fixed at creation. The canonical rule moved to `om-auto-create-pr/references/engine-selection.md`, owned by the skill that executes it.

## 2026-07-24 — Review granularity is a config decision (engine.stepReview)

The loop engines code-reviewed once, at the end of the run — so on a long run an early defect survives until the final review while later Steps build on it, and unwinding it then costs more than catching it near the Step that introduced it. `engine.stepReview` makes the detection latency a team decision: `final` (default — exactly today's behavior and cost), `checkpoint` (review the diff at every checkpoint pass, detection within ~5 Steps), `per-step` (review each Step's commit as it lands, for high-risk work). Mid-run reviews are scoped diffs judged against the `om-code-review` checklist without its full validation gate (scoped validation already ran; the full gate stays at checkpoints and the final gate); blocker/major findings are fixed immediately as `X.Y-review-fix` Steps in a bounded 2-round loop, minors defer. The authoritative end-of-run review pass is unchanged in every mode — step review is an internal gate that posts nothing to the tracker, so the PR review surface stays single-sourced.

## 2026-07-25 — om-brainstorm: a pre-artifact entry point that ends in a routing decision

Every entry point into the collection consumed an artifact — a brief, an issue, a spec, or a PR — so the divergent phase that produces the brief (question the problem, weigh alternatives, decide whether to build at all) happened outside the pipeline, and orchestrators had no conversation-shaped run to offer. `om-brainstorm` is that phase as a skill: interactive-only per the naming contract (no `auto` prefix, no autonomous mode — an unattended invocation stops and reports), read-only on the repository except one user-confirmed handoff brief under `${SPECS_DIR}/briefs/`. Its machinery is the generalized core of the removed `om-app-spec-writing` (challenger subagent, HARD-GATE, ask-the-user-only-what-has-no-other-source), inverted from batched gate questions to open questions one at a time. The conclusion is a machine-parsed routing contract — `Next: none` | `Next: om-<skill> <args>` plus `Brief: <path>` — so the human phase ends in exactly one place and the autonomous pipeline takes over from there. Base ramps route only to collection skills; repo-specific ramps (e.g. an app-spec authoring skill) belong in the repo-local `.ai/skills/om-brainstorm` extension, which may add ramps but never remove the confirmation gate or widen the write surface. The tracker check is deliberately optional and read-only (search-issues / search-prs / get-issue, never auto-running setup): a brainstorm must run in a repo with no pipeline configured at all.

## 2026-07-28 — om-pr-autopilot: a dispatcher above the engines, not a wider engine

Every execution step for an open PR already existed — `om-auto-continue-pr` finishes a planned implementation, `om-auto-fix-pr` drives base merge plus review plus CI plus UI QA, `om-auto-qa-pr` captures evidence, `om-approve-merge-pr` merges — but choosing between them required the operator to already know what state the PR was in, which is the one thing they usually do not. `om-pr-autopilot` makes that routing decision explicit and reviewable: ten read-only signals produce a `PR State Report`, an ordered state matrix maps the report onto a chain, and the chain runs with a re-diagnosis between steps.

The obvious alternative — fold the diagnosis into `om-auto-fix-pr`, since it already contains most of the chain — was rejected. It would give one engine two jobs (decide and execute), and the rows the dispatcher skips are not `om-auto-fix-pr`'s to skip: the plan-continuation rows belong to a different engine entirely, and the merge row is deliberately outside every engine. Keeping the router thin is what lets the overlap be resolved by *skipping matrix rows after re-diagnosis* rather than by an engine detecting its own redundancy from the inside. The dispatcher therefore re-implements nothing: it diagnoses, sequences, and reports.

Two consequences worth recording, because both look like defects until the reasoning is visible. First, the fork split is on `PUSHABLE` (same repo, or your own fork) rather than on `isCrossRepository`, since contributors commonly work from their own fork where push access does exist; routing those into the carry-forward flow would abandon the branch and open a duplicate PR crediting its own author. `PUSHABLE` governs the *mechanism* only — *authorship* independently governs permission, so a colleague's PR on a same-repo branch is pushable and still limited to review plus handoff. Second, `om-merge-buddy` is not a companion of this skill: it is a read-only scan of the whole open queue, not a step that drives one PR, so it appears in no matrix row and its absence never stops a run.

**Naming carve-out.** The skill is autonomous by default yet carries no `om-auto-` prefix, which `README.md` states as a convention. The prefix marks skills that take a *brief* and run end-to-end unsupervised; this one takes a PR number and dispatches, and naming it `om-auto-pr-autopilot` would stutter while `om-auto-pilot` would misdescribe it. The convention was already loose in exactly this direction (`om-review-prs` and `om-close-fixed-issues` are autonomous without the prefix), so the carve-out is recorded here rather than re-litigated per PR — and recorded *before* release, since `BACKWARD_COMPATIBILITY.md` §1 protects skill names and a later rename would require a deprecated alias kept for a release cycle.

## 2026-08-01 — A retro skill reads the pipeline's own history, and ships the first executable

`om-pipeline-retro` classifies finished runs rather than open ones, so the collection can measure what its own second passes cost instead of arguing about it. Read-only by construction: it never claims, mutates, or files anything, and hands a cause to `om-prepare-issue` only when the user asks.

Two choices worth recording. The deterministic classifier ships as a shell script under `references/` rather than under a per-skill `scripts/` directory, because `scripts/lint.sh` resolves every `references/…` pointer and would catch a broken one in CI, where a `scripts/` path is unchecked; it is the collection's first shipped executable, and the skill body carries an inline fallback so a harness that cannot spawn a shell still reaches the same classes. Run counting keys on the claim boilerplate's opening comments ("started by", "taking over") rather than on marker density, because a single run posts several marker comments and time-clustering alone reported ordinary runs as rework.

## 2026-09-02 — Definition of Ready is a gate at Intake, in two tiers

The lifecycle started at a ticket with "enough detail to act on", which nothing checked, so an autonomous feature run could spec and implement around a ticket that never said who has the problem or what outcome is expected — the assumptions comment (#64) surfaces such defaults at merge, but by then the code exists. The generated `SDLC.md` now carries a Definition of Ready, and two skills enforce it: `om-auto-manage-issues` reports `READY_STATUS`, and `om-auto-fix-issue`'s feature route stops with `NOT_READY`.

The list is split in two tiers on purpose. *Ticket-level* items (problem, user or role, expected outcome and its check, out of scope, blocking questions, confirmed assumptions) are the ones a spec cannot supply without inventing them, so a gap there is a clean stop that names the gap on the ticket. *Spec-level* items (acceptance criteria, business rules, paths, data and permissions, dependencies, prototype link) are exactly what `om-auto-write-spec` produces, so a gap there authors the spec as before. A single flat checklist was rejected: it would either stop every feature that lacks a spec (undoing the autonomous feature route) or let a guessed problem statement through (undoing the gate). A new label (`needs-definition`) was rejected for the same reason as in #64 — a cleared-state that blocks other automation; the idempotent not-ready comment carries the same information with no schema change. The Discovery row (#59) and the before-intake / after-merge paragraphs landed in the same change so the document's scope matches what the collection does.

## Deferred

- A bespoke `npx open-mercato-skills` installer CLI. skills.sh covers installation in v1.
- Shipped tracker descriptors other than GitHub. The seam (`tracker` config field + descriptor contract + `TEMPLATE.md`) ships in v1; teams write their own `linear.md`/`jira.md` from the template until popular ones are contributed back.
- Skills beyond the PR pipeline that are product-specific upstream (module scaffolding, design-system review). Two former members of this list were later generalized and extracted: `om-spec-writing` (upstream architecture laws replaced by the repo's own agent-instruction rules; specs live in the repo's design-doc area) and `om-integration-tests` (the upstream ephemeral-environment machinery was first stripped, then re-introduced in agnostic form as the standalone `om-prepare-test-env` skill — see Test environment above; a repo-local `.ai/skills/om-integration-tests` override remains the place for environment specifics). A third pair was later migrated and generalized: `om-prepare-test-env` (new, no upstream counterpart) and `om-auto-verify-pr-ui` (migrated from upstream, made stack-agnostic and tracker-optional).
- Automated sync from the upstream monorepo. Curation is manual.
