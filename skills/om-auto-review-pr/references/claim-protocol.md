# Claim concurrency check

Detailed in-progress detection and decision tree for step 0 of `om-auto-review-pr`. The claim mechanics (assign + `in-progress` label + `🤖` claim comment) and the release step stay in the skill body; this file is the concurrency-decision detail.

A PR is **already in progress** when ANY of the following is true:

- It carries the `in-progress` label
- It has at least one assignee whose login is not `$CURRENT_USER`
- A claim comment newer than 30 minutes exists from another actor (look for the `🤖` start marker)

Decision tree:

| State | `--force` set? | Action |
|-------|---------------|--------|
| Not in progress | — | Claim and proceed |
| In progress, current user owns the lock | — | Treat as re-entry; proceed without re-claiming |
| In progress, someone else owns the lock | no | **STOP**. Ask the user: "PR #{prNumber} is in progress (owner: {owner}, signal: {label/assignee/comment}). Override and continue?" Only continue when the user explicitly says yes. |
| In progress, someone else owns the lock | yes | Post a force-override comment naming the previous owner, then claim and proceed |

Stale lock recovery:

- If the `in-progress` label is older than 60 minutes and the assignee did not push or comment in that window, treat it as expired. Still ask the user before overriding unless `--force` was set.
