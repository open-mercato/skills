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
spirit, `om-create-issue` stops merely recommending a spec for substantial
features: when none exists in the repo or an open PR, it authors one via the same
`--spec-only` spec PR and links it on the issue — its one exception to being
tracker-only, and design-only (never implementation).

## Issue skills split: create vs manage

`om-prepare-issue` conflated two jobs — filing a *new* issue and improving
*existing* ones — so it was split along that seam. `om-create-issue` owns the
create path (dedupe, spec-linking, codebase analysis, the step-2b spec PR) and now
applies the SDLC labels (category + inferred priority + risk) on creation.
`om-auto-manage-issues` owns existing issues, single or in bulk: it applies missing
SDLC labels and, for a laconic issue (a one-line body or just a title and a
screenshot), analyzes the screenshot with the terse text, clarifies the wording
non-destructively (the reporter's original is preserved), and posts the agent's
understanding as a comment to confirm. It is idempotent (adds only missing labels,
posts the understanding once) and claim-aware (skips issues another actor is
working), so it is safe to sweep the backlog — default scope is the last ~25 open
issues, worst-described first, narrowable by state/label/author/limit. The former
`om-prepare-issue` name is removed; references were updated to the two new skills.

## Deferred

- A bespoke `npx open-mercato-skills` installer CLI. skills.sh covers installation in v1.
- Shipped tracker descriptors other than GitHub. The seam (`tracker` config field + descriptor contract + `TEMPLATE.md`) ships in v1; teams write their own `linear.md`/`jira.md` from the template until popular ones are contributed back.
- Skills beyond the PR pipeline that are product-specific upstream (module scaffolding, design-system review). Two former members of this list were later generalized and extracted: `om-spec-writing` (upstream architecture laws replaced by the repo's own agent-instruction rules; specs live in the repo's design-doc area) and `om-integration-tests` (the upstream ephemeral-environment machinery was first stripped, then re-introduced in agnostic form as the standalone `om-prepare-test-env` skill — see Test environment above; a repo-local `.ai/skills/om-integration-tests` override remains the place for environment specifics). A third pair was later migrated and generalized: `om-prepare-test-env` (new, no upstream counterpart) and `om-auto-verify-pr-ui` (migrated from upstream, made stack-agnostic and tracker-optional).
- Automated sync from the upstream monorepo. Curation is manual.
