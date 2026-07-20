# Claiming and releasing work — issues and PRs

The generalized claim/lock procedure for any tracker item (issue or PR) an autonomous run takes ownership of. All reads and mutations go through the tracker descriptor's operations; label mutations only through the `apply_label` guard. This complements the skill-specific slot check in the skill body — the slot check decides whether the *work* exists, this procedure decides who *owns* it.

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
- The claimant releases their own claim — never release a lock another agent holds. A sub-skill that claims for itself owns its own release; do not second-guess it.

## om-close-fixed-issues specifics

This skill claims **issues** (never PRs), always on `$REPO`, using the cross-repo issue-label guards (`label_exists`, `apply_issue_label`, `remove_issue_label`) as defined in `references/agentic-setup.md`. Assign via **assign-issue**, comment via **comment-issue**.

Claim sequence per issue (before closing it): run **assign-issue** to add `$CURRENT_USER` to {issue}, then `apply_issue_label "in-progress" {issue}`, then post via **comment-issue**:

```text
🤖 `om-close-fixed-issues` started by @${CURRENT_USER} at ${timestamp}. Other auto-skills will skip this issue until the lock is released.
```

(where `${timestamp}` is the current UTC time, `date -u +%Y-%m-%dT%H:%M:%SZ`)

After the close/comment action, release with `remove_issue_label "in-progress" {issue}`.

Extra skip signals (in addition to the three-signal check): the issue carries `do-not-close` or `blocked`; the issue is not `OPEN`; the issue is assigned to a user other than `${CURRENT_USER}` **and** carries `in-progress` (claimed by another run) — skip and report `skipped: claimed by @other`.

When `labels.enabled` is `false`, the claim degrades to assignee + claim comment only and the lock checks degrade to assignee-only.

Always remove `in-progress` (via the guarded helper) from issues the run added it to, even on error. Wrap the mutation block in a `trap`/finally so a crash or early stop still clears the lock.
