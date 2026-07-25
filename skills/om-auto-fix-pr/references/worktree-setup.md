# Worktree setup — isolated worktree and PR checkout

Detailed procedure for step 2 (create) and step 6 (cleanup) of `om-auto-fix-pr`. Never run in the user's primary worktree.

## Skill files are not in the worktree — pin the skills root before you `cd`

The worktree created below is a checkout of the **target project**; it does **not** contain the `om-*` skills or their `references/` files, so a relative path like `references/worktree-setup.md` stops resolving the moment you `cd` into it. Two rules keep the rest of the run working:

- **Sibling `om-*` skills are invoked by name** (via the Skill tool). That is CWD-independent — the harness resolves them from wherever the skills are installed — so cross-skill calls keep working from inside the worktree. Never read into another skill's `references/` directory directly.
- **This skill's own `references/` files are plain file reads**, so after the `cd` you must read them by absolute path. Pin the skills-install root **before** the `cd`: it is the directory you already read `references/agentic-setup.md` from at the setup step, while CWD was still the invoking checkout. Keep that absolute path and read every later reference as `<skills-root>/om-auto-fix-pr/references/<file>.md`.

The install location is a per-machine harness fact — it is **not** in `.ai/agentic.config.json` (that file is per-project and must never be edited to carry it). When you need the root as a shell value (only the optional probe below does), re-derive it deterministically, independent of your worktree CWD:

```bash
# Run BEFORE `cd` into the worktree. Finds THIS skill's install root regardless of
# CWD by probing the harness's skill roots in the order it resolves them.
OM_SKILL_NAME="om-auto-fix-pr"
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

## Create the worktree (step 2)

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
GIT_DIR=$(git rev-parse --git-dir)
GIT_COMMON_DIR=$(git rev-parse --git-common-dir)
WORKTREE_PARENT="$REPO_ROOT/.ai/tmp/om-auto-fix-pr"
CREATED_WORKTREE=0

if [ "$GIT_DIR" != "$GIT_COMMON_DIR" ]; then
  WORKTREE_DIR="$PWD"
else
  WORKTREE_DIR="$WORKTREE_PARENT/pr-${PR_NUMBER}-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$WORKTREE_PARENT"
  git fetch origin "$BASE_BRANCH"
  git worktree add --detach "$WORKTREE_DIR" "origin/$BASE_BRANCH"
  CREATED_WORKTREE=1
fi

cd "$WORKTREE_DIR"
```

Then install dependencies with whatever the repository's lockfile implies (npm, pnpm, bun, cargo, etc.); skip when the project needs no install step.

Rules:

- Reuse the current linked worktree when already inside one. Never nest worktrees.
- The main worktree must stay untouched.
- Always clean up the temporary worktree at the end, but only if you created it this run.

## Cleanup sequence (steps 2 and 6)

Run in a `trap`/finally so crashes also clean up:

```bash
cd "$REPO_ROOT"
if [ "$CREATED_WORKTREE" = "1" ]; then
  git worktree remove --force "$WORKTREE_DIR"
fi
git worktree prune
```

## om-auto-fix-pr specifics

- **Check out the PR head, not a fresh branch.** Instead of creating a task branch off the base, check out the PR head inside the worktree via the tracker operation **checkout-pr** for `{prNumber}`; the whole run continues on the PR's real head branch. (In `--ci-only --branch <name>` mode there is no PR: `git fetch origin "<name>" && git checkout -B "<name>" "origin/<name>"` instead.)
- **One worktree for the whole loop.** The same worktree serves every outer-loop cycle; sub-skills invoked from inside it reuse it per the never-nest rule. Clean up only what this run created.
- If the loop switches to a fork carry-forward replacement PR (see `references/base-merge.md`), the carry branch created by `om-auto-review-pr` becomes the checked-out branch for the remaining cycles.
