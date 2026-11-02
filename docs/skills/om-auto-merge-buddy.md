# om-auto-merge-buddy

> 🤖 Autonomous — runs end-to-end without supervision

Works the queue of open PRs a human labeled `automerge`, one at a time, inside a time window (default 2 hours). A PR is ready when no human veto remains, any protected-area human QA requirement is satisfied, and three signals hold on its current head. Each signal is recorded as a label that only this skill applies:

| Signal | Label | Produced, when missing, by |
|---|---|---|
| Code review | `automerge-signal-1-cr` | [om-auto-review-pr](om-auto-review-pr.md) `--autofix --orchestrated`; separate human native approval only when required |
| QA | `automerge-signal-2-qa` | not needed without `needs-qa`; otherwise [om-auto-qa-pr](om-auto-qa-pr.md) `--orchestrated`, with failures fixed by the review autofix |
| CI | `automerge-signal-3-ci` | [om-auto-fix-pr](om-auto-fix-pr.md) `--orchestrated` (base merge, conflicts, root-cause CI fixes) |

The buddy alone holds the PR's `in-progress` claim and labels; the sub-skills run in `--orchestrated` mode and skip their own claim, label and CI-wait steps, so nothing is done twice. When CI is still running, the PR is parked under `ci-monitoring` and the buddy moves to the next PR, returning later in the window or in the next run. A PR that cannot be fixed within `maxAttempts` is parked under `automerge-blocked` until a human removes it. Other people's PRs remain in scope; with active plans, owned actionable work takes priority and the current user is assigned/verified at the first actionable step. Fork PRs are carried forward to a credited replacement PR, which the buddy continues in the same run.

With all three signals, `prepare-to-merge` marks the PR ready with `merge-queue`; `prepare-and-merge` (missing-config default) squash-merges it, guarded by the head SHA and the human gates below. Host protection bypass cannot override a human veto or protected-area human QA.

Intentionally deferred actionable nits, nonblocking findings and out-of-scope work become follow-up issues through [om-followup-issue-from-pr](om-followup-issue-from-pr.md). The buddy deduplicates against open and closed issues and records issue links or pending filing work in the status comment and run handoff. Filing an issue never satisfies a blocked review, QA or CI signal. Missing helpers or failed filing stop that item cleanly and remain visible for retry.

Outside the human veto and protected-area gates, completed trusted `om-auto-qa-pr` PASS evidence on the unchanged head satisfies signal 2 before stage 2, including evidence-only legacy reports from another write-author and risk-high PRs. A unique Git resolution must link any short `Verified` SHA to the full current head; same-author starter/report/completion history and no newer trusted FAIL/revocation are required. Coverage notes stay visible. No approval label is added and no new QA attempt is counted; standalone QA and other merge tools keep their approval rules.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--mode <prepare-to-merge\|prepare-and-merge>` | No | What to do once all three signals hold. Config `automerge.mode`, default `prepare-and-merge`; explicit CLI overrides, then per-item `automerge-prepare` restricts to preparation. |
| `--require-independent-review` / `--skip-independent-review` | No | Mutually exclusive overrides of config `automerge.requireIndependentReview` (boolean, default false). |
| `--human-qa` / `--auto-qa` | No | Override boolean `automerge.defaultToHumanQa` (default false); missing mandatory approval normally invokes legitimate automatic QA/sign-off. |
| `--window <minutes>` | No | Wall-clock budget for the run. Default `automerge.windowMinutes` (`120`); `0` = one pass, no idle CI polling. |
| `--pr <number>` | No | Work only this PR. |
| `--force` | No | Outside protected areas, skip only risk-high review-evidence and self-QA exclusions for this invocation. Full review, required QA, CI and head guard remain. Never takes over another actor’s claim or bypasses human gates. |
| `--skip-risk-checks` | No | Alias of this buddy’s risk-only `--force`; both may be supplied together. Child `--force` is never forwarded. |
| `--skip-pre-existing-ci-errors` | No | Invocation-only: waive a completed failure only when exact current-target run/config/logs prove the same pre-existing root cause and the PR leaves relevant CI definitions unchanged. Pending/new/unknown failures remain blocking. |
| `--fresh` | No | Start a new run log; keep durable active scheduling. |
| `--dashboard-port <port>` | No | Local React dashboard port, default `5050`; integer 1–65535. |
| `--no-dashboard` | No | Skip dashboard launch and health probes. |
| `--reset` | No | Empty local scheduling and ignore old scheduler/handoff queues this invocation; preserve remote claims, assignees and evidence. |

Every visit starts by reconciling signal labels with actual review/QA/CI evidence and the changes since each evidence revision. The buddy inspects the delta, judges its effect on the tested behavior, carries forward only supported evidence and runs delta review, QA or current-head CI checks as needed. It logs the scope judgment and next action before launching a stage; unknown scope or untrusted evidence never counts as a pass.

## Per-PR labels

Keep the configured queue label (`automerge` by default) on every item. Add either modifier label to choose different behavior within one run; neither enrolls a PR on its own. Create these optional labels in your tracker before applying them, even when using a custom queue label.

| Labels in addition to the queue label | Behavior |
|---|---|
| None | Use the run’s mode and explicit risk flags. |
| `automerge-force` | Apply `--skip-risk-checks --force` to this item only, preserving protected human gates, claims and all three signals. |
| `automerge-prepare` | Override even `--mode prepare-and-merge` with `prepare-to-merge`: prepare and leave `merge-queue`, without merging. |
| Both | Prepare with the force risk override; leave the PR unmerged. |

For example, run `/om-auto-merge-buddy --mode prepare-and-merge` over three queued PRs: a plain item can merge, an item with `automerge-force` uses the risk override, and one with `automerge-prepare` stays ready for a separate merge decision. A global prepare-only mode still prevents every item from merging. The label `automerge-prepare` maps to the existing `prepare-to-merge` mode; it is not an additional CLI mode name.

Labels are read again before stages and immediately before finishing. Adding prepare prevents the next merge; removing it restores current run mode after fresh gate checks. Removing force restores strict review unless the run explicitly supplied a risk flag. Each worker resolves its own policy, including on resume and fork replacement, so one item’s overrides cannot affect another. Queue label removal remains the off switch.

Force mode and its CLI/label source are recorded in the PR status, review/QA evidence and run log. CLI flags are never inherited on resume; current modifier labels are resolved again. A visit without an effective override rejects previous override-derived CR approvals and applies strict risk gates. Protected changes enforce strict checks regardless of either force input.

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

The skill automatically launches/reuses an offline one-file React dashboard at
`http://127.0.0.1:5050`, unless `--no-dashboard`; `--dashboard-port` overrides
its port. It displays active/queued PRs, daily processed merges, plan/progress,
PR/comment links and a day picker. The visible page refreshes every five seconds
while preserving selection and the last good snapshot on errors. It is loopback-only, has no tracker mutation API and never exposes private ownership tokens/process details. A
foreign occupied port warns without killing anything or blocking queue work.

