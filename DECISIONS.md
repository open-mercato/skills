# Decisions

Engineering decisions behind this repository. Read this before proposing structural changes.

## Why a separate repository

These skills were authored and battle-tested inside the [Open Mercato](https://github.com/open-mercato/open-mercato) monorepo, where they live under `.ai/skills/` and are distributed to standalone apps by the monorepo's own tooling. An earlier internal design (spec `2026-04-24-mercato-cli-skills-sync` in the monorepo) explicitly rejected a separate skills repository — correctly, for the problem it was solving: internal distribution to scaffolded apps.

This repository solves a different problem: public adoption outside the Open Mercato ecosystem. The PR pipeline the skills implement is not product-specific; any team with a GitHub repo can run it. A separate repo lets the skills be installed with one command into any project, keeps them free of monorepo assumptions, and replaces nothing internal — the monorepo remains the source of truth for its own `.ai/skills/`, and no sync tooling between the two exists in v1. Divergence is expected and acceptable: this repo generalizes, the monorepo specializes.

## Layout

`skills/<name>/SKILL.md`, with optional `references/` and `scripts/` per skill. This is the layout the [skills.sh](https://skills.sh) CLI (`npx skills add open-mercato/skills`) scans and installs into `.claude/skills/` and the equivalent directories of other coding agents. No registry submission is required. Frontmatter contract: `name` must equal the directory name, `description` must be present — enforced by `scripts/lint.sh` in CI.

## Naming

The upstream skills carry an `om-` prefix (`om-auto-create-pr`). The prefix is dropped here: the repository name already carries the branding, and installed skill names should read as verbs for the workflow, not as vendor identifiers. One rename beyond the prefix drop: upstream `om-fix` became `apply-fix`, because a bare `fix` is too generic as a command name.

## Configuration

All skills read a single per-repo config file, `.ai/agentic.config.json`, written once by the `setup-agent-pipeline` skill. This mirrors the config-file design merged upstream (Open Mercato PR #3686, which replaces per-skill override documents with a wizard-generated config). Base branch, validation commands, label taxonomy, QA gate, and working paths all come from that file; nothing is hard-coded. A skill invoked in a repo without the config stops and points the user at `setup-agent-pipeline`.

## Product-agnosticism gate

CI greps `skills/**` for tokens that would betray monorepo leakage: the `om-` prefix, Open Mercato references, a hard-coded base branch name, a hard-coded package manager, and upstream-only file conventions. The gate is scoped to `skills/**`; README, LICENSE, and this file may reference the upstream project.

## Deferred

- A bespoke `npx open-mercato-skills` installer CLI. skills.sh covers installation in v1.
- Issue trackers other than GitHub. `setup-agent-pipeline` is GitHub-only in v1.
- Skills beyond the PR pipeline (module scaffolding, design-system review, integration testing). Those are product-specific upstream and were deliberately not extracted.
- Automated sync from the upstream monorepo. Curation is manual.
