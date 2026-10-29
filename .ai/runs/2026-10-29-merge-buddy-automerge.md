# Execution plan — om-merge-buddy automerge mode

## Goal

Add an `--automerge` mode to `om-merge-buddy` that works the queue of PRs a human labeled `automerge` (label name configurable through `om-setup-agent-pipeline`): one PR at a time, approve pending CI workflow runs, merge the latest base in and resolve conflicts, drive review/CI green via `om-auto-fix-pr` / `om-auto-review-pr` (fork PRs through the carry-forward replacement), skip PRs another agent or orchestrator task is working on, and merge through `om-approve-merge-pr` once every gate is genuinely green.

## Scope

- `skills/om-merge-buddy/` — SKILL.md (mode, arguments, chaining, workflow), new `references/automerge.md`, `references/claim-pr.md`, report template, rules specifics.
- `skills/om-setup-agent-pipeline/` — new optional config key `automerge.label` (schema, field reference, `config-capabilities.md`, interview question, SDLC template), label taxonomy creation.
- Tracker contract — new operation **approve-pending-runs** in `TEMPLATE.md`, `github.md`, `gitlab.md`, and the `linear.md` / `jira.md` delegations; installed `.ai/trackers/github.md` copy.
- Repo docs — `docs/skills/om-merge-buddy.md`, README rows, `SDLC.md`, `.ai/agentic.config.json`, `UPGRADE_NOTES.md`.

## Non-goals

- No change to the default (read-only) `om-merge-buddy` report mode.
- No relaxation of any merge gate: QA gate, required checks, blocking labels still apply; automation never applies `qa-approved`.
- No change to `om-auto-fix-pr`, `om-auto-review-pr`, or `om-approve-merge-pr` behavior.

## Decisions

- The `automerge` label is a standing, human-given merge instruction; it counts as the confirmation `om-approve-merge-pr` asks for, never as an override of a refused gate or a stale QA head.
- Duplicate-work guard is generic: the three-signal `in-progress` claim plus an optional orchestrator check (active tasks referencing the PR) when the run executes under an orchestrator that exposes a task list (e.g. cezar's `runs list --json` `prRefs`). Missing orchestrator → check skipped and disclosed.
- The label is a top-level optional `automerge.label` key (default `automerge`), not a `labels.meta` entry, so older configs keep working and renaming it does not touch the taxonomy arrays; setup still creates it.

## Risks

- New tracker operation: custom descriptors lack it → mode degrades to reporting "pending approval" instead of approving runs.
- Autonomous merging: mitigated by delegating the final gate check to `om-approve-merge-pr`.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Tracker contract

- [x] 1.1 Add approve-pending-runs operation to tracker descriptors — 133791a

### Phase 2: Pipeline configuration

- [x] 2.1 Add automerge.label config key and label creation to om-setup-agent-pipeline — baa47b3

### Phase 3: Merge buddy automerge mode

- [x] 3.1 Add automerge mode to om-merge-buddy SKILL.md and references — 3093a1d

### Phase 4: Docs

- [x] 4.1 Update docs page, README, SDLC.md, config, and upgrade notes — 8dc3df5
