# Worktree setup and booting the environment

Detailed procedure for step 4 of `om-qa-buddy`.

## Isolated worktree (PR mode and issue mode with a code change to verify)

Never verify in the user's primary worktree when checking out someone
else's PR head.

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
GIT_DIR=$(git rev-parse --git-dir)
GIT_COMMON_DIR=$(git rev-parse --git-common-dir)
WORKTREE_PARENT="$REPO_ROOT/.ai/tmp/om-qa-buddy"
CREATED_WORKTREE=0

if [ "$GIT_DIR" != "$GIT_COMMON_DIR" ]; then
  WORKTREE_DIR="$PWD"
else
  WORKTREE_DIR="$WORKTREE_PARENT/target-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$WORKTREE_PARENT"
  git fetch origin "pull/{prNumber}/head"
  TARGET_SHA=$(git rev-parse FETCH_HEAD)
  git worktree add --detach "$WORKTREE_DIR" "$TARGET_SHA"
  CREATED_WORKTREE=1
fi
cd "$WORKTREE_DIR"
```

Then restore the dependency-install state implied by the repository's
lockfile; skip when the project needs no install step. If the PR head
cannot be fetched from `origin` (a fork PR), fall back to the tracker
operation **checkout-pr**.

Rules:

- Reuse the current linked worktree when already inside one (repoint it
  deliberately to the target head first). Never nest worktrees.
- The main worktree must stay untouched.
- Read-only: this worktree exists only to build and run the app for
  testing — never edit source, never commit, never push from it.
- Clean up the temporary worktree at the end, but only if this run created
  it — record `CREATED_WORKTREE` for that (step 9).

**Local mode:** no worktree work at all. Verify the current worktree as-is;
never stash, reset, or switch branches away from the user's in-progress
changes.

## Boot the app via `om-prepare-test-env`

Never boot the app by hand. Invoke the `om-prepare-test-env` skill (mode
`auto`; pass `--no-ephemeral` when the app clearly needs no backing
services). It discovers or provisions a runnable instance, installs the
configured browser provider when missing, and writes the environment
descriptor. Then read it:

```bash
ENV_DESCRIPTOR="$QA_DIR/test-env.json"
BASE_URL=$(jq -r '.baseUrl' "$ENV_DESCRIPTOR")
STARTED_BY_THIS_RUN=$(jq -r '.startedByThisRepo // false' "$ENV_DESCRIPTOR")
```

Read `$BROWSER_FILE` and drive its named operations (**open**, **snapshot**,
**interact**, **assert**, **screenshot**, **close**). Record whether this
run started the environment, so step 9 tears down only what it created.
Pick the login role from the descriptor's `credentials` that actually covers
the surface under test, and note the chosen role in the test plan's
Environment section. Credentials are references, not values: load the
descriptor's `credentialsFile` into the shell
(`set -a; . "$CREDENTIALS_FILE"; set +a`) and write the entry's
`passwordEnv` reference literally in login commands — expanded by the
shell, never read into context, never restated.

If `om-prepare-test-env` reports the app could not boot or a browser could
not be installed, do **not** fabricate results: record the blocker honestly
in the final report and stop — this is not a product defect to work around.

## Cleanup sequence (step 9, run in a `trap`/finally so a crash also cleans up)

```bash
cd "$REPO_ROOT"
if [ "$CREATED_WORKTREE" = "1" ]; then
  git worktree remove --force "$WORKTREE_DIR"
fi
git worktree prune
```

Tear down the environment only when `STARTED_BY_THIS_RUN` is true, via
`om-prepare-test-env --stop` — otherwise leave it running for reuse by a
later session.
