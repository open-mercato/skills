# Claiming and releasing work — issues and PRs

The generalized claim/lock procedure for any tracker item (issue or PR) an autonomous run takes ownership of. All reads and mutations go through the tracker descriptor's operations; label mutations only through the `apply_label` guard. This complements the skill-specific slot check in the skill body — the slot check decides whether the *work* exists, this procedure decides who *owns* it.

## Three-signal in-progress check

Resolve `CURRENT_USER` via the tracker operation **current-user**, then read the item (for PRs via **get-pr**; for issues via the descriptor's issue-read operation). The item counts as **already in progress** when ANY of these signals holds:

1. **Assignee** — the item is assigned to someone other than `CURRENT_USER`.
2. **`in-progress` label** — the label is present on the item.
3. **Recent robot claim comment** — a claim comment in the format below, posted within the stale window by someone other than `CURRENT_USER`.

Decision:

- No signal → claim and proceed.
- Signals point at `CURRENT_USER` → re-entry into your own run; refresh the claim (idempotent) and continue.
- Signals point at someone else → **STOP** and report the owner — unless the lock is stale (below) or `--force` was passed.

## Stale-lock recovery

A claim is **stale** when the newest claim signal is older than the stale window and the claimant has produced no commits, comments, or label changes on the item since. Recover by posting a takeover note first — `🤖 Previous claim by {owner} appears stale ({age}); taking over.` — then claim normally. Never silently overwrite a live claim.

## `--force` override

`--force` bypasses the conflict stop, never the transparency: post an override comment naming the previous owner and why the override happened (`🤖 --force override: taking over from {owner} — {reason}.`), then apply the claim. Document the override in the run's report.

## Applying the claim

Idempotent — safe to re-run on re-entry:

1. Assign `CURRENT_USER` to the item via the descriptor's assign operation.
2. Apply the `in-progress` label via the `apply_label` guard (missing label → logged skip; `labels.enabled: false` → skip and note it in the report).
3. Post the claim comment, once (skip when an identical recent comment by `CURRENT_USER` already exists).

## Release / handback

When the run finishes, hands off, or aborts:

- Remove the `in-progress` label via the guard.
- Post a short release comment stating the outcome.
- The claimant releases their own claim — never release a lock another agent holds. A sub-skill that claims for itself (e.g. `om-auto-review-pr` during the review-first gate) owns its own release; do not second-guess it.

## om-auto-qa-pr specifics

PR mode only; local mode skips the whole procedure. Run this **before** touching anything else about the PR:

- Read the PR via **get-pr** for `{prNumber}` requesting `assignees`, `labels`, `number`, `title`, `comments`.
- **Stale window: 30 minutes** — a `🤖` claim comment from another actor counts as a live claim only when newer than 30 minutes; QA runs are short-lived, so older claims are treated as recoverable per stale-lock recovery.
- On a live conflict without `--force`, STOP and ask the user via `AskUserQuestion` (this is one of the explicitly gated stops).
- Claim: **assign-pr** `$CURRENT_USER`, apply `in-progress` via the `apply_label` guard, then post via **comment-pr**:

  ```text
  🤖 `om-auto-qa-pr` started by @{CURRENT_USER} at {timestamp}. UI QA verification in progress; other auto-skills will skip this PR until the lock is released.
  ```

- The lock MUST be released in the final step even on failure — wrap teardown in a `trap`/finally. Release: remove `in-progress` via the tracker operation **unlabel-pr** (labels enabled only), remove this run's assignee claim if it was added solely for the lock, and post via **comment-pr**:

  ```text
  🤖 `om-auto-qa-pr` completed: {PASS|FAIL|PARTIAL}. Evidence posted above. Lock released.
  ```
