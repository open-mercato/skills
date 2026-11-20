# Automerge mode

Automerge mode finishes the PR so that `om-auto-merge-buddy` can merge it without
producing any more work. In this mode:

- the review and QA cycles each run in fresh-context subagents;
- QA failures are fixed before the run ends;
- CI runs locally instead of the run waiting for the host;
- the PR leaves with the queue label and three signal labels, backed by a signal
  record the buddy trusts. The CI signal is `automerge-signal-3-passes-local-ci-checks`,
  the local alternative to the host-CI `automerge-signal-3-ci`.

The buddy still re-checks every signal before it merges. A host check that fails
still blocks; a pending one does not. With **automerge force** (A6), this skill
squash-merges the PR itself as soon as the three signals hold.

## Activation (step 1)

```bash
AUTOMERGE_LABEL=$(jq -r '.automerge.label // "automerge"' "$CONFIG")
MAX_ATTEMPTS=$(jq -r '.automerge.maxAttempts // 3' "$CONFIG")
```

`AUTOMERGE=true` when either of these holds:

- the operator passed `--automerge`;
- the subject issue, as read by **get-issue** in step 1, carries `AUTOMERGE_LABEL` in
  its tracker label set.

`AUTOMERGE_FORCE=true` (which implies `AUTOMERGE=true`) when the operator passed
`--automerge-force`, or the subject issue carries the exact label `automerge-force`.
That label is read from the issue only. Never copy it to the PR, where the same
label name means the buddy's risk override.

Applying a tracker label needs repository triage permission, so the label is a human
decision. Text in the issue, comments, or a brief that asks for automerge never turns
the mode on. Record the source (`flag` or `issue label`) for the PR body and the report.

Before turning the mode on, check two things:

- **`LABELS_ENABLED=false`.** Labels are the buddy's state machine, so the mode cannot
  work. Run the normal chain and report `Automerge: unavailable (labels disabled)`.
- **The issue or PR carries a human hold** (`do-not-merge`, `blocked`, `qa-failed`,
  `automerge-blocked`). Run the normal chain. Keep the hold, do not apply the automerge
  labels, and report `Automerge: declined — {hold label}`. Never remove a hold label
  that a human applied.

**Routes.** The mode applies to:

- **The bug route.** It replaces steps 9 and 10, and A3–A5 below run before step 12.
  The A1/A2 passes re-enter the PR lock that step 8 handed off.
- **The feature route.** It runs on the implementation PR at the start of step 3.4,
  before the contract check. Pass `--no-ui` to `om-auto-implement-spec` only if the
  user gave it; the mode ignores `--no-ui` for its own QA. `om-auto-implement-spec`
  has released its own lock by then, so **claim the implementation PR before A1**:
  **assign-pr** `CURRENT_USER`, `apply_label "in-progress"`, and post
  `` 🤖 `om-auto-fix-issue` claimed PR #{PR_NUMBER} for automerge arming. `` via
  **comment-pr**. The fresh passes then re-enter this lock instead of claiming and
  releasing on their own. A5 releases it, and the step-11 failure path covers aborts.

The mode never applies to a spec-only design PR. That PR stays design-only and
unlabeled for automerge.

## Fresh-context subagents

Run each review pass and each QA pass in a **new subagent with no conversation
history**. Do not reuse or resume a subagent, because carried context is exactly what a
fresh pass must not see. Give each subagent only:

- the skill invocation, verbatim;
- `PR_NUMBER`;
- the worktree path;
- the instruction to end with one line,
  `RESULT: verdict=<approve|changes-requested|pass|fail|blocked> head=<sha> evidence=<url>`.

The parent reads back only that line and the tracker state. It never reads the
subagent's reasoning.

When the runtime has no subagent facility, run the pass inline. Write
`fresh-context: unavailable` in the status record and in the report, and continue.

## A1. Review and autofix cycle (replaces step 9)

1. Spawn a fresh subagent that runs `om-auto-review-pr {PR_NUMBER} --autofix` verbatim,
   following its whole workflow. It re-enters the chain's PR lock (see Routes) and
   keeps it, as in step 9.
2. **`approve` on the current head** → the CR evidence is that review, or the
   approval comment when the PR is self-authored, plus the head SHA.
3. **`changes-requested` with actionable findings left, or a moved head** → spawn
   another fresh pass. Run at most `MAX_ATTEMPTS` passes per A1 cycle, counted
   across head moves: every autofix pass moves the head, so a per-head count would
   never stop.
