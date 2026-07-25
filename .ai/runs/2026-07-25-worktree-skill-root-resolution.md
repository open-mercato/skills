# Execution plan — worktree skill-root resolution

Slug: `worktree-skill-root-resolution`
Branch: `cez/24e4fd7f` (reused cezar-managed linked worktree; PR targets `main`)
Date: 2026-07-25

## Goal

Every worktree-owning `om-*` skill `cd`s into an isolated worktree that is a checkout of the **target project**. That worktree does not contain the `om-*` skills or their `references/` files, so any later relative `references/<file>.md` read breaks. Document — in the working-tree section of every affected skill — that the agent must pin the skills-install root it started from (before the `cd`) and read every later reference by that absolute path, while continuing to invoke sibling `om-*` skills by name (harness-resolved, CWD-independent). Provide a deterministic, tested way to resolve that root **without editing `.ai/agentic.config.json`** (per-project, not per-install), and evaluate the "symlink the skills into the worktree" idea (rejected — documented).

## Scope

- The 9 skills that own a `references/worktree-setup.md` (they create/enter a worktree and read references afterwards): `om-auto-create-pr`, `om-auto-continue-pr`, `om-auto-continue-pr-loop`, `om-auto-create-pr-loop`, `om-auto-fix-issue`, `om-auto-fix-pr`, `om-auto-qa-pr`, `om-auto-review-pr`, `om-auto-write-spec`.
- Authoring source-of-truth: `AGENTS.md` (Conventions) + a `DECISIONS.md` rationale entry.

## Non-goals

- No change to `.ai/agentic.config.json` (explicitly forbidden by the brief).
- No change to the worktree-creation bash itself (branch/checkout logic untouched).
- No symlinking/copying skills into the worktree (evaluated, rejected — staging risk, `git status` noise, breaks on `git worktree remove`).
- No new tests (docs-only run; lint gate + the manual resolution test are the verification).

## Design (validated)

Primary anchor — most reliable, works in every agent: the skills-install root is **the directory the agent already read this skill's `references/agentic-setup.md` from at the setup step**, while CWD was still the invoking checkout. That is authoritatively the copy the harness loaded. Pin it before the `cd`.

Deterministic shell fallback (only when a shell value is needed, e.g. a probe): resolve the root by probing the harness's skill roots in precedence order, independent of CWD:

```bash
OM_SKILL_NAME="om-<this-skill>"
_om_hint=$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")
OM_SKILL_ROOT=""
for _r in \
    "${CLAUDE_PROJECT_DIR:-$_om_hint}/.claude/skills" \
    "$HOME/.claude/skills" \
    "$HOME"/.claude/plugins/*/skills ; do
  [ -f "$_r/$OM_SKILL_NAME/SKILL.md" ] || continue
  OM_SKILL_ROOT="$_r"; break
done
```

Tested: from a foreign CWD (`/tmp/fake-worktree`) with the repo root passed as the hint, the snippet resolved `OM_SKILL_ROOT=$HOME/.claude/skills` and a sibling `om-code-review/SKILL.md` resolved, while the worktree CWD had no `skills/` — proving CWD-independence.

## Risks (brief)

- Duplicate skill copies on disk could let the probe hit a stale copy; mitigated by making the *primary* anchor "where you read this skill's references from" and using the probe only as a fallback, first-match-wins in harness precedence.
- Shared-reference sync discipline (`AGENTS.md` §5) requires the change to land in all 9 copies in one PR — the brief authorizes "all skills", satisfying the ask-to-sync gate.
- Lint reference-resolution gate: only use example reference filenames that exist in every skill (`agentic-setup.md`, `worktree-setup.md`).

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Reference files

- [ ] 1.1 Add "Skill files are not in the worktree" section to all 9 `references/worktree-setup.md`

### Phase 2: SKILL.md working-tree steps

- [ ] 2.1 Add the pin-the-skills-root note to the worktree step of all 9 SKILL.md

### Phase 3: Authoring docs

- [ ] 3.1 Add the convention to `AGENTS.md` and a rationale entry to `DECISIONS.md`

### Phase 4: Validation

- [ ] 4.1 Run `bash scripts/lint.sh` green; re-run the resolution test; self code-review
