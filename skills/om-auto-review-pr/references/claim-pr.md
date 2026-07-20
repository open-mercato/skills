# Claiming and releasing work — issues and PRs

The generalized claim/lock procedure for any tracker item (issue or PR) an autonomous run takes ownership of. All reads and mutations go through the tracker descriptor's operations; label mutations only through the `apply_label` guard.

## Three-signal in-progress check

Resolve `CURRENT_USER` via the tracker operation **current-user**, then read the item (for PRs via **get-pr**; for issues via the descriptor's issue-read operation). The item counts as **already in progress** when ANY of these signals holds:

1. **Assignee** — the item is assigned to someone other than `CURRENT_USER`.
2. **`in-progress` label** — the label is present on the item.
3. **Recent robot claim comment** — a `🤖` claim comment posted within the stale window by someone other than `CURRENT_USER`.

Decision:

- No signal → claim and proceed.
- Signals point at `CURRENT_USER` → re-entry into your own run; refresh the claim (idempotent) and continue.
- Signals point at someone else → **STOP** and report the owner — unless the lock is stale (below) or `--force` was passed.

## Stale-lock recovery

A claim is **stale** when the newest claim signal is older than the stale window and the claimant has produced no commits, comments, or label changes on the item since. Never silently overwrite a live claim.

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
- The claimant releases their own claim — never release a lock another agent holds.

## om-auto-review-pr specifics

This skill claims the PR itself (step 1 of the skill body) and uses tighter windows than the generic defaults.

**Detection.** Run **current-user** to fill `CURRENT_USER`, then **get-pr** for `{prNumber}` requesting `assignees`, `labels`, `number`, `title`, and `comments`. The PR is **already in progress** when it carries the `in-progress` label, has at least one assignee whose login is not `$CURRENT_USER`, or has a claim comment newer than **30 minutes** from another actor (look for the `🤖` start marker).

Decision tree:

| State | `--force` set? | Action |
|-------|---------------|--------|
| Not in progress | — | Claim and proceed |
| In progress, current user owns the lock | — | Treat as re-entry; proceed without re-claiming |
| In progress, someone else owns the lock | no | **STOP**. Ask the user: "PR #{prNumber} is in progress (owner: {owner}, signal: {label/assignee/comment}). Override and continue?" Only continue when the user explicitly says yes. |
| In progress, someone else owns the lock | yes | Post a force-override comment naming the previous owner, then claim and proceed |

**Stale lock**: if the `in-progress` label is older than **60 minutes** and the assignee did not push or comment in that window, treat it as expired. Still ask the user before overriding unless `--force` was set.

**Claim** (only after the check passes) — three tracker operations:

1. **assign-pr**: add `$CURRENT_USER` as an assignee on `{prNumber}`.
2. Run `apply_label "in-progress" {prNumber}`.
3. Post the claim comment via **comment-pr**, filling in `$CURRENT_USER` and the current UTC timestamp (ISO-8601, e.g. `date -u +%Y-%m-%dT%H:%M:%SZ`):

```text
🤖 `om-auto-review-pr` started by @{CURRENT_USER} at {timestamp}. Other auto-skills will skip this PR until the lock is released.
```

When `labels.enabled` is `false`, the claim consists of the assignee plus the claim comment — other skills detect those two signals.

**Release** (step 12 of the skill body — always, even on failure; use a `trap` or equivalent finally-block so a crash or early stop still clears the lock):

1. When `LABELS_ENABLED` is `true`, remove the `in-progress` label from `{prNumber}` via the tracker operation **unlabel-pr**.
2. Post the lock-release comment via **comment-pr**, where `VERDICT` is the decision from steps 9–10 (`APPROVED` or `CHANGES REQUESTED`):

```text
🤖 `om-auto-review-pr` completed: {VERDICT}. Lock released.
```

The completion comment carries the verdict plus a short summary (and, when autofix ran, how many fix iterations completed). For `changes-requested`, the assignee is already handed back to the author before release; for approved outcomes, keep the current assignee unless a handoff changed it.
