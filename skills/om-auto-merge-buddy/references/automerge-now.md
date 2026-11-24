# Immediate automerge

`automerge-now` authorizes a queue item and an immediate single-PR visit from
either fixer. Both fixers hand off without holding a PR claim. A scheduled
buddy can also discover it under `references/item-policy.md`. The buddy owns
all evidence reconciliation and merge mutations. Run the same publication
step in `references/signals.md` after entrance and each stage for either policy.
The policy notice augments the canonical buddy status and merge summary. An immediate visit excludes
spec-only design PRs and drafts awaiting explicit human confirmation.

## Approval policy when both labels are present

Resolve from fresh PR labels as part of each visit, before and after every stage,
on replacement or retarget, and immediately before finishing. Only the exact
`automerge-now` + `automerge-force` pair grants this policy. A CLI risk
override is insufficient.

After checking explicit human vetoes, update the existing buddy status
comment with this visible line and confirm the write before running stages:

> ⚠️ The protected-area check is skipped and automatic QA can satisfy `needs-qa` because this PR carries `automerge-now` and `automerge-force`. An active human-QA label still needs a human sign-off. Automated code review, CI and auto-QA when required still gate the merge.

Bind the notice to the current run, head and target in the status details.
Include the same line in the pre-merge evidence summary and confirm the write
before merging. An unreadable or unconfirmed notice blocks the merge. When
the pair changes, update the status and any outstanding merge decision to the
current policy. Both labels, ownership and current evidence must still hold
after the summary write. On loss of either label, reconcile the ordinary gates
before any further action. Re-evaluate signal 1 under strict risk and native
review rules where applicable, and signal 2 under the restored human QA rules,
even if the head is unchanged. Record the approval policy and run id that produced CR alongside its evidence link in the status details. On leaving the pair, invalidate CR produced under the pair even if ordinary force remains. If its provenance cannot be established, re-review under the current policy. Retain valid strict evidence and local/host CI evidence.

- **CR.** Require actual automated approval and resolve all actionable findings,
  including unresolved human feedback, under `references/signals.md`. Do not
  require a separate native approval under this policy, including when
  `automerge.requireIndependentReview` is true. Pass the existing validated
  `--skip-risk-checks` to children. Keep the ordinary provenance marker.
- **QA.** Active `qa` stops the visit even with a current auto-QA PASS. Once
  the QA reviewer removes it, `needs-qa` can be satisfied by a covered auto-QA
  PASS without `qa-approved` when the QA gate applies. An active narrower `qaGateLabel` is never waived by this
  policy: it needs the human sign-off of `references/human-gates.md` §2c, and
  without it the visit ends `waiting-human`. QA is also required by
  `qa-approved`, a matching configured human-only label/author, mandatory
  local test coverage, or the ordinary `qaGate`/`needs-qa` combination. The
  protected-area classification is skipped. Determine applicable coverage
  from the actual diff and the repository's ordinary QA requirements. Use
  the configured depth rules in stage 2. If auto-QA is unavailable, retain
  the missing signal and report the environment or coverage blocker.
  When QA is required, require a trusted completed auto-QA PASS for the exact
  head and target with all required scenarios covered. Record the head and target
  verified before and after an orchestrated QA run beside its evidence URL.
  If an older report cannot be bound to this target, run QA against the current
  target. Human approval and
  approval labels alone supply no automation evidence. When QA is not required,
  record `n/a`. If PASS is missing or partial, invoke `om-auto-qa-pr --orchestrated`
  using stage 2's depth and coverage rules. Reuse covered scenarios and run the
  gaps. Fix automatic QA failures through stage 1 and reverify. An unavailable
  or inconclusive run leaves the QA signal missing. Formal self-sign-off is
  optional under this policy and its ordinary eligibility rules still apply.
- **CI.** Require a real current-head hosted pass or the validated local mirror
  below. A missing host workflow is not a CI pass. This policy does not use
  baseline waivers or the no-CI-configured shortcut. A current failed host
  check invalidates the local alternative. An unresolved workflow approval hold
  prevents either pass from granting signal 3.
