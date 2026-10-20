# Report before the bounded CI follow-up

Use this procedure in step 13 of `om-auto-review-pr`.

## Publish before waiting

Complete these actions before any CI wait:

1. Apply the full label set through the descriptor guards.
2. Submit the complete review body and verdict.
3. Post the label rationale, completion comment, handoff, and applicable evidence.
4. Promote an eligible completed draft to ready.
5. Release this run's claim or retain the inherited chain claim for its owner.

If required checks are pending, include this separate paragraph in the review body:

```markdown
**CI pending:** {check names and links} on this head. Required CI and QA approval
still gate merge. A follow-up will report the CI result.
```

Omit the last sentence if this run will not follow up. Omit the paragraph if no required checks are pending.

## Use the monitoring label

Read `CI_MAX_WAIT_MINUTES` from `ci.maxWaitMinutes`, with a default of `40`.
A value of `0` skips the wait and the monitoring label.

For a claim this run owns, remove `in-progress` before waiting. Add `ci-monitoring` only if this run will follow up.
Retain an inherited chain claim as `references/claim-pr.md` requires. Never release another run's lock.
Use the descriptor guards for each mutation. A missing label produces a logged skip.

`ci-monitoring` is a meta label. It neither reserves work nor replaces a pipeline label.

## Read complete CI evidence

"Settled" is a claim about a complete reading, so make the reading complete before
believing it: the check-run surface reports *jobs*, and a workflow run the tracker
has created contributes no rows until its jobs register — so a head that was pushed
moments ago can show a short, entirely-green list while the run that matters has not
started. Alongside each poll, take **list-runs** on the PR head branch, keep the runs
whose `headSha` is the PR head SHA, and treat any run whose `status` is not
`completed` as a pending check. Only when both readings are quiet is CI settled;
otherwise keep waiting under the same budget. A descriptor that exposes no run-level
operation cannot support the cross-check — then say so in the CI-result comment
("verdict rests on the check surface alone") rather than dropping the caveat. A
CI-result comment states which reading it rests on (how many checks, how many
workflow runs at that SHA), because a
"green" that came from an empty list is the one failure this whole file exists to
keep off a pull request.

**Checks settled inside the budget**

If the PR head changes, stop this follow-up. Report that the new head needs review. Remove `ci-monitoring`.

Find the `` 🤖 `om-auto-review-pr` — CI result `` comment through **list-issue-comments**.
Update it through **update-comment**, or create it through **comment-pr** when absent. Use a body file.

- Passed checks with an unchanged verdict: report the evidence. Keep the current pipeline label.
- New required failure after approval: use `set_pipeline_label` to apply `changes-requested`. Name the failed check and link its evidence.
- Required failure already included in the verdict: report its current state without repeating the review.

For a changed verdict, update the single label-rationale comment and hand the PR back to its author.
Remove `ci-monitoring` after the follow-up.

## Stop at the time limit

Do not extend the wait beyond `CI_MAX_WAIT_MINUTES`.
Use the command results already recorded for the reviewed tree when their inputs remain unchanged.
Do not rerun the same gate merely because remote CI is still pending.

If local evidence is missing or invalid, run the configured gate again in an isolated worktree.
Recreate a worktree if step 12 removed this run's worktree. Clean up only worktrees created for that validation.
Record failures or unavailable checks honestly.

Update the CI-result comment with every local command result and pending check name and link. Include this exact statement:

```text
no further follow-up will come from this agent
```

Name the human or later run that owns the next check. Remove `ci-monitoring`. Finish the report.

## Keep the merge gates

Local results are this run's evidence. They never replace required CI or branch protection.
Keep required CI and QA approval as merge gates. Never derive `qa-approved` from a diff or set the human-only `qa` label.