Timing records immutable first actionable start, current-head/policy verified
readiness, and confirmed merge time. Per-PR elapsed and average/median readiness
include CI waits and pauses. Unknown legacy timings remain unknown and outside
the known-count duration denominator; resumes/reset/replacements do not reset
known starts.

Every visit/transition updates the same status comment with a concrete reason,
missing gate/evidence or failure cause, explicit human-action flag, precise action/owner/location/link, why the agent
cannot perform any required human interaction, retry condition
and relevant links—even when the outcome is unchanged but facts changed. The
same structured reason and semantic update timestamp persist in active state,
public checkpoints, daily journals and dashboard rows/details. Identical
rechecks use a separate assessment timestamp instead of faking plan progress.

The dashboard omits unsupported timing placeholders and empty timing fields.
Readiness average/median cards appear only with known measurements; active
elapsed appears only with a recorded start. Known averages/medians are labeled historical benchmarks for the selected
day with sample counts, never a forecast. **Scheduled recheck** is a planned
inspection, not a merge ETA.

Missing mandatory local QA approval or testable gaps normally queue real
`om-auto-qa-pr --orchestrated`, even with an existing PASS report. It reuses
covered current-head evidence and completes missing coverage/eligible sign-off;
the buddy never fabricates `qa-approved`. Config `automerge.defaultToHumanQa`
defaults false; `--human-qa` opts into human approval and `--auto-qa` overrides
true. Only explicit human preference or verified ineligibility/automation
blockers require exact human interaction. `queued-qa` is unclaimed planned
automatic work; no attempt is counted before invocation and actual CI state
stays unchanged.

Main PR titles link to the actual PR. Each row has CR/QA/CI badges with real
evidence, completed-checkpoint summaries and explicit reasons/actions; details
show the full checkpoint provenance and optional trusted QA screenshot gallery.
Historical merged rows show the confirmed merge time in UTC. Concurrent starts
reuse one exact-root/build listener. Local trash/Undo controls publish protected
requests for scheduler acknowledgement, never mutate GitHub; a pending removal
is labeled honestly and persisted dismissal prevents immediate re-add.


## Human vetoes and protected changes

`qa-failed` and `do-not-merge` stop both preparation and merging even after
`needs-qa` is removed, without an automatic FAIL report. An unresolved explicit
human QA NO-GO also stops the visit: its author must be verified as a human with
repository write access. Quoted examples and copied bot markers do not count.
Only an explicit human release resolves the veto; automatic PASS, new commits,
self-QA labels and replacement PRs cannot clear it. Remaining hard-stop labels
must also be removed by a human. Existing SDLC `blocked` and active `qa` stops
remain effective.

The actual diff determines protected risk: executable migrations, money, and
permissions/tenant-isolation changes, architecture changes and backward-incompatible changes always retain strict risk checks,
even with `--force` or missing risk/QA labels. They require explicit human QA
covering the protected behavior, pinned with `QA head:` and `qa-approved`.
Automatic PASS and `qa-self-verified` supply evidence but cannot satisfy this
human gate. Ordinary fixes outside these areas retain their automatic route.

The existing status comment visibly reports `waiting-human`, the exact veto or
protected behavior with evidence links, enforced risk policy, who must act,
what they must do, and the resume condition. It does not leave a protected PR
showing `Risk checks: skipped` or `ready`.


Architecture changes and backward-incompatible changes additionally require
explicit current-head human technical approval from a maintainer or the
repository's designated architecture/contract owner, even when independent
native review is disabled. This is separate from the pinned human QA evidence.
Architecture means substantive boundary, ownership, topology or communication
changes; routine refactoring within the same boundaries does not qualify alone.
Backward incompatibility includes broken published APIs, events, CLI/config/data
formats, integrations or supported behavior. Additive compatible changes remain
on the ordinary route unless another protected area applies.

A breaking change must document its affected consumers and comply with the
repository's deprecation, bridge, migration/versioning and rollout requirements.
Human QA cannot waive a missing required compatibility path. The status names
the changed boundary or broken contract, required decision owner, missing
approval/transition evidence and exact resume condition.