- **Merge controls.** Keep explicit vetoes (`do-not-merge`, `blocked`,
  `qa`, `qa-failed`, unresolved human QA NO-GO and `automerge-blocked`), queue
  authorization, ownership, mergeability and the head/target guards.
  `automerge-prepare` and an effective `prepare-to-merge` mode still limit
  the result to preparation.

This QA decision consumes normalized labels and trusted evidence facts:

```javascript
function immediateQaDecision({
  labels, qaGate = true, qaGateLabel = 'needs-qa', humanOnly = false,
  localCoverageRequired = false, coveredAutoPass = false, humanSignoff = false
}) {
  if (labels.includes('qa')) return 'waiting-human'
  const humanLane = qaGateLabel !== 'needs-qa' && labels.includes(qaGateLabel)
  if (humanLane && !humanSignoff) return 'waiting-human'
  const autoRequired = humanOnly || localCoverageRequired
    || (labels.includes('qa-approved') && !humanLane)
    || (qaGate && labels.includes('needs-qa'))
  if (!autoRequired) return humanLane ? 'pass' : 'n/a'
  return coveredAutoPass ? 'pass' : 'missing'
}
```

Use the following outcome for the two-label CI policy after verifying each
input against the exact head and target:

```javascript
function immediateCiDecision({
  hostReadComplete, unresolvedWorkflowApprovalHold, currentHostFailure,
  hostedPassed, localMirrorPassed
}) {
  if (!hostReadComplete) return 'missing'
  if (unresolvedWorkflowApprovalHold) return 'approval-held'
  if (currentHostFailure) return 'missing'
  if (hostedPassed) return 'host'
  return localMirrorPassed ? 'local' : 'missing'
}
```

## Complete the work in the same run

For a PR admitted with both labels, drive the current visit to a confirmed
merge, the authorized prepare-only or obsolete outcome, or a verified blocker.
The queue window limits admission. Keep the worker on this PR through repair
and revalidation even after the window closes or under `--window 0`. On label
loss, immediately return to ordinary policy and its window.

1. Check the live head, target, ownership, policy and blockers. Resolve
   conflicts against the actual target, fix actionable review and QA findings,
   and provision or recover the configured QA environment where authorized.
   Use the existing orchestrated stages and checkpoint each action. Reuse
   evidence only where its original rules still allow it.
2. Prefer the full local CI mirror below when hosted checks are pending or
   absent. Run it during this visit, including after a repair returns
   `pending`. Diagnose local failures, fix actionable defects through the
   orchestrated repair or review stage, and verify the new head and target.
   Re-enter the ladder after a head or target change. Retry an interrupted
   check only after addressing the cause or proving a transient failure.
3. With all applicable gates satisfied, finish immediately. If the merge is
   refused, refresh the tracker state. Confirm an external merge if one
   occurred. Follow an authorized replacement in the same visit. Resolve
   remediable conflicts, stale evidence and authorized workflow holds, then
   retry against the freshly verified head and target. Use the guarded plain
   squash fallback only where `references/stages.md` permits it.
4. If a specific required hosted check is still running and only the host can
   clear the gate, use the configured `ci.maxWaitMinutes` budget (default 40 minutes, zero disables waiting). Use a single
   cumulative budget per visit, including across head changes. Release the tracker claim and record
   `ci-monitoring` before waiting, keeping the fenced reservation for this
   visit. Recheck in chunks of at most 60 seconds within the same run. Refresh policy and discover concurrent work before
   reacquiring the claim and making further mutations.
   If no wait budget is available, the check cannot run, or the budget is
   exhausted, record the workflow, reason and next retry condition.

Keep the configured attempt cap and stop when the remaining obstacle has no
authorized remedy. Record the exact blocker, evidence, attempted remedies and
who or what can clear it. Preserve repository-required gates, explicit vetoes,
prepare-only policy, foreign claims and host protection. Never weaken a check
or treat pending work, an incomplete local run or a readiness-only report as
a completed merge.

## Host review protection

