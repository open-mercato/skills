# om-auto-merge-buddy

> 🤖 Autonomous — runs end-to-end without supervision

Works the queue of open PRs a human labeled `automerge`, one at a time, inside a time window (default 2 hours). A PR is ready when three signals hold on its current head. Each signal is recorded as a label that only this skill applies:

| Signal | Label | Produced, when missing, by |
|---|---|---|
| Code review | `automerge-signal-1-cr` | [om-auto-review-pr](om-auto-review-pr.md) `--autofix --orchestrated`; separate human native approval only when required |
| QA | `automerge-signal-2-qa` | not needed without `needs-qa`; otherwise [om-auto-qa-pr](om-auto-qa-pr.md) `--orchestrated`, with failures fixed by the review autofix |
| CI | `automerge-signal-3-ci` | [om-auto-fix-pr](om-auto-fix-pr.md) `--orchestrated` (base merge, conflicts, root-cause CI fixes) |

The buddy alone holds the PR's `in-progress` claim and labels; the sub-skills run in `--orchestrated` mode and skip their own claim, label and CI-wait steps, so nothing is done twice. When CI is still running, the PR is parked under `ci-monitoring` and the buddy moves to the next PR, returning later in the window or in the next run. A PR that cannot be fixed within `maxAttempts` is parked under `automerge-blocked` until a human removes it. Other people's PRs remain in scope; with active plans, owned actionable work takes priority and the current user is assigned/verified at the first actionable step. Fork PRs are carried forward to a credited replacement PR, which the buddy continues in the same run.

With all three signals, `prepare-to-merge` marks the PR ready with `merge-queue`; `prepare-and-merge` (missing-config default) squash-merges it, guarded by the head SHA and bypassing other labels and host merge rules — the three signals are the gate.

Intentionally deferred actionable nits, nonblocking findings and out-of-scope work become follow-up issues through [om-followup-issue-from-pr](om-followup-issue-from-pr.md). The buddy deduplicates against open and closed issues and records issue links or pending filing work in the status comment and run handoff. Filing an issue never satisfies a blocked review, QA or CI signal. Missing helpers or failed filing stop that item cleanly and remain visible for retry.

Completed trusted `om-auto-qa-pr` PASS evidence on the unchanged head satisfies signal 2 before stage 2, including evidence-only legacy reports from another write-author and risk-high PRs. A unique Git resolution must link any short `Verified` SHA to the full current head; same-author starter/report/completion history and no newer trusted FAIL/revocation are required. Coverage notes stay visible. No approval label is added and no new QA attempt is counted; standalone QA and other merge tools keep their approval rules.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--mode <prepare-to-merge\|prepare-and-merge>` | No | What to do once all three signals hold. Config `automerge.mode`, default `prepare-and-merge`; explicit CLI overrides. |
| `--require-independent-review` / `--skip-independent-review` | No | Mutually exclusive overrides of config `automerge.requireIndependentReview` (boolean, default false). |
| `--window <minutes>` | No | Wall-clock budget for the run. Default `automerge.windowMinutes` (`120`); `0` = one pass, no idle CI polling. |
| `--pr <number>` | No | Work only this PR. |
| `--force` | No | Skip only risk-high review-evidence and self-QA exclusions for this invocation. Full review, required QA, CI and head guard remain. Never takes over another actor’s claim. |
| `--skip-pre-existing-ci-errors` | No | Invocation-only: waive a completed failure only when exact current-target run/config/logs prove the same pre-existing root cause and the PR leaves relevant CI definitions unchanged. Pending/new/unknown failures remain blocking. |
| `--fresh` | No | Start a new run log; keep durable active scheduling. |
| `--reset` | No | Empty local scheduling and ignore old scheduler/handoff queues this invocation; preserve remote claims, assignees and evidence. |

Every visit starts by reconciling signal labels with actual review/QA/CI evidence and the changes since each evidence revision. The buddy inspects the delta, judges its effect on the tested behavior, carries forward only supported evidence and runs delta review, QA or current-head CI checks as needed. It logs the scope judgment and next action before launching a stage; unknown scope or untrusted evidence never counts as a pass.

Force mode is recorded in the PR status, review/QA evidence and run log. It is never inherited on resume: run again with `--force` to keep the waiver active. A normal run rejects previous override-derived approvals and applies the strict risk gates.

The CI baseline opt-in is independent of force. Every waiver records both check/run URLs, head and current target SHA, matching failure signature/root cause and unchanged CI-definition proof. A target advance or rerun invalidates that proof; subsequent runs without the flag apply strict CI and reject cached waived records. Waived failing checks remain visibly red in the report; they are never called green.

## Run log and resume

Each run writes a local folder, `<paths.runs>/merge-buddy/<date>-<time>-<run id>/`: `RUN.md` lists every executed step with its UTC time, `HANDOFF.md` names the PR and stage in flight, the remaining queue and the next action, and `NOTIFY.md` logs start, resume, blockers and decisions. When the window closes, the run writes a final handoff with the remaining queue and the next action, so the next run continues where it stopped. A run that dies leaves its handoff open, and the next run resumes it: recover its in-flight plan and schedule only currently due/actionable work, rechecking its owner, current head and evidence. The shared scheduler’s due/owned priority overrides stale handoff order. The folder is never committed; ignore it in version control, and persist it between CI jobs if you want resume across scheduled runs.

## Works with

Reads the tracker's `automerge` queue and configuration from `.ai/agentic.config.json` (`automerge.label`, `mode`, `requireIndependentReview`, `windowMinutes`, `maxAttempts`). Invokes [om-auto-review-pr](om-auto-review-pr.md), [om-auto-qa-pr](om-auto-qa-pr.md) and [om-auto-fix-pr](om-auto-fix-pr.md) with `--orchestrated`, each in a fresh subagent. Emits one `PR:` reference line per PR it touched. The read-only counterpart is [om-merge-buddy](om-merge-buddy.md).

---
*Source: [`skills/om-auto-merge-buddy/SKILL.md`](../../skills/om-auto-merge-buddy/SKILL.md)*

The primary working tree's local `.ai/meta/merge-buddy.json` retains active PRs,
plan/progress, semantic `updatedAt` and UTC `nextCheckAt` across linked worktrees.
A shared OS lock and atomic writes protect concurrent instances. Due tracked
work resumes first; with active records, the current user's assigned actionable
PRs precede new global work. Future CI checks never block new admission. Empty
or reset scheduling uses the existing queue order. The first actionable step
assigns the current user and verifies it. Plan checkpoints update the same
status comment, including recovery after missing/corrupt local state.

Automatic code review/autofix remains required. Independent native review is
skipped by default, even when the author can only post an approving comment
review or the host still shows old requested changes whose objections were
resolved. Set `automerge.requireIndependentReview: true` or pass
`--require-independent-review` for fresh independent native approval before
either mode finishes; `--skip-independent-review` overrides true for a run.
A native-only wait never repeats review stages/attempts. Mode/policy are resolved
from current config then explicit CLI, audited and rechecked at entrance/final
guard; stale scheduler/status values never override them.

Confirmed merges, including external merges, retain one latest JSON record per
PR in `.ai/meta/merge-buddy-merged-YYYY-MM-DD.jsonl`, keyed by repository/number
and dated by the tracker's mergedAt UTC day. Records include head/merge SHA,
target, final plan/progress and evidence/status links. Locked atomic upserts
replace retry/status duplicates and preserve other PRs; malformed/write failure
keeps cleanup pending instead of dropping tracking. No unmerged PRs or private
ownership tokens/process details are logged.
