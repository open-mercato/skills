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

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--mode <prepare-to-merge\|prepare-and-merge>` | No | What to do once all three signals hold. Default `automerge.mode` (`prepare-to-merge`). |
| `--window <minutes>` | No | Wall-clock budget for the run. Default `automerge.windowMinutes` (`120`); `0` = one pass, no idle CI polling. |
| `--pr <number>` | No | Work only this PR. |

## Works with

Reads the tracker's `automerge` queue and configuration from `.ai/agentic.config.json` (`automerge.label`, `mode`, `windowMinutes`, `maxAttempts`). Invokes [om-auto-review-pr](om-auto-review-pr.md), [om-auto-qa-pr](om-auto-qa-pr.md) and [om-auto-fix-pr](om-auto-fix-pr.md) with `--orchestrated`, each in a fresh subagent. Emits one `PR:` reference line per PR it touched. The read-only counterpart is [om-merge-buddy](om-merge-buddy.md).

---
*Source: [`skills/om-auto-merge-buddy/SKILL.md`](../../skills/om-auto-merge-buddy/SKILL.md)*