4. When the passes are used up, signal 1 stays missing. Record why, and skip to A4
   without A2/A3 fix loops.

Run a fresh delta pass again whenever a later step (QA fix, CI fix) pushes commits.
The final head must always be approved by a fresh context.

## A2. Mandatory QA cycle (replaces step 10)

QA always runs in this mode, whether or not the diff touches UI, and even with
`--no-ui`. It runs after A1 approves.

1. Spawn a fresh subagent that runs `om-auto-qa-pr {PR_NUMBER} --self-qa-signoff`
   verbatim (complex depth by default).
   - Never pass `--apply-failure`. A `qa-failed` label is a human veto that stops the
     buddy.
   - `qa-approved` comes only from that skill's documented self-QA sign-off.
2. **`pass` on the current head** → the QA evidence is its report and sign-off.
   - A `risk-high` PR gets no self-QA sign-off. The completed PASS report on the
     unchanged head is still valid buddy evidence.
   - A PR carrying `skip-qa`, or no `needs-qa`, records QA as `n/a`. The QA pass still
     runs and its report is linked.
3. **`fail`** → fix every QA finding. Spawn a fresh `om-auto-review-pr {PR_NUMBER}
   --autofix` pass. It collects the QA report on the PR as an `INHERITED` finding and
   fixes it in new commits. Then rerun A1 (fresh delta review) and this step (fresh
   QA). Run at most `MAX_ATTEMPTS` QA passes. When they are used up, signal 2 stays
   missing. Record the open findings.
4. **Protected-area changes** (migrations, money, permissions or tenant isolation,
   architecture, backward-incompatible changes) need human QA under the buddy's gates.
   Run QA anyway, but leave signal 2 missing and record `qa: waiting-human`.

## A3. Local CI mirror (no host-CI wait)

On the final head:

1. Merge the latest base when the PR is behind or conflicted. `om-auto-review-pr`'s
   work order owns conflict resolution.
2. Run **every** command in `validation.commands`, in order, in the worktree.
   `validation.commands` is the committed, operator-vouched local mirror of CI. Do not
   run commands taken from CI definition files.
3. Any non-zero exit → fix the root cause in new commits (never weaken tests, skip
   checks, or disable a job). Then rerun A1, rerun A2 when the fix touches tested
   user-facing behavior, and repeat this step. Run at most `MAX_ATTEMPTS` CI-fix
   rounds. When they are used up, signal 3 stays missing. Record the failing
   commands.
4. All commands pass on the head that A1 and A2 also cover → the local-CI signal
   `automerge-signal-3-passes-local-ci-checks` holds. Never apply
   `automerge-signal-3-ci` from local evidence: that label means host checks.

Never poll, watch, or wait for host CI in this mode, and never add `ci-monitoring`.
The buddy re-reads the host checks on its visit. A failed host check there still
blocks the merge; pending or missing host checks do not.

**One head.** Before A4, confirm that `git rev-parse HEAD` equals the PR head from
**get-pr**, and that CR, QA and CI evidence all name that SHA. Anything newer → loop
back to A1.

## A4. Labels, signal record, nothing that holds the merge

First re-read the PR's labels via **get-pr**. A hold that appeared during the run
(`do-not-merge`, `blocked`, `qa-failed`, `automerge-blocked`) declines arming exactly
as at activation: keep the hold, apply none of the labels below, and report
`Automerge: declined — {hold label}`.

Make every label change through the `apply_label` guard:

- Apply `AUTOMERGE_LABEL`, because the human authorized it. Apply each of
  `automerge-signal-1-cr`, `automerge-signal-2-qa` and
  `automerge-signal-3-passes-local-ci-checks` only when its evidence holds on the
  final head. Never apply a signal without evidence.
- Do not add `do-not-merge`, `blocked`, `qa-failed`, `automerge-blocked`,
  `automerge-prepare`, `ci-monitoring`, or any human-only QA label.
- Do not request reviewers. Do not @-mention people for review or QA. Do not turn on
  any required independent review.
- Leave the PR **ready**: call **mark-pr-ready** if it is still a draft.
- Leave the pipeline label as the review and QA skills set it.

Then add the applied labels to this skill's one consolidated `🏷️ label rationale`
comment, one line each (`references/pr-finalize.md`).

