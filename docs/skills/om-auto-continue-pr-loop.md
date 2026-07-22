# om-auto-continue-pr-loop

> 🤖 Autonomous — runs end-to-end without supervision

The advanced counterpart to `om-auto-continue-pr`, for resuming long spec-implementation runs started by `om-auto-create-pr-loop`. Given a PR number, it claims the PR, re-enters an isolated worktree, reads `HANDOFF.md` for session context, parses the authoritative `## Tasks` table in the run folder's `PLAN.md`, and resumes from the first row whose status is not `done`. It keeps the strict discipline of the creator loop — one lean commit per Step, verification batched into `checkpoint-<N>-checks.md` every ~5 Steps (with focused integration tests and screenshots when UI was touched), the full validation gate plus the repo's integration suite and a style-compliance pass at spec completion — and preserves the run-folder and label contract. Use the plain `om-auto-continue-pr` for simple runs.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{prNumber}` | Yes | The PR number to resume, e.g. `1492`. |
| `--force` | Optional | Bypass the in-progress concurrency check to take over a PR another auto-skill or human already claimed. |
| `--from <phase.step>` | Optional | Override the resume point (e.g. `2.1`). Only honored when the `## Tasks` table (and any legacy `## Progress` fallback) cannot be parsed unambiguously. |

## Works with

Consumes a `{prNumber}`, reads the `Tracking plan:` / `Tracking run folder:` line written by [om-auto-create-pr-loop](om-auto-create-pr-loop.md), and ends by emitting the `PR:` / `Issue:` chaining reference lines for the next skill in a chain. It invokes the companion skills [om-open-pr](om-open-pr.md) (push + label normalization), [om-code-review](om-code-review.md) (compatibility self-review), [om-auto-review-pr](om-auto-review-pr.md) (the autofix second pass), and [om-integration-tests](om-integration-tests.md) (checkpoint + final-gate suites).

---
*Source: [`skills/om-auto-continue-pr-loop/SKILL.md`](../../skills/om-auto-continue-pr-loop/SKILL.md)*
