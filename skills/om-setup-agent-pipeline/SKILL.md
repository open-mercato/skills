---
name: om-setup-agent-pipeline
description: One-time configurator for the agent PR pipeline. Inspects the repository (default branch, validation scripts, tracker labels), asks a few questions, writes .ai/agentic.config.json — the file every other skill in this collection reads — installs the tracker provider descriptor (.ai/trackers/<tracker>.md), and generates SDLC.md (the team's ticket-flow process doc) plus an AGENTS.md starter when the repo has none. Run once per repository; re-run when the toolchain or label taxonomy changes.
---

# Setup Agent Pipeline

Every skill in this collection reads its repository-specific settings from `.ai/agentic.config.json`. This skill writes that file. It is the first skill to run in a fresh repository; the others stop and point here when the config is missing.

## Arguments

- `--defaults` (optional) — skip all questions and write the auto-detected config without confirmation.

## Config schema

`.ai/agentic.config.json`, committed to the repository:

```json
{
  "version": 1,
  "baseBranch": "auto",
  "tracker": "github",
  "validation": {
    "commands": ["pnpm typecheck", "pnpm test", "pnpm build"]
  },
  "labels": {
    "enabled": true,
    "pipeline": ["review", "changes-requested", "qa", "qa-failed", "merge-queue", "blocked", "do-not-merge"],
    "category": ["bug", "feature", "refactor", "security", "dependencies", "documentation"],
    "meta": ["needs-qa", "skip-qa", "qa-approved", "qa-self-verified", "in-progress"],
    "priority": ["priority-low", "priority-medium", "priority-high", "priority-extreme"],
    "risk": ["risk-low", "risk-medium", "risk-high"]
  },
  "qaGate": true,
  "paths": {
    "runs": ".ai/runs",
    "analysis": ".ai/analysis"
  },
  "reviewChecklist": null
}
```

Field reference:

- `baseBranch` — the branch PRs target. `"auto"` means: resolve at runtime from the repository's default branch (see the loading snippet below). Set an explicit name only when PRs must target something other than the default branch.
- `tracker` — the issue/PR tracker provider. Selects the tracker descriptor at `.ai/trackers/<tracker>.md`, which defines how every tracker operation the skills name is executed. The collection ships `"github"` (the `gh` CLI); other trackers are added by writing one descriptor file — see Tracker providers below.
- `validation.commands` — ordered list of shell commands that constitute the full validation gate. Skills run them in order and treat any non-zero exit as a gate failure. Keep the list complete: typecheck, lint, tests, build — whatever proves the repo is healthy.
- `labels.enabled` — when `false`, skills skip every label operation and note that in their PR summaries. Use this for repos that do not want the label workflow.
- `labels.pipeline` — mutually exclusive workflow states. A PR carries at most one.
- `labels.category` — additive kind-of-change labels.
- `labels.meta` — additive process labels. `needs-qa` requests manual QA; `skip-qa` opts out (never combine the two); `qa-approved` records that QA passed; `qa-self-verified` marks the self-QA exception; `in-progress` is the claim lock automated skills apply while working. One label lives outside the config taxonomy: `do-not-close`, applied by humans to issues that housekeeping skills must never auto-close — skills only ever read it.
- `labels.priority` — mutually exclusive urgency of the work. Unset is treated as medium.
- `labels.risk` — mutually exclusive blast radius of the change. Unset is treated as medium. Priority is how urgent the work is; risk is how dangerous the change is to ship.
- `qaGate` — when `true`, a PR carrying `needs-qa` must not merge until it also carries `qa-approved`, even when every other check is green. When `false`, `needs-qa` is advisory only.
- `paths.runs` — where execution plans of autonomous runs are stored.
- `paths.analysis` — where generated reports are stored.
- `reviewChecklist` — optional path to a repo-local review checklist file. When set, the `om-code-review` skill reads it in addition to its built-in checklist.

## Tracker providers

No skill in this collection calls a tracker CLI or API directly. Skills name **tracker operations** — **get-issue**, **create-pr**, **comment-pr**, **merge-pr**, and the rest of the contract in `references/trackers/TEMPLATE.md` — and the repository's tracker descriptor at `.ai/trackers/<tracker>.md` (selected by the `tracker` config field) defines how each operation is executed. This skill installs the descriptor: it copies the shipped implementation from its own `references/trackers/<tracker>.md` into the repo, where it is committed alongside the config.

The repo's copy is authoritative, which is also the extension mechanism: teams edit `.ai/trackers/<tracker>.md` to extend or override any operation — extra flags, a different command, added conventions — and every skill picks the change up on its next run without touching the installed skills. A whole new tracker (for example Linear) is ONE new descriptor file written from `TEMPLATE.md`, plus the matching `tracker` value; split setups (issues in Linear, PRs on GitHub) implement the issue operations against the issue tracker and delegate the PR sections to the GitHub descriptor, as the template describes.

The collection ships `github.md`. For a `tracker` value with no shipped descriptor and no existing `.ai/trackers/<tracker>.md`, scaffold the repo file from `references/trackers/TEMPLATE.md`, tell the user to fill in the operations, and stop — skills must not run against an unfilled descriptor.

## Project docs: SDLC.md and AGENTS.md

Beyond the config, this skill produces the human-readable half of the pipeline:

- `SDLC.md` (repo root) — the team's ticket flow: pipeline stages, the label state machine, the QA gate, the claim protocol, and which skill drives each stage. Generate it from `references/sdlc-template.md`, filling in the resolved base branch, tracker, label mode, QA gate, and validation commands. When the repo already documents its process, offer to skip or to link instead of overwrite.
- `AGENTS.md` starter — agent instruction files (`AGENTS.md`, `CLAUDE.md`, or equivalents) are where a project records its own specifics: coding standards, architecture notes, conventions. Every skill in this collection reads them before working, so a repo with rich agent docs gets project-aware behavior the moment the skills are installed. When the repo has no such file, offer to generate a starter `AGENTS.md` containing: a one-paragraph project overview (derive from the README or ask), a coding-standards section (seed with conventions detected in the codebase, leave TODO markers where you cannot infer), the validation commands from the config, and pointers to `SDLC.md` and `.ai/agentic.config.json`. When one exists, never touch it.

## Per-skill local overrides

Every skill in this collection checks, right after loading the config, for a repo-local skill of the same name at `.ai/skills/<skill-name>/SKILL.md` (for example `.ai/skills/om-auto-review-pr/SKILL.md`). When present, the repo-local skill takes precedence: the installed skill reads it and follows it instead of its own instructions. To extend the installed skill rather than replace it, the local skill simply `@`-imports or references it and adds its own rules on top — where a coding agent expands `@`-imports natively that happens automatically; everywhere else "read the installed skill and honor it" works the same. Use this to reshape a skill for one repository without forking the collection — extra review rules, a different PR body template, additional gate steps. This skill does not create local skills; it only owns the convention. A repo-local skill cannot grant what the installed skill's safety rules forbid (skipping hooks or tests, force-pushing, exfiltrating secrets).

## Workflow

### 1. Refuse to clobber silently

If `.ai/agentic.config.json` already exists, show the current content and ask whether to update it. Preserve any custom values the user does not ask to change.

### 2. Detect the repository shape

Resolve the default branch via the tracker **default-branch** operation (for a fresh setup with no descriptor installed yet, use the shipped `references/trackers/github.md` — or the descriptor matching the tracker the user names — and fall back to `git symbolic-ref refs/remotes/origin/HEAD`).

Detect candidate validation commands, in this order of evidence:

1. `package.json` scripts — look for `typecheck`, `lint`, `test`, `build` (and close variants). Choose the runner from the lockfile: `pnpm-lock.yaml` → `pnpm <script>`, `package-lock.json` → `npm run <script>`, `yarn.lock` → the equivalent for that runner, `bun.lockb` → `bun run <script>`.
2. A `Makefile` — look for `test`, `lint`, `build` targets.
3. Language conventions — `Cargo.toml` → `cargo test` / `cargo clippy`; `go.mod` → `go test ./...` / `go vet ./...`; `pyproject.toml` → `pytest` and the configured linter.

List what CI already runs (`.github/workflows/*.yml`) and prefer commands that mirror it.

### 3. Ask the user (skip with `--defaults`)

1. Confirm or edit the detected validation commands.
2. Which tracker provider to install (default: `github`). This sets the config's `tracker` field and which descriptor lands in `.ai/trackers/`.
3. Labels: install the full taxonomy above (recommended), keep a subset, or disable labels entirely.
4. QA gate on or off. Recommend on when the repo ships user-facing changes.
5. Optional repo-local review checklist path.
6. Generate `SDLC.md` (recommended) and, when the repo has no agent instruction file, an `AGENTS.md` starter.

### 4. Install the tracker descriptor

Copy the shipped descriptor for the chosen tracker from this skill's `references/trackers/<tracker>.md` to `.ai/trackers/<tracker>.md` (create the directory). Rules:

- When `.ai/trackers/<tracker>.md` already exists, never overwrite it silently — the team may have extended it. Show a diff against the shipped version and ask whether to refresh, merge, or keep.
- When the chosen tracker has no shipped descriptor, scaffold `.ai/trackers/<tracker>.md` from `references/trackers/TEMPLATE.md` and tell the user which operations they must fill in before the other skills can run.

### 5. Create missing labels

When labels are enabled, list existing labels via the tracker **list-labels** operation and offer to create the missing ones via **ensure-label-taxonomy** (both defined in the installed descriptor, which also carries the recommended colors and descriptions).

Skip creation for labels that already exist. Never delete or recolor existing labels without being asked.

### 6. Generate the project docs

Per the Project docs section above: write `SDLC.md` from `references/sdlc-template.md` with every placeholder resolved from the config and the answers given, and — only when the repo has no `AGENTS.md`/`CLAUDE.md`/equivalent — the starter `AGENTS.md`. Show both to the user before writing. Never overwrite an existing process doc or agent instruction file.

### 7. Write and commit the config

Write `.ai/agentic.config.json`, create `paths.runs` and `paths.analysis` directories with a `.gitkeep` each, show the final file to the user, and offer to commit:

```bash
git add .ai/agentic.config.json .ai/trackers/ .ai/runs/.gitkeep .ai/analysis/.gitkeep SDLC.md
git commit -m "chore: configure agent PR pipeline"
```

Include `AGENTS.md` in the commit when it was generated this run.

### 8. Report

Tell the user which skills are now unlocked and that the collection's entry points are `om-auto-create-pr` (ship a task as a PR), `om-auto-review-pr` (review a PR), and `om-merge-buddy` (what can merge now). Point at `SDLC.md` as the process reference for humans, at repo-local skills under `.ai/skills/<skill-name>/` as the way to customize any single skill, and at `.ai/trackers/<tracker>.md` as the way to customize tracker operations.

## The standard config-loading snippet

Every other skill in this collection loads the config like this; the snippet is reproduced here as the canonical version:

```bash
CONFIG=.ai/agentic.config.json
if [ ! -f "$CONFIG" ]; then
  echo "Missing $CONFIG — run the om-setup-agent-pipeline skill first."
  exit 1
fi
TRACKER=$(jq -r '.tracker // "github"' "$CONFIG")
TRACKER_FILE=".ai/trackers/${TRACKER}.md"
if [ ! -f "$TRACKER_FILE" ]; then
  echo "Missing $TRACKER_FILE — run the om-setup-agent-pipeline skill to install the tracker descriptor."
  exit 1
fi
BASE_BRANCH=$(jq -r '.baseBranch // "auto"' "$CONFIG")
# "auto" resolves via the tracker descriptor's default-branch operation.
RUNS_DIR=$(jq -r '.paths.runs // ".ai/runs"' "$CONFIG")
ANALYSIS_DIR=$(jq -r '.paths.analysis // ".ai/analysis"' "$CONFIG")
LABELS_ENABLED=$(jq -r '.labels.enabled // false' "$CONFIG")
QA_GATE=$(jq -r '.qaGate // false' "$CONFIG")
```

Right after loading the config, a skill:

1. Checks for a repo-local skill of the same name (`.ai/skills/<skill-name>/SKILL.md`, see Per-skill local overrides).
2. Reads the tracker descriptor at `$TRACKER_FILE`. Every **tracker operation** the skill names (**get-issue**, **create-pr**, **comment-pr**, …) is executed as that file defines it, and the label guards (`label_exists`, `apply_label`, `apply_issue_label`, `remove_issue_label`, `set_pipeline_label`) are the ones the descriptor defines — a label mutation outside those guards is a bug. When `BASE_BRANCH` is `auto`, resolve it now via the descriptor's **default-branch** operation.
3. Reads the repository's agent instruction files (`AGENTS.md`, `CLAUDE.md`, or equivalents) for project specifics before doing any work.

## Rules

- Never write the config without showing the user what was detected, unless `--defaults` was passed.
- Never delete, rename, or recolor existing labels.
- Never overwrite an existing `AGENTS.md`, `CLAUDE.md`, `SDLC.md`, or other process/instruction doc; generate only what is missing, and show it before writing.
- Never store secrets, tokens, or user identities in the config file.
- Keep the config committed; it is team configuration, not personal preference.
- A `tracker` value with no shipped descriptor and no filled-in `.ai/trackers/<tracker>.md` is an error — scaffold from the template, say so, and stop; do not improvise tracker calls.
