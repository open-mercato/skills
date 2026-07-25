# Worktree setup — isolated worktree from the PR head

Detailed procedure for step 4 (create) and step 11 (cleanup) of `om-auto-continue-pr-loop`. Never resume in the user's primary worktree.

## Skill files are not in the worktree — pin the skills root before you `cd`

The worktree created below is a checkout of the **target project**; it does **not** contain the `om-*` skills or their `references/` files, so a relative path like `references/worktree-setup.md` stops resolving the moment you `cd` into it. Two rules keep the rest of the run working:

- **Sibling `om-*` skills are invoked by name** (via the Skill tool). That is CWD-independent — the harness resolves them from wherever the skills are installed — so cross-skill calls keep working from inside the worktree. Never read into another skill's `references/` directory directly.
- **This skill's own `references/` files are plain file reads**, so after the `cd` you must read them by absolute path. Pin the skills-install root **before** the `cd`: it is the directory you already read `references/agentic-setup.md` from at the setup step, while CWD was still the invoking checkout. Keep that absolute path and read every later reference as `<skills-root>/om-auto-continue-pr-loop/references/<file>.md`.

The install location is a per-machine harness fact — it is **not** in `.ai/agentic.config.json` (that file is per-project and must never be edited to carry it). When you need the root as a shell value (only the optional probe below does), re-derive it deterministically, independent of your worktree CWD:

```bash
# Run BEFORE `cd` into the worktree. Finds THIS skill's install root regardless of
# CWD by probing the harness's skill roots in the order it resolves them.
OM_SKILL_NAME="om-auto-continue-pr-loop"
_om_hint=$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")
OM_SKILL_ROOT=""
for _r in \
    "${CLAUDE_PROJECT_DIR:-$_om_hint}/.claude/skills" \
    "$HOME/.claude/skills" \
    "$HOME"/.claude/plugins/*/skills ; do
  [ -f "$_r/$OM_SKILL_NAME/SKILL.md" ] || continue
  OM_SKILL_ROOT="$_r"; break
done
# then read a reference as $OM_SKILL_ROOT/$OM_SKILL_NAME/references/<file>.md
```

The first matching root wins — the same precedence the harness uses to pick which `SKILL.md` ran — so the references you read match the skill you are executing. **Do not** symlink or copy the skills into the worktree: the link risks being staged into the target PR, adds `git status` noise, and breaks on `git worktree remove`. An absolute path keeps the worktree clean.

## Create the worktree from the PR head (step 4)

`HEAD_REF` and `IS_CROSS` are filled via **get-pr** (fields `headRefName`, `isCrossRepository` — already part of the step 1 fetch). On the cross-repository path, use the **checkout-pr** operation to make the PR head available locally.

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
GIT_DIR=$(git rev-parse --git-dir)
GIT_COMMON_DIR=$(git rev-parse --git-common-dir)
WORKTREE_PARENT="$REPO_ROOT/.ai/tmp/om-auto-continue-pr-loop"
CREATED_WORKTREE=0

# tracker: get-pr → HEAD_REF (headRefName), IS_CROSS (isCrossRepository)

if [ "$GIT_DIR" != "$GIT_COMMON_DIR" ]; then
  WORKTREE_DIR="$PWD"
else
  WORKTREE_DIR="$WORKTREE_PARENT/pr-{prNumber}-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$WORKTREE_PARENT"
  if [ "$IS_CROSS" = "true" ]; then
    # tracker: checkout-pr {prNumber}
    git worktree add --detach "$WORKTREE_DIR" "HEAD"
  else
    git fetch origin "$HEAD_REF"
    git worktree add "$WORKTREE_DIR" "origin/$HEAD_REF"
  fi
  CREATED_WORKTREE=1
fi

cd "$WORKTREE_DIR"
```

Then install dependencies with whatever the repository's lockfile implies (npm, pnpm, bun, cargo, etc.); skip when the project needs no install step.

Rules:

- Reuse the current linked worktree when already inside one. Never nest worktrees.
- The main worktree must stay untouched.
- Always clean up the temporary worktree at the end, but only if you created it this run.

## Cleanup sequence (steps 4 and 11)

Run in a `trap`/finally so crashes also clean up:

```bash
cd "$REPO_ROOT"
if [ "$CREATED_WORKTREE" = "1" ]; then
  git worktree remove --force "$WORKTREE_DIR"
fi
git worktree prune
```

## om-auto-continue-pr-loop specifics

- This skill resumes an existing PR, so the worktree is created from the **PR head** (`HEAD_REF` / `IS_CROSS` from the step 1 **get-pr**) rather than from `origin/$BASE_BRANCH`, and no new task branch is cut — you continue committing on the PR's own branch.
