# om-pr-autopilot

> 🤖 Autonomous — runs end-to-end without supervision

Takes one open pull request and works out what state it is actually in before doing anything to it: how far the tracking plan got, what the diff touches, whether a review exists and whether its conversations are resolved, whether CI is green, whether the branch still merges, which labels are missing, and whether QA evidence was ever attached. That diagnosis is matched against an ordered state matrix, which produces a chain of existing `om-*` skills — finish the implementation, drive to merge-ready, capture UI evidence, file follow-ups, merge — and the chain is executed in order, re-diagnosing between steps so a step's outcome can shorten or extend what remains. It publishes one summary comment covering every step and its outcome.

It is a dispatcher, not an engine: every fix, review, CI repair, QA capture, and merge belongs to the delegated skill, invoked verbatim. Use [om-auto-fix-pr](om-auto-fix-pr.md) or [om-auto-continue-pr](om-auto-continue-pr.md) directly when you already know which one the PR needs; use this one when you do not.

Safety properties it holds: it never merges without `--allow-merge`, never applies the QA-approval label itself, treats the QA gate as a hard merge block, never turns CI green by weakening checks, keeps spec-only design PRs design-only, and limits another author's PR to review and handoff rather than autofix.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{prNumber}` | Interactive: no · Unattended: yes | The PR to drive. Omitted in an interactive run, it lists your open PRs and drives the one you name; an unattended run with no number stops and asks for one. |
| `--dry-run` | No | Diagnose and print the plan; run no sub-skill and mutate nothing. |
| `--confirm` | No | Present the diagnosis and planned chain and wait for approval. Default is autonomous. |
| `--allow-merge` | No | Permit the chain to end in an actual merge. Off by default — the run stops at merge-ready. |
| `--force` | No | Take over an `in-progress` claim held by another actor. |
| `--max-iterations <n>` | No | Forwarded to [om-auto-fix-pr](om-auto-fix-pr.md). Default `3`. |

## Works with

Dispatches to [om-auto-continue-pr](om-auto-continue-pr.md) and [om-auto-continue-pr-loop](om-auto-continue-pr-loop.md) for unfinished plans, [om-auto-fix-pr](om-auto-fix-pr.md) for base conflicts, review, and CI, [om-auto-review-pr](om-auto-review-pr.md) for another author's PR and for spec-only design PRs, [om-auto-qa-pr](om-auto-qa-pr.md) for UI evidence, [om-followup-issue-from-pr](om-followup-issue-from-pr.md) for findings left unfixed, and [om-approve-merge-pr](om-approve-merge-pr.md) for the merge itself.

---
*Source: [`skills/om-pr-autopilot/SKILL.md`](../../skills/om-pr-autopilot/SKILL.md)*
