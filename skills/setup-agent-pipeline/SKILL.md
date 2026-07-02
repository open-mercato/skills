---
name: setup-agent-pipeline
description: One-time configurator for the agent PR pipeline. Inspects the repository (default branch, validation scripts, GitHub labels), asks a few questions, and writes .ai/agentic.config.json — the file every other skill in this collection reads. Run once per repository; re-run when the toolchain or label taxonomy changes.
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
- `reviewChecklist` — optional path to a repo-local review checklist file. When set, the `code-review` skill reads it in addition to its built-in checklist.

## Workflow

### 1. Refuse to clobber silently

If `.ai/agentic.config.json` already exists, show the current content and ask whether to update it. Preserve any custom values the user does not ask to change.

### 2. Detect the repository shape

```bash
BASE_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || true)
[ -z "$BASE_BRANCH" ] && BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
```

Detect candidate validation commands, in this order of evidence:

1. `package.json` scripts — look for `typecheck`, `lint`, `test`, `build` (and close variants). Choose the runner from the lockfile: `pnpm-lock.yaml` → `pnpm <script>`, `package-lock.json` → `npm run <script>`, `yarn.lock` → the equivalent for that runner, `bun.lockb` → `bun run <script>`.
2. A `Makefile` — look for `test`, `lint`, `build` targets.
3. Language conventions — `Cargo.toml` → `cargo test` / `cargo clippy`; `go.mod` → `go test ./...` / `go vet ./...`; `pyproject.toml` → `pytest` and the configured linter.

List what CI already runs (`.github/workflows/*.yml`) and prefer commands that mirror it.

### 3. Ask the user (skip with `--defaults`)

1. Confirm or edit the detected validation commands.
2. Labels: install the full taxonomy above (recommended), keep a subset, or disable labels entirely.
3. QA gate on or off. Recommend on when the repo ships user-facing changes.
4. Optional repo-local review checklist path.

### 4. Create missing labels

When labels are enabled, check which configured labels exist and offer to create the missing ones:

```bash
gh label list --limit 200 --json name --jq '.[].name' > /tmp/existing-labels.txt
gh label create review            --color 0366d6 --description "Ready for code review"
gh label create changes-requested --color b60205 --description "Reviewer requested changes"
gh label create qa                --color fbca04 --description "Manual QA in progress"
gh label create qa-failed         --color b60205 --description "Manual QA failed"
gh label create merge-queue       --color 0e8a16 --description "Approved, ready to merge"
gh label create blocked           --color b60205 --description "Blocked by a dependency"
gh label create do-not-merge      --color b60205 --description "Hard merge block"
gh label create bug               --color d73a4a --description "Bug fix"
gh label create feature           --color a2eeef --description "New capability"
gh label create refactor          --color cfd3d7 --description "No behavior change"
gh label create security          --color b60205 --description "Security-relevant change"
gh label create dependencies      --color 0366d6 --description "Dependency update"
gh label create documentation     --color 0075ca --description "Docs only"
gh label create needs-qa          --color fbca04 --description "Requires manual QA before merge"
gh label create skip-qa           --color 0e8a16 --description "Low risk, QA not required"
gh label create qa-approved       --color 0e8a16 --description "Manual QA passed"
gh label create qa-self-verified  --color c5def5 --description "Self-QA exception used"
gh label create in-progress       --color c5def5 --description "An automated skill is working on this"
gh label create do-not-close      --color c5def5 --description "Humans only: never auto-close this issue"
gh label create priority-low      --color e4e669 --description "Cosmetic or follow-up work"
gh label create priority-medium   --color fbca04 --description "Ordinary bug or feature"
gh label create priority-high     --color d93f0b --description "Release-blocking"
gh label create priority-extreme  --color b60205 --description "Outage or security incident"
gh label create risk-low          --color 0e8a16 --description "Isolated, low blast radius"
gh label create risk-medium       --color fbca04 --description "Ordinary change with tests"
gh label create risk-high         --color b60205 --description "Wide blast radius, review deeply"
```

Skip creation for labels that already exist. Never delete or recolor existing labels without being asked.

### 5. Write and commit the config

Write `.ai/agentic.config.json`, create `paths.runs` and `paths.analysis` directories with a `.gitkeep` each, show the final file to the user, and offer to commit:

```bash
git add .ai/agentic.config.json .ai/runs/.gitkeep .ai/analysis/.gitkeep
git commit -m "chore: configure agent PR pipeline"
```

### 6. Report

Tell the user which skills are now unlocked and that the collection's entry points are `auto-create-pr` (ship a task as a PR), `auto-review-pr` (review a PR), and `merge-buddy` (what can merge now).

## The standard config-loading snippet

Every other skill in this collection loads the config like this; the snippet is reproduced here as the canonical version:

```bash
CONFIG=.ai/agentic.config.json
if [ ! -f "$CONFIG" ]; then
  echo "Missing $CONFIG — run the setup-agent-pipeline skill first."
  exit 1
fi
BASE_BRANCH=$(jq -r '.baseBranch // "auto"' "$CONFIG")
if [ "$BASE_BRANCH" = "auto" ]; then
  BASE_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || true)
  [ -z "$BASE_BRANCH" ] && BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
  [ -z "$BASE_BRANCH" ] && BASE_BRANCH="main"
fi
RUNS_DIR=$(jq -r '.paths.runs // ".ai/runs"' "$CONFIG")
ANALYSIS_DIR=$(jq -r '.paths.analysis // ".ai/analysis"' "$CONFIG")
LABELS_ENABLED=$(jq -r '.labels.enabled // false' "$CONFIG")
QA_GATE=$(jq -r '.qaGate // false' "$CONFIG")
```

Label operations always go through an existence guard, so a missing label degrades to a logged skip instead of a failure:

```bash
label_exists() {
  gh label list --limit 200 --json name --jq '.[].name' | grep -Fxq "$1"
}

apply_label() {
  if [ "$LABELS_ENABLED" != "true" ]; then return 0; fi
  if label_exists "$1"; then
    gh pr edit "$2" --add-label "$1"
  else
    echo "Skipping label '$1' (not defined in this repo). Create it with: gh label create '$1'"
  fi
}
```

## Rules

- Never write the config without showing the user what was detected, unless `--defaults` was passed.
- Never delete, rename, or recolor existing labels.
- Never store secrets, tokens, or user identities in the config file.
- Keep the config committed; it is team configuration, not personal preference.
