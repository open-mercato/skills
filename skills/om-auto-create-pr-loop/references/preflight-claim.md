# Pre-flight run-ownership check

Before writing anything, confirm no other run owns the slot. Resolve `CURRENT_USER` via the tracker operation **current-user**, then compute:

```bash
DATE=$(date +%Y-%m-%d)
SLUG="{slug-or-derived}"
RUN_DIR="${RUNS_DIR}/${DATE}-${SLUG}"
PLAN_PATH="${RUN_DIR}/PLAN.md"
HANDOFF_PATH="${RUN_DIR}/HANDOFF.md"
NOTIFY_PATH="${RUN_DIR}/NOTIFY.md"
# Verification is checkpoint-based: ${RUN_DIR}/checkpoint-<N>-checks.md every ~5 Steps.
# Optional artifacts (browser transcripts, screenshots) live at ${RUN_DIR}/checkpoint-<N>-artifacts/.
# Final gate log lives at ${RUN_DIR}/final-gate-checks.md at spec completion.
BRANCH_PREFIX="{fix for bugfix/remediation work; otherwise feat}"
BRANCH="${BRANCH_PREFIX}/${SLUG}"
```

Branch naming: use `fix/${SLUG}` when the brief is primarily a bug fix, regression fix, remediation, hardening task, or corrective follow-up; use `feat/${SLUG}` for new capability, scoped refactors, docs/process automation, or anything not primarily corrective.

A run is **already in progress** when ANY of the following is true:

- A folder at `$RUN_DIR` (or a legacy flat file `${RUN_DIR}.md`) already exists on `origin/$BASE_BRANCH` or any remote branch.
- A remote branch `origin/${BRANCH}` already exists.
- An open PR already references `$RUN_DIR` or `$PLAN_PATH` (check via **search-prs** with the run-folder path as the query, or by scanning open PRs via **list-prs**).

Decision tree:

| State | `--force` set? | Action |
|-------|---------------|--------|
| Nothing exists | — | Claim and proceed. |
| Run folder/branch exists, current user owns it | — | Treat as re-entry; hand off to `om-auto-continue-pr-loop` and stop. |
| Run folder/branch exists, someone else owns it | no | **STOP.** Ask the user: "Run folder/branch for `${SLUG}` already exists (owner: ${owner}). Override and continue?" Only continue when the user explicitly says yes. |
| Run folder/branch exists, someone else owns it | yes | Pick a new dated slug (`${SLUG}-v2` or append a time suffix) to avoid clobber; document in the new `PLAN.md` why the original was superseded. |

When an open PR already references the run folder, stop and tell the user to use `om-auto-continue-pr-loop {prNumber}` instead.
