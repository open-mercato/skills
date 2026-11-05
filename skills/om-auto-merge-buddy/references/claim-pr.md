# Claim, release and the waiting states

This skill holds a PR's lock only while actively working it, and it shows every
other state through labels and one status comment. Every read and mutation goes
through the tracker descriptor's operations, and labels go through the guards.

## Bot accounts with blocked assignment

When `CURRENT_USER` ends in `[bot]`, the tracker may reject self-assignment.
If the assignment operation reports that restriction, or a read-only
assignability check confirms it, continue without assigning the bot. Do not
interpret an unrelated authorization error or a failed human assignment as
this exception; record the actual assignment limitation once.

In this case, **use only the `in-progress` label as the claim flag**; keep the
normal claim/status comment for ownership and audit, including the bot login,
run/chain identifier and timestamp. Read back the label and comment through
**get-pr**/**get-issue** before producing work. If labels are disabled, missing,
unwritable or cannot be verified, stop with a claim blocker. Recheck existing
claims immediately before claiming; a competing or uncertain claim means back
off, not overwrite. A matching bot login alone does not prove re-entry: another
run can share it. Require the same run/chain identifier for re-entry or hand-off;
otherwise use the existing conflict/stale-lock rules.

This exception applies to every assignment/verification step below, including
skill-specific claims and chained hand-offs. Preserve existing assignees; on
release remove only this run's label claim and post its completion comment.
Never unassign or restore an assignee this run did not change. Label/comment
failures and all review, QA, merge and inherited-lock gates retain their normal
behavior. Human accounts and successful bot assignments keep the normal path.

## Who may be claimed

- **Skip** a PR carrying `in-progress`: another skill or human is working it. **Exception:** this skill's own stale claim. That requires `in-progress` while this skill's status comment says `working`, a heartbeat more than 120 minutes old, and positive proof the scheduler reservation owner plus all delegated handles are dead (`references/scheduler.md`). A live/unknown reservation is never stolen on heartbeat age. Activity may be from a delegated stage; inspect it before declaring the owner dead. Recover the claim by noting `🔁 recovered a stale claim from a previous run` in the status comment, then claim normally.
- **Skip** a PR carrying `automerge-blocked`: it is parked until a human clears it.
- **Assignee priority and first action.** A foreign assignee alone is not a lock here; the global queue still includes other people's PRs. With a nonempty active scheduler prefer current-user assigned actionable work (`references/scheduler.md`). At the first actionable step **assign-pr** `CURRENT_USER`, then verify it through **get-pr** before claiming or producing work. Preserve other assignees; never unassign on release or reset. A failed/unknown assignment blocks that visit unless the confirmed bot-assignment exception above applies.
- **`ci-monitoring` is not a lock.** A PR carrying it (from this skill or any other) is claimable; for this skill it just means "check CI first".
- A `🤖` claim or take-over comment (not a review, evidence or summary comment) from another skill within the last 30 minutes, on a PR without `in-progress`, means that skill is between steps of a chain. Skip the PR this round and revisit it later in the window. Sub-skills running under this skill's `--orchestrated` flag post no claim comments, so they never trigger this rule.

## Claim (before any other work on the PR)

First verify the fenced scheduler reservation under its short transaction lock, tracker authorization and claim guards. Persist the plan before an actionable step; **assign-pr** and verify current-user assignment as above.

1. `apply_label "in-progress" {pr}` and `unlabel-pr` `ci-monitoring` (the swap back).
2. Rewrite the status comment's `State:` line to `working — run <RUN_ID> since <ISO-8601>, heartbeat <ISO-8601>`, creating the comment on first visit (`references/report-templates.md`). This comment is the claim comment. It is updated in place, never posted again. Refresh the heartbeat before every stage, so a live run never looks stale.
3. Checkpoint the same plan/progress, next action, UTC `nextCheckAt` and semantic `updatedAt` in local JSON and this existing comment before and after every stage (`references/scheduler.md`). Heartbeats stay separate.
4. Register a trap/finally that releases the claim (below) on every exit path: success, a stage failure, the deadline, or a crash of the orchestrating process.

## Release (the visit's last tracker mutations)

| Outcome | Labels | Status `State:` |
|---|---|---|
| `closed-obsolete` | remove owned `in-progress`, `ci-monitoring`, `automerge-signal-*` and `automerge-blocked` via guards after confirmed closure | `closed — no remaining value; already covered on target` |
| `merged` | remove `in-progress` | `🚀 merged <sha>` |
| `ready` (`prepare-to-merge`) | remove `in-progress`; `set_pipeline_label {pr} merge-queue` | `✅ ready to merge` |
| `waiting-ci` | swap `in-progress` → `ci-monitoring` | `waiting for CI on <sha> since <ts>` |
| `queued-qa` | remove `in-progress`; keep actual CI state | `Queued for automatic QA — no human action needed; next automatic step named` |
| `waiting-human` | remove `in-progress` | `⚠️ waiting for human QA or required independent review` |
| `blocked` | remove `in-progress`; `apply_label "automerge-blocked"` | `⛔ <reason> — remove automerge-blocked to retry` |
| `replaced` | on the original: remove `in-progress`, `ci-monitoring` and every `automerge-signal-*` | `🔁 replaced by #<n>` |
| stopped (label removed by a human) | remove `in-progress` and `ci-monitoring` | `stopped — automerge label removed` |

Before releasing, recompute/persist the current concrete reason, action owner, retry condition, outcome/schedule and evidence, and mirror it in the same status comment on every visit (`references/scheduler.md`). An unchanged outcome does not retain an obsolete reason. For merged/closed/unauthorized entries, verify the reservation, finalize the same comment and release the owned tracker claim before removing the row in the final bounded transaction. Failed cleanup retains its reserved cleanup-pending row (`references/scheduler.md`). Retain ready/human/blocked ones for scheduled inspection. Never delete pending follow-ups from the separate handoff.

`ci-monitoring` from this skill means "the next visit owes a CI check". Remove it
when that visit reads a settled CI state. A human removing `AUTOMERGE_LABEL`
also ends the obligation.

## Sub-skills under this claim

Sub-skills always run with `--orchestrated`. They skip their own claim checks,
claim comments, label changes, lock release and CI waits, and run under this
skill's `in-progress`. Never invoke a sub-skill without the flag on a PR this
skill holds. Without the flag, the sub-skill's own claim and labels would fight
this skill's state machine.
