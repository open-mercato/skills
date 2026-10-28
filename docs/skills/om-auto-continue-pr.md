# om-auto-continue-pr

> 🤖 Autonomous — runs end-to-end without supervision

Resume a PR that is not finished. Given a PR number, the skill claims the PR (respecting concurrency locks), checks the branch out into an isolated worktree, locates the linked execution plan via the PR body's `Tracking plan:` line, and picks up from the first unchecked step in the plan's Progress checklist. It then drives the PR to `complete` status under the same phase-by-phase implementation, validation gate, self-review, and label rules as the creator skill — updating the existing PR rather than opening a duplicate.

The PR does not have to come from this pipeline. When it carries no execution plan — a human's PR, one opened by another tool, or a run that crashed before committing its plan — the skill **adopts** it instead of giving up: it reconstructs the goal from the PR description and its task lists, the conversation and unresolved review feedback, failing checks, linked issues, matching specs or design docs, and the code already landed; writes that out as a real execution plan with the canonical Progress checklist; commits it on the PR branch; adds the `Tracking plan:` / `Status:` lines to the PR body (leaving the author's own description untouched); and posts a `📋 adoption plan` comment explaining the goal it inferred, the evidence behind it, and the assumptions it invites you to correct. With a user in the loop it stops there for confirmation; unattended it documents the plan and executes it. Every later resume then finds the plan through the ordinary path.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{prNumber}` | Yes | The PR number to resume, e.g. `1492`. |
| `--force` | Optional | Bypass the in-progress concurrency check to take over a PR another auto-skill or human already claimed. |
| `--from <phase.step>` | Optional | Override the resume point (e.g. `2.1`). Only honored when the Progress section cannot be parsed unambiguously. |
| `--adopt <ask\|auto\|off>` | Optional | How to handle a PR with no usable plan. `ask` lands the reconstructed plan and stops for your confirmation; `auto` lands it, documents it on the PR, and implements it; `off` restores the old behavior of reporting the missing plan and stopping. Defaults to `auto` for unattended runs (chain step, schedule, CI) and `ask` when a user is in the loop. |
| `--goal "<text>"` | Optional | State the goal to reconstruct against, for a PR whose description does not. Treated as the highest-confidence evidence; it narrows the reconstruction rather than authorizing work the PR does not support. |

## Works with

Consumes a `{prNumber}`, reads the `Tracking plan:` line written by [om-auto-create-pr](om-auto-create-pr.md) — or writes that plan itself when the PR has none — and ends by emitting the `PR:` / `Issue:` chaining reference lines for the next skill in a chain. Adoption is what makes it a valid resume target for chains that hand over an arbitrary PR: [om-auto-fix-issue](om-auto-fix-issue.md) when an open PR already references the issue, and [om-auto-implement-spec](om-auto-implement-spec.md) when an implementation PR already exists. It invokes the companion skills [om-open-pr](om-open-pr.md) (push + label normalization), [om-code-review](om-code-review.md) (breaking-change self-review), [om-auto-review-pr](om-auto-review-pr.md) (the autofix second pass), and [om-auto-continue-pr-loop](om-auto-continue-pr-loop.md) (hand-off when an adopted plan is too long for the plain engine), each with inline fallbacks.

---
*Source: [`skills/om-auto-continue-pr/SKILL.md`](../../skills/om-auto-continue-pr/SKILL.md)*
