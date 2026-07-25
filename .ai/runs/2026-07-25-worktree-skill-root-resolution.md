# Execution plan — worktree skill-root resolution

Slug: `worktree-skill-root-resolution`
Branch: `cez/24e4fd7f` (reused cezar-managed linked worktree; PR targets `main`)
Date: 2026-07-25

## Goal

Every worktree-owning `om-*` skill enters an isolated checkout of the target project, which may not contain the installed skill. Document that the agent must retain the absolute directory of the `SKILL.md` the runner loaded before changing directories, resolve that skill's later references from it, and keep invoking siblings by name. Do not edit `.ai/agentic.config.json` or copy/symlink skills into the worktree.

## Scope

- The 9 skills that own a `references/worktree-setup.md` (they create/enter a worktree and read references afterwards): `om-auto-create-pr`, `om-auto-continue-pr`, `om-auto-continue-pr-loop`, `om-auto-create-pr-loop`, `om-auto-fix-issue`, `om-auto-fix-pr`, `om-auto-qa-pr`, `om-auto-review-pr`, `om-auto-write-spec`.
- Authoring source-of-truth: `AGENTS.md` (Conventions) + a `DECISIONS.md` rationale entry.

## Non-goals

- No change to `.ai/agentic.config.json` (explicitly forbidden by the brief).
- No change to the worktree-creation bash itself (branch/checkout logic untouched).
- No symlinking/copying skills into the worktree (evaluated, rejected — staging risk, `git status` noise, breaks on `git worktree remove`).
- No new tests (docs-only run; lint gate + the manual resolution test are the verification).

## Design (validated)

Primary anchor: the absolute directory of the `SKILL.md` the runner already selected and loaded. Resolve supporting files relative to that directory. This uses the common skill-package contract and makes no assumptions about Claude, Codex, plugins, user installations, or project installations.

Rejected fallback: probing known installation roots. Claude and Codex document different discovery locations, runners can add more, and duplicate skill names can exist. A probe cannot prove that it found the executing copy.

## Risks (brief)

- Duplicate skill copies make root probing ambiguous; using the already-loaded file avoids that ambiguity.
- Shared-reference sync discipline (`AGENTS.md` §5) requires the change to land in all 9 copies in one PR — the brief authorizes "all skills", satisfying the ask-to-sync gate.
- Lint reference-resolution gate: only use example reference filenames that exist in every skill (`agentic-setup.md`, `worktree-setup.md`).

## Progress

PR: #62

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Reference files

- [x] 1.1 Add "Skill files are not in the worktree" section to all 9 `references/worktree-setup.md` — 2540243

### Phase 2: SKILL.md working-tree steps

- [x] 2.1 Add the pin-the-skills-root note to the worktree step of all 9 SKILL.md — 6f1ae65

### Phase 3: Authoring docs

- [x] 3.1 Add the convention to `AGENTS.md` and a rationale entry to `DECISIONS.md` — c37e0cb

### Phase 4: Validation

- [x] 4.1 Run `bash scripts/lint.sh` green; verify the loaded-file anchor from a foreign CWD; self code-review
