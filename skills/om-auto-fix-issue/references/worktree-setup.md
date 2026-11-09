# Worktree setup — isolated worktree and fix branch

Detailed procedure for step 5 (create) and step 12 (cleanup). Never implement a
fix in the primary worktree. Reuse a current linked worktree; never nest one.
Clean up only a worktree created by this run, and retain unpublished work on a
blocked/interrupted run so a verified resume remains possible.

## om-auto-fix-issue specifics

### Fresh preparation (step 5)

Use your own installed `scripts/prepare-worktree.mjs` helper; verify Node.js is available
(`node --version`) before preparation, or stop with that prerequisite.
Resolve `SKILL_DIR` to this skill's installed directory. Load `BASE_BRANCH` from
config and resolve `auto` through **default-branch**; sanitize `ISSUE_ID` as a
positive number and generate `ISSUE_SLUG` yourself as at most 40 lowercase
letters/digits with single hyphens. Never interpolate raw tracker text.

```bash
git fetch origin "$BASE_BRANCH"
PREPARATION=$(node "$SKILL_DIR/scripts/prepare-worktree.mjs" \
  --issue "$ISSUE_ID" --slug "$ISSUE_SLUG" --base "$BASE_BRANCH") || exit 1
CLAIM_RUN_ID=$(printf '%s' "$PREPARATION" | jq -er '.runId') || exit 1
WORKTREE_STATE=$(printf '%s' "$PREPARATION" | jq -er '.statePath') || exit 1
WORKTREE_DIR=$(printf '%s' "$PREPARATION" | jq -er '.worktree') || exit 1
FIX_BRANCH=$(printf '%s' "$PREPARATION" | jq -er '.branch') || exit 1
CREATED_WORKTREE=$(printf '%s' "$PREPARATION" | jq -r '.createdWorktree') || exit 1
cd "$WORKTREE_DIR"
```

If this chain already generated `CLAIM_RUN_ID`, pass it as `--run-id` instead of
starting another identity. Pass `--prefix feat` only for a clear enhancement;
the bug route defaults to `fix`. Keep the same run id through the later claim,
publication and review chain. Record `WORKTREE_STATE`, branch and worktree in the
run checkpoint; the helper already persists them under the common Git directory
before creating the branch/worktree. This preparation grants no tracker ownership.
Only `om-fix` acquires the claim after triage/root-cause; before winning that claim,
produce no implementation commits, tracker changes or published branch.

Fresh branches are `fix/issue-{issueId}-{slug}-{runId}` (or `feat/…`) and use
create-only `git worktree add --no-track -b` / `git checkout --no-track -b`.
Preparation does not write upstream configuration; the later claim winner sets
it at publication, avoiding concurrent writes to shared Git config. A fresh state and
per-worktree reservation are written
exclusively; an existing run id, branch, path or another run's reservation fails
without replacement. A linked worktree already reserved by a run requires that
run's explicit verified resume; a fresh invocation never switches its branch.
Different same-issue runs have distinct UUIDs, branches, paths and state files.
Install dependencies per the repository's lockfile after preparation succeeds.

### Verified resume

Recover the exact state path from the same run's checkpoint. Never infer ownership
from an issue number, branch prefix, same login or a deterministic legacy name.

```bash
PREPARATION=$(node "$SKILL_DIR/scripts/prepare-worktree.mjs" \
  --issue "$ISSUE_ID" --resume "$WORKTREE_STATE") || exit 1
WORKTREE_DIR=$(printf '%s' "$PREPARATION" | jq -er '.worktree') || exit 1
cd "$WORKTREE_DIR"
```

The helper verifies the state file's repository/run/issue identity, linked
worktree, exact current branch, original-base ancestry and cleanup ownership
bound to the exclusive reservation (run-created paths must match the run). It performs no
checkout, branch reset or automatic recreation on resume; dirty/unpublished work
is retained. Restore the returned `runId`, `branch` and `createdWorktree` values,
then re-verify tracker ownership through `references/claim-pr.md` before continuing.
Missing/mismatched state, an absent worktree, detached HEAD, a switched branch or
unverifiable ancestry blocks resume. Retain the files and report the exact path;
never use `checkout -B`, `switch -C`, force branch replacement or a second guessed
worktree to recover. Legacy pre-upgrade branches stay untouched until their
ownership is independently established; do not silently migrate/reset them.

### Cleanup (steps 11–12)

Register a finally handler after successful preparation. On a clean completed
run, return to the primary root and remove only the run-created worktree with
`git worktree remove "$WORKTREE_DIR"`, then prune. Never remove a reused linked
worktree. Do not force removal on an interrupted/blocked run: retain the state,
branch and unpublished worktree and report `WORKTREE_STATE` for verified resume.
After completed delivery, verify and remove only this run's state file and
returned `reservationPath` (the reservation must still name its run/state/branch).
Keep both on an interrupted run. Never retire another run's reservation. This
procedure applies only to the bug route; feature-route skills own their worktrees.
