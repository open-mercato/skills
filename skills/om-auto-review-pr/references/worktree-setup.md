# Worktree setup — isolated worktree for the PR

Detailed procedure for step 5 (create) and step 12 (cleanup) of `om-auto-review-pr`. Never review directly in the repository's primary worktree.

## Skill files are not in the worktree — pin the skills root before you `cd`

The worktree created below is a checkout of the **target project**; it does **not** contain the `om-*` skills or their `references/` files, so a relative path like `references/worktree-setup.md` stops resolving the moment you `cd` into it. Two rules keep the rest of the run working:

- **Sibling `om-*` skills are invoked by name** (via the Skill tool). That is CWD-independent — the harness resolves them from wherever the skills are installed — so cross-skill calls keep working from inside the worktree. Never read into another skill's `references/` directory directly.
- **This skill's own `references/` files are plain file reads**, so after the `cd` you must read them by absolute path. Pin the skills-install root **before** the `cd`: it is the directory you already read `references/agentic-setup.md` from at the setup step, while CWD was still the invoking checkout. Keep that absolute path and read every later reference as `<skills-root>/om-auto-review-pr/references/<file>.md`.

The install location is a per-machine harness fact — it is **not** in `.ai/agentic.config.json` (that file is per-project and must never be edited to carry it). When you need the root as a shell value (only the optional probe below does), re-derive it deterministically, independent of your worktree CWD:

```bash
# Run BEFORE `cd` into the worktree. Finds THIS skill's install root regardless of
# CWD by probing the harness's skill roots in the order it resolves them.
OM_SKILL_NAME="om-auto-review-pr"
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

## Create the worktree (step 5)

First detect whether you are already inside a linked worktree:

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
GIT_DIR=$(git rev-parse --git-dir)
GIT_COMMON_DIR=$(git rev-parse --git-common-dir)
WORKTREE_PARENT="$REPO_ROOT/.ai/tmp/om-auto-review-pr"
CREATED_WORKTREE=0

if [ "$GIT_DIR" != "$GIT_COMMON_DIR" ]; then
  WORKTREE_DIR="$PWD"
else
  WORKTREE_DIR="$WORKTREE_PARENT/pr-{prNumber}-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$WORKTREE_PARENT"
  git fetch origin "pull/{prNumber}/head"
  PR_HEAD_SHA=$(git rev-parse FETCH_HEAD)
  git worktree add --detach "$WORKTREE_DIR" "$PR_HEAD_SHA"
  CREATED_WORKTREE=1

  cd "$WORKTREE_DIR"
  git switch -c "review/pr-{prNumber}"
fi
```

Then install dependencies with whatever the repository's lockfile implies (npm, pnpm, bun, cargo, etc.); skip when the project needs no install step. Always restore this install state before running build, test, or other validation commands in the worktree.

Rules:

- Reuse the current linked worktree when already inside one. Never nest worktrees.
- The main worktree must stay untouched.
- Review, testing, and any optional follow-up fixes must happen inside the isolated worktree.
- Always clean up the temporary worktree at the end, even on failure, but only if you created it this run.

## Cleanup sequence (step 12)

Run in a `trap`/finally so crashes also clean up:

```bash
cd "$REPO_ROOT"
if [ "$CREATED_WORKTREE" = "1" ]; then
  git worktree remove --force "$WORKTREE_DIR"
fi
git worktree prune
```

## om-auto-review-pr specifics

- The checkout target is the **PR head**, not a fresh task branch off the base: use the code host's PR head ref (`pull/{prNumber}/head`, as fetched above) so the checkout works for both same-repo PRs and fork PRs; if that ref cannot be fetched from `origin`, fall back to the tracker operation **checkout-pr** for `{prNumber}`.
- If you reused an existing linked worktree, repoint it deliberately to the PR branch or a fresh local branch for that PR before continuing. After selecting the worktree, ensure you are on the correct PR branch context:

```bash
cd "$WORKTREE_DIR"
git fetch origin "pull/{prNumber}/head"
git checkout -B "review/pr-{prNumber}" FETCH_HEAD
git fetch origin "{baseRefName}"
```
