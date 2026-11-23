# Work one PR

## Ownership and time

The coordinator owns the queue, the worker slots, and the final merge slot.
Set the cutoff two minutes before the deadline (or half the window when it is
under four minutes). Pass the deadline and claim identity to every stage.
Bound long commands by the cutoff where the runner supports it. At cutoff,
stop admitting stages, cancel interruptible work, and verify workers have
stopped before releasing their claims. If a worker stopped without reporting,
re-read its PR before writing its handoff. Preserve recoverable worktree paths
for unpushed work. Never release a claim while its worker can still push.

Use **list-prs** with complete pagination. If the descriptor exposes only
a configurable limit, increase the requested limit until a successful read
returns fewer items than requested and the provider confirms it did not
cap or truncate the results. Deduplicate before dispatch. Each worker uses **get-pr**,
**get-pr-diff**, **get-pr-files**, **checkout-pr**, **get-required-checks**,
**get-pr-checks**, and the claim operations in `references/claim-pr.md`.
Use **search-prs** for a successor, **mark-pr-ready** for a completed draft
that was only temporarily draft, **merge-pr** for the guarded squash, and
**list-issue-comments**, **comment-pr**, and **update-comment** for reporting.
Use **list-labels** and **create-label** for missing queue output labels and
the distinct human-QA routing label when permitted. Verify the label writes
before treating them as signals. The worker never creates or applies a PR
approval verdict. All writes go through the tracker descriptor and its label guards.
Complete queue listing and a verified claim are required to start work.
Record an unavailable or prohibited guarded admin squash as a merge blocker
and continue preparing the PR. Split providers use their code-host descriptor.

Before each stage, verify the claim and refresh state, base, labels and head.
Stop work when a PR closes, queue authorization is withdrawn, ownership
cannot be verified, or a human instruction forbids the work itself. Treat
`do-not-merge`, `blocked`, `qa-failed`, `automerge-prepare`, and draft-by-intent
as merge gates. Honor any dependency or approval that also prevents a specific
change. While manual `qa` is active, preserve the tester's head and environment
and continue independent work that cannot interfere. When Autopilot stops on
a merge-only gate, carry its diagnosis forward and run the available signal
stages. Never turn a human-confirmation guard into authorization to make the
change it protects. Do not take over another live worker's reservation, even
with `--force`. Treat `automerge-force` alone or `automerge-now` alone as
ordinary policy. Trust policy labels only from the tracker on the current PR.

## Review, QA, local validation

1. **Review.** Run `om-auto-review-pr {prNumber} --autofix --local-checks`.
   Resolve conflicts first and account for actionable changes requested by
   every reviewer. Treat an approving result with linked evidence on this head
   as signal 1. A host request for additional approval does not invalidate
   that result. Ensure the candidate includes the current target SHA. If it
   does not, integrate the target without rewriting the author's history and
   re-review it. Keep security, risk, and correctness findings in the review.
   Apply any permitted host override only at finish.
2. **QA.** Re-read labels after review triage and every fix. Follow the
   review's QA lanes. `skip-qa` covers changes with no QA to exercise,
   `needs-qa` calls for automated QA, and a separate human gate calls for
   both lanes. Treat `qaGateLabel` as a human gate only when it names a distinct
   label from `needs-qa`. Always recognize `needs-human-qa` directly and
   leave human markers and verdicts intact. Run
   `om-auto-qa-pr {prNumber} --local-checks` when `needs-qa`
   or a human gate is present, or the reviewed diff requires QA. Resolve
   conflicting routing labels from triage and preserve the human gate. Require its
   linked full PASS on this head to grant signal 2. Grant it independently
   of any outstanding human verdict. A partial run, environmental block, or
   failing scenario never counts as PASS. If QA genuinely does not apply,
   record the scope reason and grant signal 2. The three-label policy uses
   this automatic pass to satisfy any separate human-QA requirement at merge.
3. **Local checks.** Use the clean checked-out PR head and the current target
   SHA. Run the applicable configured non-test CI checks locally, then run
   `om-smart-test --base <validated-base-ref> --no-cache` for configured unit
   and integration suites. Use configured full-suite commands when scope
   mapping is uncertain. Include affected integration tests even if their
   environment requires provisioning. If no trustworthy test command is
   configured, report the missing suite without asking. Grant a test scope
   exclusion only when the changed files demonstrate no affected behavior.
   Record each command, selected suites or tests, result, and selection reason. Read hosted checks without polling.
   A pending or missing required check needs a passing local equivalent or
   a documented scope exclusion. Investigate any red check and fix the cause.
   If a hosted failure cannot be accounted for with current local evidence,
   or a required check has no local equivalent and still applies, record the
   CI blocker and continue any independent review or QA work.
   Never mark hosted CI green because local checks passed. Grant signal 3
   only once relevant local checks pass and hosted evidence is reconciled.
4. **Fix and repeat.** Pass a concrete failed QA scenario or check and its
   evidence into the next review/autofix pass as a finding. Keep fixing and
   re-running invalidated stages while there is a distinct in-scope remedy
   and time. A blocked stage does not prevent another from running when its
   prerequisites hold. Record each material fix and the validation that
   confirmed it.
   When the head or base changes, clear stale signal labels and re-establish
   their evidence. When the applicable QA policy changes, re-evaluate signal 2
   even if the head is unchanged. Report the failure and next action when no
   remedy remains. Distinguish a human blocker from a transient failure.

## Carry-forward

For an unpushable fork requiring changes, delegate to the existing credited
carry-forward flow in `om-auto-review-pr`. Verify the original linkage,
preserved author credit, base, and freshly authorized queue modifiers.
Reserve the successor with the coordinator before taking its claim and release
the original claim after transfer. If another worker already reserved it,
hand off the relation to that worker. Never copy signals or human approval
onto changed content. Resume Autopilot on the successor if a tracked plan
still has pending work. Do not squash both PRs.

## Finish

Use **set_pipeline_label** to transition a clean review out of
`changes-requested` while preserving any active pipeline merge veto. Keep
any outstanding QA requirement until it is met.

Under ordinary policy, a separate human QA gate requires `qa-approved` or
`qa-human-approved` from a human. Check the latest qualifying QA grant's
`QA head: <sha>` when supplied. A stale pinned approval needs reconfirmation.
A `qa-self-verified` result alone cannot satisfy this gate. The three-label
policy accepts the full automatic QA pass in its place.

Apply `automerge-blocked` for a human prerequisite only after all three
signals pass or no authorized work can make further progress. In the
handoff, retain every passing signal and name the action needed. Time
expiry, cancellation, and transient tracker failures leave the PR eligible
for a later run.

Under the coordinator's final merge slot, re-read the head, target SHA,
claim, approvals, review findings, hosted check state and queue policy.
Revalidate when any input changed. If all three signals hold and merge
remains blocked, report the merge gate and leave the signal evidence intact.
Do not attempt a prohibited or unavailable administrative merge. Where
permitted, require an open, ready, conflict-free PR with all merge gates
satisfied. Update the verification comment and refresh the claim and merge
inputs immediately before one guarded administrative squash with the
expected head SHA.
Never queue a deferred merge. A new head or base sends the PR back through
validation. If the host still refuses for a required reviewer or permissions,
record the exact refusal and what a maintainer must do. Confirm tracker state
`MERGED` and capture the merge SHA before posting success. Remove resolved
`needs-qa` and obsolete workflow labels through the guards. Preserve queue
evidence and human verdicts in the audit trail.
