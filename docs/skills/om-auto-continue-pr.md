# om-auto-continue-pr

> 🤖 Autonomous — runs end-to-end without supervision

Resume an `om-auto-create-pr` run that did not finish in one go. Given a PR number, the skill claims the PR (respecting concurrency locks), checks the branch out into an isolated worktree, locates the linked execution plan via the PR body's `Tracking plan:` line, and picks up from the first unchecked step in the plan's Progress checklist. It then drives the PR to `complete` status under the same phase-by-phase implementation, validation gate, self-review, and label rules as the creator skill — updating the existing PR rather than opening a duplicate.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{prNumber}` | Yes | The PR number to resume, e.g. `1492`. |
| `--force` | Optional | Bypass the in-progress concurrency check to take over a PR another auto-skill or human already claimed. |
| `--from <phase.step>` | Optional | Override the resume point (e.g. `2.1`). Only honored when the Progress section cannot be parsed unambiguously. |

## Works with

Consumes a `{prNumber}`, reads the `Tracking plan:` line written by [om-auto-create-pr](om-auto-create-pr.md), and ends by emitting `PR_URL=` / `PR_NUMBER=` markers for the next skill in a chain. It invokes the companion skills [om-open-pr](om-open-pr.md) (push + label normalization), [om-code-review](om-code-review.md) (breaking-change self-review), and [om-auto-review-pr](om-auto-review-pr.md) (the autofix second pass), each with inline fallbacks.

---
*Source: [`skills/om-auto-continue-pr/SKILL.md`](../../skills/om-auto-continue-pr/SKILL.md)*
