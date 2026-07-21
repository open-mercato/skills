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

   `` 🤖 Claiming this {issue|PR} — starting `{skill-name}` run. Started: {ISO-8601 timestamp}. ``

## Release / handback

When the run finishes, hands off, or aborts:

- Remove the `in-progress` label via the guard.
- In issue-driven runs, hand the issue back: restore the original assignee/author when the pipeline convention expects it.
- Post a short release comment stating the outcome (PR opened with its number, blocked with the blocker, or no action needed).
- The claimant releases their own claim — never release a lock another agent holds. A sub-skill that claims for itself (e.g. `om-auto-review-pr` during the autofix pass) owns its own release; do not second-guess it.

## Chained hand-off — a live chain never drops its lock

When the same run (same `CURRENT_USER`) finishes one skill and continues on the same item with another — `om-open-pr` → `om-auto-review-pr`, review → UI QA, or any flow-runner chain — the lock is **transferred, never released and re-acquired**. A release-then-reclaim seam leaves the item observably unclaimed mid-run: any concurrent actor's three-signal check reads "not in progress" and legitimately starts duplicate work, and humans watching the tracker see no owner and no state.

- **Hand-off (finishing step):** keep the `in-progress` label and lock assignee in place; instead of the release comment, post a hand-off comment naming the next phase:

  `` 🤖 `{finishing-skill}` completed: {outcome}. Lock handed off to `{next-skill}` — chain continues on this {issue|PR}. ``

- **Take-over (next step):** the three-signal check finds the lock held by `CURRENT_USER` → re-entry. **Before any other work** — fetching diffs, running validation, posting findings — refresh the claim comment so the tracker always shows who holds the item and why:

  `` 🤖 `{next-skill}` taking over the chain lock — {phase}. Started: {ISO-8601 timestamp}. ``

- **Ownership:** a skill releases only a lock its own run opened. An inherited (handed-off) lock is annotated in the completion comment (`Lock retained — chain continues.`) and released by the chain's driving skill at the end of the run, or by its failure path — "the claimant releases their own claim" applies to the chain as a whole.
- **Invariant:** an item under active automation is never observably unclaimed — the claim or take-over comment precedes any work product, and the hand-off or release is the step's last tracker mutation.

## om-open-pr specifics

This skill does not open a new claim of its own: it inherits the `in-progress` lock an earlier chain step claimed (typically `om-fix`, driven by `om-auto-fix-issue`) and owns the **Release / handback** phase — its step 8 — plus, with `--handoff`, the lock **transfer** below. Skip the issue phase when no `{issueId}` was given (brief- or spec-driven runs).

**Chained hand-off (`--handoff <next-skill>`).** When the caller's chain continues on the PR, the chain lock moves from the issue to the PR instead of lapsing. Execute this **before** the issue handback, as soon as `{prNumber}` exists:

1. **assign-pr** — assign `$CURRENT_USER` to `{prNumber}` (tolerate failure).
2. `apply_label "in-progress" {prNumber}` via the guard (missing label / `labels.enabled: false` → logged skip; the comment below still posts and remains the lock signal).
3. **comment-pr** — post on `{prNumber}`:

   ```
   🤖 `om-open-pr` completed: PR opened. Lock handed off to `{next-skill}` — chain continues on this PR.
   ```

On the blocked paths (no changes / push failed / PR open failed) there is no PR to transfer to — skip the transfer and release the issue lock as below.

**Always release the issue lock, even on failure.** Whether or not the PR opened cleanly, the issue lock must be released at the end of an issue-driven run — treat step 8 as a finally-block (use a trap/finally pattern so a crash still clears it). The PR lock applied by the hand-off is **not** released here — the chain's driving skill owns it from now on (see the chained hand-off section above).

**Handback procedure.** Resolve `CURRENT_USER` via **current-user** and `ISSUE_AUTHOR` via **get-issue** (field `author`). If `ISSUE_AUTHOR` is non-empty, differs from `CURRENT_USER`, and `PR_URL` is set:

1. **unassign-issue** — remove `$CURRENT_USER` from `{issueId}` (tolerate failure).
2. **assign-issue** — add `$ISSUE_AUTHOR` to `{issueId}` (tolerate failure).
3. **comment-issue** — post on `{issueId}`:

   ```
   Thanks @${ISSUE_AUTHOR} — a PR is ready: ${PR_URL}. Reassigning the issue to you for verification.
   ```

**Lock release.** When `LABELS_ENABLED` is `true`, remove the `in-progress` label from `{issueId}` via **unlabel-issue** (through the descriptor's guard; tolerate failure), then post on `{issueId}` via **comment-issue** (when `PR_URL` is unset, substitute `(no PR — aborted)`):

```
🤖 `om-open-pr` — completed: opened ${PR_URL:-(no PR — aborted)}. Lock released.
```
