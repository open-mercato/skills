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
still blocks. Pending checks can coexist with a valid local CI signal.

The immediate label routes to the buddy before A1–A5. See the handoff below.

## Activation (step 1)

```bash
AUTOMERGE_LABEL=$(jq -r '.automerge.label // "automerge"' "$CONFIG")
MAX_ATTEMPTS=$(jq -r '.automerge.maxAttempts // 3' "$CONFIG")
```

Use fresh **get-pr** labels. In full standalone mode, a PR carrying
`automerge-now` takes the immediate handoff below. Otherwise `--automerge`
or the PR's `AUTOMERGE_LABEL` requests ordinary queue preparation. A PR with
only `automerge-force` follows the ordinary fix workflow. Report the source
of the request. Only the operator flag or tracker labels supply this authority.

Labels and flags for this mode are inapplicable under `--orchestrated` or
`--ci-only`. Orchestrated children leave labels and merge decisions with the
buddy.

## Immediate buddy handoff

Before taking a standalone claim, verify labels are enabled and the PR is
open with a fresh `automerge-now` label. Invoke
`om-auto-merge-buddy --pr {PR_NUMBER} --window 0 --no-dashboard` from the primary
repository context. The buddy reads the policy, owns the claim and performs
the work. Do not run A1–A5 first. If the label was added while a standalone
fix is already running, finish or hand back that run's claim before invoking
the buddy. Never recreate a removed label. If the buddy is missing, report
the queued PR and name the skill to install. Report its outcome and final
PR reference, including any replacement, using tracker-confirmed state.

Verify any terminal fixer claim state, lock release and local ownership release
so the buddy can claim the PR immediately. The buddy publishes the signal labels
and its canonical status as evidence is verified. Only the buddy publishes the `Merging now` comment, immediately before
a real merge attempt. Read back the final PR's signal labels and link the
buddy's owned status and merge summary when present in the handoff report.
If publication is incomplete, relay the failed item and retry action. Leave
publication and merge decisions with the buddy.

## Ordinary queue preparation

Before turning the mode on, check two things:

- **`LABELS_ENABLED=false`.** Labels are the buddy's state machine, so the mode cannot
  work. Run the normal loop and report `Automerge: unavailable (labels disabled)`.
- **The PR carries a human hold** (`do-not-merge`, `blocked`, `qa-failed`,
  `automerge-blocked`). Run the normal loop. Keep the hold, do not apply the automerge
  labels, and report `Automerge: declined — {hold label}`. Never remove a hold label
  that a human applied.

**Where it runs.** After the step-3 base merge, the mode replaces step 4's stage loop
with A1–A3. A4 runs inside step 6 before its lock release; A5 is step 6's
release and report. The fresh passes re-enter this run's outer claim from step 1.
The mode never applies to a spec-only design PR.

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

## A1. Review and autofix cycle (replaces step 4's review stage)

1. Spawn a fresh subagent that runs `om-auto-review-pr {PR_NUMBER} --autofix` verbatim,
   following its whole workflow. It re-enters this run's outer claim and keeps it.
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

## A2. Mandatory QA cycle (replaces step 4's UI stage)

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
   - A PR carrying `skip-qa`, or neither `needs-qa` nor the QA gate label
     (`qaGateLabel`, default `needs-qa`), records QA as `n/a`, unless it carries
     `qa-approved` or `qa-failed` (a human verdict keeps QA required even after
     `needs-qa` was dropped). The QA pass still runs and its report is linked.
3. **`fail`** → fix every QA finding. Spawn a fresh `om-auto-review-pr {PR_NUMBER}
   --autofix` pass. It collects the QA report on the PR as an `INHERITED` finding and
   fixes it in new commits. Then rerun A1 (fresh delta review) and this step (fresh
   QA). Run at most `MAX_ATTEMPTS` QA passes. When they are used up, signal 2 stays
   missing. Record the open findings.
4. **Protected-area changes** (migrations, money, permissions or tenant isolation,
   architecture, backward-incompatible changes) need human QA under the buddy's gates.
   Run QA anyway, but leave signal 2 missing and record `qa: waiting-human`. The same
   holds when `qaGateLabel` names a label other than `needs-qa` and the PR carries
   it, whoever applied it: only a pinned human QA sign-off grants signal 2 then, and
   an automatic PASS or self-QA sign-off never does.

