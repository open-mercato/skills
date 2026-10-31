# om-auto-merge-buddy

> 🤖 Autonomous — runs end-to-end without supervision

Works the queue of open PRs a human labeled `automerge`, one at a time, inside a time window (default 2 hours). A PR is ready when three signals hold on its current head. Each signal is recorded as a label that only this skill applies:

| Signal | Label | Produced, when missing, by |
|---|---|---|
| Code review | `automerge-signal-1-cr` | [om-auto-review-pr](om-auto-review-pr.md) `--autofix --orchestrated`, or a human approval |
| QA | `automerge-signal-2-qa` | not needed without `needs-qa`; otherwise [om-auto-qa-pr](om-auto-qa-pr.md) `--orchestrated`, with failures fixed by the review autofix |
| CI | `automerge-signal-3-ci` | [om-auto-fix-pr](om-auto-fix-pr.md) `--orchestrated` (base merge, conflicts, root-cause CI fixes) |

The buddy alone holds the PR's `in-progress` claim and labels; the sub-skills run in `--orchestrated` mode and skip their own claim, label and CI-wait steps, so nothing is done twice. When CI is still running, the PR is parked under `ci-monitoring` and the buddy moves to the next PR, returning later in the window or in the next run. A PR that cannot be fixed within `maxAttempts` is parked under `automerge-blocked` until a human removes it. Assignees are ignored, so other people's PRs are in scope; fork PRs are carried forward to a credited replacement PR, which the buddy continues in the same run.

With all three signals, `prepare-to-merge` (default) marks the PR ready with `merge-queue`; `prepare-and-merge` squash-merges it, guarded by the head SHA and bypassing other labels and host merge rules — the three signals are the gate.

Intentionally deferred actionable nits, nonblocking findings and out-of-scope work become follow-up issues through [om-followup-issue-from-pr](om-followup-issue-from-pr.md). The buddy deduplicates against open and closed issues and records issue links or pending filing work in the status comment and run handoff. Filing an issue never satisfies a blocked review, QA or CI signal. Missing helpers or failed filing stop that item cleanly and remain visible for retry.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--mode <prepare-to-merge\|prepare-and-merge>` | No | What to do once all three signals hold. Default `automerge.mode` (`prepare-to-merge`). |
| `--window <minutes>` | No | Wall-clock budget for the run. Default `automerge.windowMinutes` (`120`); `0` = one pass, no idle CI polling. |
| `--pr <number>` | No | Work only this PR. |
| `--fresh` | No | Start a new run log instead of resuming a dead run's open handoff. |

## Run log and resume

Each run writes a local folder, `<paths.runs>/merge-buddy/<date>-<time>-<run id>/`: `RUN.md` lists every executed step with its UTC time, `HANDOFF.md` names the PR and stage in flight, the remaining queue and the next action, and `NOTIFY.md` logs start, resume, blockers and decisions. When the window closes, the run writes a final handoff with the remaining queue and the next action, so the next run continues where it stopped. A run that dies leaves its handoff open, and the next run resumes it: the PR in flight first (re-checked against its current head), then the rest of the queue. The folder is never committed; ignore it in version control, and persist it between CI jobs if you want resume across scheduled runs.

## Works with

Reads the tracker's `automerge` queue and configuration from `.ai/agentic.config.json` (`automerge.label`, `mode`, `windowMinutes`, `maxAttempts`). Invokes [om-auto-review-pr](om-auto-review-pr.md), [om-auto-qa-pr](om-auto-qa-pr.md) and [om-auto-fix-pr](om-auto-fix-pr.md) with `--orchestrated`, each in a fresh subagent. Emits one `PR:` reference line per PR it touched. The read-only counterpart is [om-merge-buddy](om-merge-buddy.md).

---
*Source: [`skills/om-auto-merge-buddy/SKILL.md`](../../skills/om-auto-merge-buddy/SKILL.md)*
