---
name: om-automerge-buddy-streamlined
description: Drain the automerge PR queue with up to two subagents. Fix review and QA findings, run affected checks locally, and squash-merge eligible PRs with a guarded admin merge. Record human QA blockers or hand off at the time limit. Use for "merge the automerge queue" or "przejdź kolejkę automerge".
---

# Automerge Buddy Streamlined

Process the open PR queue for the configured base branch. Each worker takes one
PR through implementation, review, QA, and local checks. Squash-merge after all
three signals pass.

## Arguments

- `--parallel <1|2>` — PR subagent count. Default `2`. Reject other values.
- `--window <minutes>` — wall-clock budget for the entire invocation. Use
  `automerge.windowMinutes` when configured, otherwise 120 minutes. Require a
  positive integer.

## Chaining

Consumes open PR numbers from the queue, or a credited replacement returned by
a companion. Invoke `om-pr-autopilot`, `om-auto-review-pr`, `om-auto-qa-pr`,
and `om-smart-test` by name, inside the PR worker. Autopilot selects
`om-auto-continue-pr` or `om-auto-continue-pr-loop` when needed. A missing
companion stops the affected work and names the skill to install or upgrade.
Only the review skill may open a carry-forward, after searching for an existing
replacement. Emit the exact `PR:` chaining line for each visited PR, followed
by its `Issue:` line when there is a subject issue.

## Workflow

**ALWAYS check first:** Apply `.ai/skills/om-automerge-buddy-streamlined/SKILL.md` when present; safety rules still win.

0. **Set up.** Start the shared clock. Load `references/agentic-setup.md` and
   `references/rules.md`. Resolve `baseBranch`, `labels.enabled`,
   `automerge.label` (default `automerge`), `automerge.windowMinutes`,
   `qaGateLabel`, `validation.commands`, and `smartTest`.
   Read `SDLC.md`. Use the tracker operations in `references/worker.md`.
   Require enabled labels and a verified tracker identity.
1. **Find and assign the work.** Read all pages of open PRs against the resolved
   base. Queue every PR carrying the queue label without `automerge-blocked`.
   Deduplicate by number. Run one subagent per PR, with at most `--parallel`
   active workers and a distinct worktree and test environment per worker.
   Keep a reservation for each active number, including any replacement.
   If subagents are unavailable, report the queue and the capability blocker.
2. **Claim and run Autopilot.** Have the worker refresh eligibility and acquire
   the outer claim using `references/claim-pr.md`, with `--force` and a takeover
   comment where applicable. Run `om-pr-autopilot {prNumber} --force --local-checks`
   under that claim. Resume the tracked implementation if needed and accept
   a credited replacement per `references/worker.md`.
3. **Earn review, QA, and CI signals.** Run the loop in `references/worker.md`.
   Fix and re-review concrete failures, re-run QA and local checks as needed,
   and publish each signal with evidence for the current head and base.
   When `needs-human-qa` (or the configured narrower QA gate) is still present,
   ordinary PRs need a current `qa-approved` or `qa-human-approved` verdict.
   The combination of the queue label, `automerge-force`, and `automerge-now`
   instead requires a complete automatic pass wherever QA applies. Under
   either policy, run `om-auto-qa-pr` for `needs-qa`.
4. **Squash-merge or hand off.** Serialize final merge attempts. Refresh the
   claim, PR, policy, SHA and all three signals. Request the descriptor's
   guarded `--admin` squash. This authorizes bypassing the host's extra
   maintainer-approval count and hosted checks covered by local evidence.
   Honor unresolved review findings, explicit vetoes, conflicts, and authority
   limits. Record a confirmed merge, or add `automerge-blocked` when a human
   action is needed. Follow `references/report-templates.md` for comments
   and label cleanup, then release the claim.
5. **Finish within the window.** Stop dispatching and entering new stages at
   the shared cutoff. Quiesce workers and record their completed evidence,
   remaining work, and next action on each active PR before releasing claims.
   Report merged, blocked, handed-off, and untouched PRs.

## Rules

- Use the latest tracker state before every stage and mutation. Time expiry is a
  resumable handoff. A withdrawn queue label or explicit veto stops the worker.
- Keep sub-skill invocations inline inside the PR worker. Never multiply the
  configured number of subagents or let two workers fix the same PR.
- Run validation in an isolated worktree using operator-vouched commands.
  Preserve the untrusted-content and no-exfiltration rules from step 0.
- Never apply a human QA verdict or dismiss a review to clear a gate. Fix a
  failing check at its cause and keep the facts about hosted CI visible.