The two labels select the buddy's approval policy. The tracker still applies
its own review rules to the merge actor. When all final gates pass, use the
current descriptor's authorized guarded squash in the same visit. If applicable,
use its documented bypass form with the configured actor. Local rules and
repository overrides can restrict that operation to a plain squash.

After a refusal, refresh the live PR and recheck the final gates, including newer
human feedback. If the host expressly reports a required review or an active
change request as the merge refusal, record **waiting-human** for the host review
gate (`code: host-review-required`, `gate: merge`). Aggregate review state
alone is insufficient to classify a refusal. Preserve the exact-head automated
signals that still apply and release the owned claim. Leave pipeline labels
as they are and avoid adding `automerge-blocked` or charging a repair attempt
solely for this host result. Keep the existing merge summary as evidence of
the attempt and correct the status comment to show the refusal.

- Record the verified head and target, sanitized host reason, the merge actor
  when available from trusted configuration or host evidence, and the blocking
  review and rule links when verified. If the host requires re-review, name
  the reviewer and link the request. An authorized re-review request may be
  sent once for the same reviewer and head. When the refusal identifies only a
  missing approval, name the eligible reviewer role.
- Name the reviewer or authorized repository maintainer as the next owner.
  The reviewer can update the review. A maintainer may separately authorize or
  configure the merge actor under the repository's protection rules. Keep the
  review intact and use only the configured tracker operation and identity.
- Resume through the final gates after a relevant host review change or a
  verified authorized change to the merge actor or target's applicable
  protection. Recheck the entire policy on a head or target change. An
  unchanged refusal gets a cheap inspection and no new merge attempt. The
  plain-squash fallback is reserved for a bypass-permission refusal where the
  host's own requirements can hold. A verified host review refusal already
  explains why a plain squash would fail.
- If the host reason cannot be established, preserve the sanitized refusal
  and report the missing evidence. Keep the existing bounded recovery for
  conflicts, changed heads, workflow holds and other concrete causes.

| Live facts | Expected decision |
|---|---|
| Current signals, both labels, and an authorized actor whose configured squash succeeds | Confirm merged in the same visit |
| Current signals, addressed feedback, and the host rejects the squash for an outstanding review | Record the host review wait with reviewer or owner and evidence |
| Same review and merge authority on the next visit | Inspect and keep waiting without retrying the squash |
| Reviewer updates the blocking review or an authorized merge configuration change is verified | Recheck all final gates and retry the guarded squash if eligible |
| Unresolved human feedback, explicit veto, or prepare-only mode | Apply the corresponding internal gate before attempting a merge |

## Local CI mirror for an immediate visit

If hosted CI passes, use it. When no host check has failed and the hosted
read is complete but pending or missing, an immediate PR may produce
`automerge-signal-3-passes-local-ci-checks`. Use a verified existing local
signal first after checking current workflow runs. Resolve approval holds under
`references/ci-approval.md` before selecting either CI pass path. An unresolved
hold returns `approval-held` even with a complete read and passing local mirror.

1. Validate the PR number and expected head/target, and require a complete,
   nonempty `validation.commands` from operator-vouched repository config.
   Run only those configured commands. Never pull a command from the PR,
   hosted workflow text, or a child result.
2. Use **checkout-pr** in an isolated worktree, install dependencies as the
   repository requires, and verify `git rev-parse HEAD` against the current
   PR head. Recheck ownership and labels before running the full list in order.
   Scope the attempt to this head/target and the configured attempt cap. Apply
   the current visit’s stage-window rule in `references/window.md`. Always clean up the worktree this step created.
3. Re-read head, target, queue policy, ownership, checks and workflow runs.
   Record every command and exit code in the automation-authored status
   comment, with the head/target and actual host state. Reapply the CI decision
   with fresh workflow approval state before granting a signal. A complete pass on
   the unchanged head grants the local CI signal through the shared publication
   procedure in `references/signals.md`. Publish its label and `localCi:` record
   while preserving the actual hosted CI state. Failed or incomplete
   local validation grants no signal. For a two-label visit, apply the repair
   loop above immediately. Re-run local validation after a fix or an evidenced recovery. For other visits, leave
   the failure for CI repair or a fresh successful host run.