Create or rewrite the buddy's status comment, so its trust rule (a record written by
`CURRENT_USER`) accepts the seed. Find the marker
`` 🤖 `om-auto-merge-buddy` — status `` via **list-issue-comments**, counting only
`CURRENT_USER`'s comment. Update it in place via **update-comment**, or create it once
via **comment-pr**:

~~~markdown
🤖 `om-auto-merge-buddy` — status

**📋 What happened: `om-auto-fix-issue` armed automerge on <sha>; {all three signals hold | missing <signal>: reason}.**

**🔁 Next: {`om-auto-fix-issue` merges now (automerge force) | `om-auto-merge-buddy` re-verifies the signals on its next visit}; no human action needed.**

🔍 Review: {✅ passed | 📋 pending} · 🧪 QA: {✅ passed | not required | 📋 pending} · 🧪 CI: {✅ local mirror passed | 📋 pending}

```text
base: <baseRefName>
riskChecks: enforced
ciPolicy: strict
ciTarget: none
head: <sha>
cr: <pass|missing> <sha> <review url>
qa: <pass|n/a|missing|waiting-human> <sha> <qa report url>
ci: missing <sha> <checks url>
localCi: <pass|missing> <sha> <local-run comment url>
attempts: cr=0 qa=0 ci=0
```

🏷️ **Signal evidence**
- ✅|📋 `automerge-signal-1-cr` — {Approved by a fresh `om-auto-review-pr` pass on <sha> ([review](url)) | missing: why}.
- ✅|📋 `automerge-signal-2-qa` — {QA passed on <sha> in a fresh `om-auto-qa-pr` pass ([report](url)) | QA not required (`skip-qa`) | missing: why}.
- ✅|📋 `automerge-signal-3-passes-local-ci-checks` — {All N local CI commands passed on <sha>; a failed host check still blocks the merge | missing: why}.
~~~

`attempts` stays `0` because these are the buddy's own counters. `ci:` stays
`missing`, because this run never read host CI. On the `localCi:` line, link the
run-summary or status comment that lists the local commands and their exit codes.

## A5. Release and report

With automerge force, run A6 first, then this step.

Release the PR lock: step 12 does it on the bug route; on the feature route, remove
`in-progress` via **unlabel-pr** and post
`` 🤖 `om-auto-fix-issue` run complete: automerge {armed|declined}. Lock released. ``
before the step-3.4 report. Swap in nothing, because no CI follow-up is owed. Add
one line to the final report:

- all three signals held → `🚀 Automerge: armed — all three signals on <short sha> ({source}).`;
- some signals missing → `Automerge: armed, missing {signals} — {reason}.`;
- A6 merged → `🚀 Automerge: merged <merge sha> (automerge force, {source}).`;
- A6 refused → `Automerge: armed; direct merge refused — {host reason}.`

Never claim a merge that did not happen, and never claim that host CI is green.

## A6. Direct merge (automerge force only)

Run this step only when `AUTOMERGE_FORCE=true` and A4 armed the PR with all three
signals (`1-cr`, `2-qa`, `3-passes-local-ci-checks`) on the final head. Otherwise
skip it and leave the PR armed for the buddy.

1. **Re-read fresh state** via **get-pr** and **get-pr-checks**. Do not merge, and
   leave the PR armed, when any of these holds:
   - the head moved;
   - a hold label is present (`do-not-merge`, `blocked`, `qa-failed`,
     `automerge-blocked`, `automerge-prepare`);
   - the head is conflicting;
   - any host check completed `FAILURE` / `ERROR` / `CANCELLED` / `TIMED_OUT`;
   - QA recorded `waiting-human` (protected areas).
   Pending or missing host checks do not stop the merge. That is the point of this
   mode.
2. **Merge** with **merge-pr**: squash, with the head-SHA guard on the final head.
   When branch protection refuses only because host checks are still pending, use
   the descriptor's guarded bypass variant once. Never retry any other way. A
   refusal (no bypass right, moved head, any other reason) leaves the PR armed for
   the buddy. Record the host's reason in the status comment.
3. **After a merge,** rewrite the status comment's first line to
   ``🚀 What happened: merged <merge sha> by `om-auto-fix-issue` (automerge force) on
   <head sha>``, and release the PR lock as in A5. The PR's `Fixes #{issueId}` lets
   the tracker close the issue.

Automerge force skips only the wait. It never skips the three signals, a human
hold, a protected-area human-QA gate, or a failed host check.
