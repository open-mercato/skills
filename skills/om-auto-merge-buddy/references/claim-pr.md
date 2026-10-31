# Claim, release and the waiting states

This skill holds a PR's lock only while actively working it, and it shows every
other state through labels and one status comment. Every read and mutation goes
through the tracker descriptor's operations, and labels go through the guards.

## Who may be claimed

- **Skip** a PR carrying `in-progress`: another skill or human is working it. **Exception:** this skill's own stale claim. That is `in-progress` with this skill's status comment saying `working`, the comment last updated more than 60 minutes ago, and no commits, comments or label changes on the PR since. Recover it by noting `🔁 recovered a stale claim from a previous run` in the status comment, then claim normally.
- **Skip** a PR carrying `automerge-blocked`: it is parked until a human clears it.
- **Ignore the assignee.** Unlike the shared three-signal check, a foreign assignee is not a lock here. The queue is other people's PRs by design. Never assign or unassign anyone.
- **`ci-monitoring` is not a lock.** A PR carrying it (from this skill or any other) is claimable; for this skill it just means "check CI first".
- A `🤖` claim comment from another skill within the last 30 minutes, on a PR without `in-progress`, means that skill is between steps of a chain. Skip the PR this round and revisit it later in the window.

## Claim (before any other work on the PR)

1. `apply_label "in-progress" {pr}` and `unlabel-pr` `ci-monitoring` (the swap back).
2. Rewrite the status comment's `State:` line to `working — run <RUN_ID> since <ISO-8601>`, creating the comment on first visit (`references/report-templates.md`). This comment is the claim comment. It is updated in place, never posted again.
3. Register a trap/finally that releases the claim (below) on every exit path: success, a stage failure, the deadline, or a crash of the orchestrating process.

## Release (the visit's last tracker mutations)

| Outcome | Labels | Status `State:` |
|---|---|---|
| `merged` | remove `in-progress` | `🚀 merged <sha>` |
| `ready` (`prepare-to-merge`) | remove `in-progress`; `set_pipeline_label {pr} merge-queue` | `✅ ready to merge` |
| `waiting-ci` | swap `in-progress` → `ci-monitoring` | `waiting for CI on <sha> since <ts>` |
| `waiting-human` | remove `in-progress` | `⚠️ waiting for human QA sign-off` |
| `blocked` | remove `in-progress`; `apply_label "automerge-blocked"` | `⛔ <reason> — remove automerge-blocked to retry` |
| `replaced` | on the original: remove `in-progress`, `ci-monitoring` and every `automerge-signal-*` | `🔁 replaced by #<n>` |
| stopped (label removed by a human) | remove `in-progress` and `ci-monitoring` | `stopped — automerge label removed` |

`ci-monitoring` from this skill means "the next visit owes a CI check". Remove it
when that visit reads a settled CI state. A human removing `AUTOMERGE_LABEL`
also ends the obligation.

## Sub-skills under this claim

Sub-skills always run with `--orchestrated`. They skip their own claim checks,
claim comments, label changes, lock release and CI waits, and run under this
skill's `in-progress`. Never invoke a sub-skill without the flag on a PR this
skill holds. Without the flag, the sub-skill's own claim and labels would fight
this skill's state machine.