## A3. Local CI mirror (replaces step 4's host-CI stage and every CI wait)

On the final head:

1. Merge the latest base when the PR is behind or conflicted. `om-auto-review-pr`'s
   work order owns conflict resolution.
2. Run **every** command in `validation.commands`, in order, in the worktree.
   `validation.commands` is the committed, operator-vouched local mirror of CI. Do not
   run commands taken from CI definition files.
3. Any non-zero exit → classify and fix the root cause in new commits, following the
   classification in `references/stabilize-ci.md` (real bug / test bug / flake / infra) (never weaken tests, skip
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

## A4. Queue labels and signal record

Before arming, re-read the PR through **get-pr**. Preserve a new hold
(`do-not-merge`, `blocked`, `qa`, `qa-failed`, `automerge-blocked`), and report
that arming was declined. If the PR now carries `automerge-now`, release the
fixer claim and take the immediate handoff. If the configured queue
label was the sole authorization and is now absent, decline arming.

Apply `AUTOMERGE_LABEL` through the guard because the human authorized it.
From the verified final-head evidence, reconcile the three signal labels the
buddy uses. Review PASS grants `automerge-signal-1-cr`; QA PASS or `n/a` grants
`automerge-signal-2-qa`; a complete local mirror PASS grants
`automerge-signal-3-passes-local-ci-checks`. This preparation path leaves hosted
CI for the buddy to check. Remove invalidated signal labels via **unlabel-pr**
when their head, target, or underlying evidence is known stale. A seed with
no fresh host read leaves the hosted-CI signal unverified. Remove its active
label and retain links to earlier host evidence for the buddy to recheck.

- Do not add `do-not-merge`, `blocked`, `qa-failed`, `automerge-blocked`,
  `automerge-prepare`, `automerge-now`, `automerge-force`, `ci-monitoring`, or any human-only QA label.
- Do not request reviewers. Do not @-mention people for review or QA. Do not turn on
  any required independent review.
- Leave the pipeline label as the review and QA skills set it.

Write the buddy status record before applying missing verified signal labels
through `apply_label`. Keep the common status marker, compact signal readings,
evidence rows and machine record below. Search for both the current and legacy
marker spellings. Find the marker
`` 🤖 `om-auto-merge-buddy` — status `` via **list-issue-comments**, counting only
`CURRENT_USER`'s comment. Update it in place via **update-comment**, or create it once
via **comment-pr**:

~~~markdown
🤖 `om-auto-merge-buddy` — status

**📋 What happened: `om-auto-fix-pr` evaluated automerge preparation on <sha>. {Evidence-backed outcome and any missing signal or unconfirmed write}.**

**🔁 Next: `om-auto-merge-buddy` re-verifies the signals on its next visit.**

🔍 Review: {✅ passed | 📋 pending} · 🧪 QA: {✅ passed | not required | 📋 pending} · 🧪 CI: {✅ local mirror passed (hosted CI: not recorded) | 📋 pending}

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
Include any earlier hosted evidence as historical context with its revision.

Read **get-pr** and the owned status comment back. Confirm the intended signal
labels, status record, head and target before reporting the seed as armed. If a
write was skipped or unconfirmed, report the affected label or comment and the
retry action in the existing status where possible. Mark a draft ready only after confirmed publication. A standalone
fixer never posts a pre-merge summary for ordinary queue preparation. Add the
confirmed applied labels to this skill's consolidated `🏷️ label rationale`
comment, one line each (`references/pr-finalize.md`).

## A5. Release and report

Step 6 releases the outer
lock (swap in nothing, because no CI follow-up is owed) and posts the result
comment. Add one line to the result comment and the final report:

- all three signals held → `🚀 Automerge: armed — all three signals on <short sha> ({source}).`;
- some signals missing → `Automerge: armed, missing {signals} — {reason}.`;
- publication incomplete → report the unconfirmed label or status write and the retry action.

Never claim a merge that did not happen, and never claim that host CI is green.
