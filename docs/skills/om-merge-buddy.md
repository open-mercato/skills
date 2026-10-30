# om-merge-buddy

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Scans every open pull request through the configured tracker and answers one question: what can merge right now? It classifies merge readiness from labels, review decisions, CI status, and mergeability, then reports three buckets — ready to merge, almost ready, and blocked — with the blockers spelled out. By default it is strictly read-only: it never merges, edits, comments, or labels anything. Use it to triage the PR queue before deciding what to ship.

## Automerge mode

> 🤖 Autonomous in this mode — runs end-to-end without supervision, safe for schedules

Label a PR `automerge` (the name is configurable as `automerge.label` in `.ai/agentic.config.json`, set up by [om-setup-agent-pipeline](om-setup-agent-pipeline.md)) when you want it merged as soon as it is genuinely ready: CI green, review approved, every finding fixed. `om-merge-buddy --automerge` then works the labeled PRs one at a time:

1. Skips PRs another agent is working on (`in-progress` or a recent claim comment), PRs referenced by another active orchestrator task such as a cezar task, drafts, and PRs carrying `do-not-merge`, `blocked`, `qa-failed`, or `qa`.
2. Claims the PR, taking over the assignee when needed.
3. Approves CI runs the code host holds for maintainer approval — never for an outside contribution that changes CI configuration.
4. Does the least work that unblocks the merge: nothing when approved and green, CI fixes alone when only CI is red (`om-auto-fix-pr --ci-only`), a plain merge of the PR's own target branch when the PR is only behind, and the full [om-auto-fix-pr](om-auto-fix-pr.md) loop otherwise — merge the base, resolve conflicts, fix review findings with `om-auto-review-pr --autofix`, fix CI. A fork PR is carried forward to a credited replacement PR that keeps the label.
5. Waits for CI within `ci.maxWaitMinutes`; a PR still pending is parked and revisited once after the queue.
6. Calls `om-approve-merge-pr <number> --automerge` with the active claim context when every gate passes. The merge skill revalidates the label and claim, handles self-approval rejection without a new question, and merges into that PR's current target branch. Other ambiguities return needs-human.

Every PR keeps its actual target (`baseRefName`), including release and feature branches. Base updates, required-check lookups, and the final merge all use that target, even when the config defaults to another branch. Fork replacements preserve the original target; retargeting triggers fresh gate checks.

Each PR gets one status comment, updated in place, saying whether it merged, is waiting on CI, or needs a human — and for what. The label never waives a gate: a `needs-qa` PR still waits for QA sign-off, and automation never applies `qa-approved`. Remove the label to stop automerge on a PR.

## Parameters

- `--automerge` — drive the labeled PRs to merge instead of reporting.
- `--pr <number>` — with `--automerge`, work only that PR.

## Works with

In report mode it reads open PRs and their check status through the tracker and produces a classified report only. When you pick a PR to ship, it hands off to [om-approve-merge-pr](om-approve-merge-pr.md), which re-checks the same gates before actually merging. In automerge mode it orchestrates [om-auto-fix-pr](om-auto-fix-pr.md) (which runs [om-auto-review-pr](om-auto-review-pr.md)) and [om-approve-merge-pr](om-approve-merge-pr.md), and ends with one `PR:` line per PR it merged or changed.

---
*Source: [`skills/om-merge-buddy/SKILL.md`](../../skills/om-merge-buddy/SKILL.md)*
