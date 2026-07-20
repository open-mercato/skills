# Claiming and releasing work — issues and PRs

The generalized claim/lock procedure for any tracker item (issue or PR) an autonomous run takes ownership of. All reads and mutations go through the tracker descriptor's operations; label mutations only through the `apply_label` guard. This complements the skill-specific slot check in the skill body (plan path / branch / open PR) — the slot check decides whether the *work* exists, this procedure decides who *owns* it.

## Three-signal in-progress check

Resolve `CURRENT_USER` via the tracker operation **current-user**, then read the item (for PRs via **get-pr**; for issues via the descriptor's issue-read operation). The item counts as **already in progress** when ANY of these signals holds:

1. **Assignee** — the item is assigned to someone other than `CURRENT_USER`.
2. **`in-progress` label** — the label is present on the item.
3. **Recent robot claim comment** — a claim comment in the format below, posted within the stale window (default 24 h) by someone other than `CURRENT_USER`.

Decision:

- No signal → claim and proceed.
- Signals point at `CURRENT_USER` → re-entry into your own run; refresh the claim (idempotent) and continue.
- Signals point at someone else → **STOP** and report the owner — unless the lock is stale (below) or `--force` was passed.

## Stale-lock recovery

A claim is **stale** when the newest claim signal is older than the stale window (24 h) and the claimant has produced no commits, comments, or label changes on the item since. Recover by posting a takeover note first — `🤖 Previous claim by {owner} appears stale ({age}); taking over.` — then claim normally. Never silently overwrite a live claim.

## `--force` override

`--force` bypasses the conflict stop, never the transparency: post an override comment naming the previous owner and why the override happened (`🤖 --force override: taking over from {owner} — {reason}.`), then apply the claim. Document the override in the run's plan/report.

## Applying the claim

Idempotent — safe to re-run on re-entry:

1. Assign `CURRENT_USER` to the item via the descriptor's assign operation.
2. Apply the `in-progress` label via the `apply_label` guard (missing label → logged skip; `labels.enabled: false` → skip and note it in the report).
3. Post the claim comment, once (skip when an identical recent comment by `CURRENT_USER` already exists):

   `🤖 Claiming this {issue|PR} — starting {skill-name} run. Started: {ISO-8601 timestamp}.`

## Release / handback

When the run finishes, hands off, or aborts:

- Remove the `in-progress` label via the guard.
- In issue-driven runs, hand the issue back: restore the original assignee/author when the pipeline convention expects it.
- Post a short release comment stating the outcome (PR opened with its number, blocked with the blocker, or no action needed).
- The claimant releases their own claim — never release a lock another agent holds. A sub-skill that claims for itself (e.g. `om-auto-review-pr` during the autofix pass) owns its own release; do not second-guess it.

## om-auto-fix-issue specifics

- **Tighter windows.** On the issue this skill takes: a `🤖`-prefixed claim comment counts as fresh within **30 minutes**, and an `in-progress` label older than **60 minutes** with no push and no comment from the owner in that window is treated as expired — still ask the user before overriding unless `--force` was set.
- **Extra signal.** An open PR already referencing the issue via `Fixes #{issueId}` / `Closes #{issueId}` also counts as "already in progress" (the triage step re-checks this, but the lock decision applies at step 1).
- **Step 1 only decides.** The actual claim (assignee + `in-progress` label + claim comment) happens inside `om-fix` on the bug route, after triage confirms there is real work to do — so a stopped chain never leaves a stray lock behind. On the feature route the delegated skills (`om-auto-write-spec` / `om-auto-implement-spec`) perform their own claims.
- **Release on the failure path** (step 10): remove the `in-progress` label from `{issueId}` via the **unlabel-issue** operation through the guard (`LABELS_ENABLED=false` or a missing label degrades to a skip; tolerate failure rather than aborting the cleanup), then post exactly this abort comment via **comment-issue**:

  ```
  🤖 `om-auto-fix-issue` aborted: {one-line reason}. Lock released.
  ```

  Keep the assignee as-is on the failure path — a human picking the issue up can see who last worked on it.
- On the success path the lock is released by `om-open-pr` as part of its issue handback.
