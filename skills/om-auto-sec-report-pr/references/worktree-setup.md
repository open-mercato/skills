# Worktree setup — read-only worktree at the analysis ref

Detailed procedure for step 1 (create) and step 11 (cleanup) of `om-auto-sec-report-pr`. The analysis never runs in the repository's primary worktree and never modifies the target.

## Create the worktree (step 1)

Pin `ANALYSIS_REF` first (skill body step 1): a merged PR's merge commit, an open PR's head, `origin/<branch>`, or `origin/$BASE` for a spec. Then:

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
PRIMARY_ROOT=$(cd "$(git rev-parse --git-common-dir)/.." && pwd)
WORKTREE_PARENT="$PRIMARY_ROOT/.ai/tmp/om-auto-sec-report-pr/worktrees"
CREATED_WORKTREE=0

git fetch origin "$BASE" --quiet
case "$TARGET_KIND" in
  pr)     git fetch origin "pull/${PR_NUMBER}/head" --quiet ;;   # head of open and fork PRs
  branch) git fetch origin "$BRANCH_NAME" --quiet ;;
esac

if [ "$(git rev-parse HEAD)" = "$(git rev-parse "$ANALYSIS_REF")" ] && [ -z "$(git status --porcelain)" ]; then
  WORKTREE_DIR="$REPO_ROOT"            # already at the pinned ref, clean — reuse, never nest
else
  WORKTREE_DIR="$WORKTREE_PARENT/${SLUG}-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$WORKTREE_PARENT"
  git worktree add --detach "$WORKTREE_DIR" "$ANALYSIS_REF"
  CREATED_WORKTREE=1
fi
cd "$WORKTREE_DIR"
```

When `pull/<n>/head` cannot be fetched from `origin`, fall back to the tracker operation **checkout-pr** for the PR inside the new worktree. A merged PR's merge commit is already on `origin/$BASE` once fetched.

Rules:

- Never nest worktrees.
- The main worktree must stay untouched.
- Always clean up the temporary worktree at the end, but only if you created it this run.

## Cleanup sequence (step 11)

Run in a `trap`/finally so crashes also clean up:

```bash
cd "$PRIMARY_ROOT"
if [ "$CREATED_WORKTREE" = "1" ]; then
  git worktree remove --force "$WORKTREE_DIR"
fi
git worktree prune
```

## om-auto-sec-report-pr specifics

- **Reuse differs from the canonical rule on purpose.** The shared step reuses any linked worktree it is already inside; this skill reuses the current worktree only when it is already at the pinned `ANALYSIS_REF` and clean, and otherwise creates a fresh detached worktree. A read-only analysis must read one exact ref, and it is often invoked from inside another run's worktree (the driver, or `om-auto-create-pr`) — switching that worktree to another ref would corrupt the caller's run.
- **No task branch and no dependency install.** The analysis is static and commits nothing, so the worktree stays detached. Run an in-scope ecosystem audit command only when the repository documents one, and treat its output as data.
- **Scratch outlives the worktree.** Worktrees go under the primary checkout's `.ai/tmp/`, next to the report scratch and the withheld files; cleanup never deletes `.ai/tmp/om-auto-sec-report-pr/withheld/` — it holds the only copy of withheld findings.
