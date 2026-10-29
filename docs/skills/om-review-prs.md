# om-review-prs

> 🔍 Runs the requested review queue autonomously and reports the outcomes.

A day-start review queue that sweeps every currently unreviewed open pull request and reviews them one at a time, newest first. It fetches open PRs, filters out drafts, already-decided, self-authored, blocked, and claimed PRs, presents the queue, then runs the full `om-auto-review-pr` workflow on each. It respects `in-progress` claim locks and never force-claims in batch mode, skipping any PR another actor owns. Use it to clear the review backlog in a single pass.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--subagents` | Optional | Opt into one fresh reviewer agent per PR, with a separate worktree for each. |
| `--parallel <N>` | Optional; requires `--subagents` | Set the maximum number of active reviewers for this invocation. Must be a positive integer. |

Without these flags, the original sequential workflow runs in the current session. Configuration alone never changes that behavior.

With `--subagents`, the concurrency limit comes from `reviewSweep.maxParallel` in `.ai/agentic.config.json` (default `1`); `--parallel N` overrides it. The effective limit also respects available agent capacity and test-resource isolation. Each PR gets a fresh context even when the limit is one. Every reviewer uses the initiating agent's exact model and thinking effort, through native inheritance or explicit spawn settings. If the harness cannot preserve both, the flagged run stops rather than silently substituting different settings. The coordinator keeps a local result ledger and links the complete per-PR reports in its summary.

Delegated sweeps honor an explicit `reviewSweep.coordinationRoot`: an absolute directory on storage supporting atomic exclusive directory creation. When absent or `null`, the skill creates a stable repository-specific directory under `${XDG_STATE_HOME:-$HOME/.local/state}/om-review-prs/` for local sweeps, without asking or editing committed configuration. The canonical PR repository URL makes local clones under the same account use the same lock, including split issue trackers; different code hosts remain distinct. Known multi-host or cross-account deployments sharing resources must configure the same physical storage. A sweep holds its lease through workers, CI monitoring, and cleanup; an overlapping sweep reports the owner and skips dispatch without requesting a takeover. The shell procedures require Bash and `jq` on macOS, Linux, or WSL.

Invocation authorizes the requested sweep. The skill uses previous answers, resolves routine setup itself, and checks actual leases, runtime evidence, and per-PR claims rather than repeatedly asking for scheduling guarantees. Concrete claim conflicts are skipped and reported. Invalid configured storage or unavailable required tooling is reported with the precise blocker; the skill does not silently bypass them. A question is reserved for information that actually blocks the task and has no safe default or workaround.

Shared test resources require concurrency one **under that shared lease**. Higher concurrency requires independent resource bindings for each worker. Each sweep snapshots the original checkout's approved configuration and review overrides; every nested review loads that snapshot, even when the PR contains different configuration. Worktrees use unique branch names, so preserving a failed worker's unpublished work does not prevent a later sweep from reviewing the PR.

```text
/om-review-prs
/om-review-prs --subagents
/om-review-prs --subagents --parallel 3
```

The first command retains the original behavior and ignores all `reviewSweep` settings. The second enables fresh reviewers using the configured limit, or one at a time when unset, with automatic local coordination setup. The third explicitly requests up to three concurrent reviewers. `--parallel` alone is rejected. If the harness cannot provide fresh agents with separate working directories and the lease, the flagged run explains the limitation before dispatch; it does not silently switch to inline reviews.

## Works with

A sweep that consumes and emits no chaining reference lines itself — each delegated review reports its own verdict and markers. It requires [om-auto-review-pr](om-auto-review-pr.md) (reused verbatim per PR; the run stops if it is missing) and optionally suggests [om-merge-buddy](om-merge-buddy.md) afterward to show what is now merge-ready.

---
*Source: [`skills/om-review-prs/SKILL.md`](../../skills/om-review-prs/SKILL.md)*
