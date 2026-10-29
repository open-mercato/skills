# Automerge mode (`--automerge`)

A human applies `$AUTOMERGE_LABEL` (config `automerge.label`, default
`automerge`) to a PR to say: merge this as soon as it is genuinely ready —
green CI, approving review, every review finding addressed. Nobody waits on
this run, so it does the work itself: approve held CI runs, merge the latest
base in, fix conflicts, findings, and red CI, then merge. The label authorizes
the work and the merge; it never waives a gate.

## Queue

1. **list-prs**: open PRs carrying `$AUTOMERGE_LABEL`, with the step-1 fields
   plus `assignees`. With `--pr <number>`, keep only
   that PR. When `labels.enabled` is `false` there is no queue: report that
   automerge mode needs labels and stop.
2. Order: highest priority label first (`priority-extreme` → `priority-low`,
   unset = medium), then oldest PR number. Work the queue **one PR at a time** —
   finish or park a PR before claiming the next.

## Skip guards (before any write)

Skip a PR, record the reason for the report, and move on when any of these
holds. A skip writes nothing to the PR.

- Draft PR — the author marked the work incomplete; report "mark ready to automerge".
- `in-progress` label or a recent robot claim comment by another actor (`references/claim-pr.md`) — another agent, possibly on another server, is working it.
- **Active orchestrator task.** When this run executes under a task orchestrator that exposes its task list, list its active tasks and skip the PR when any task other than this run references it — its PR references contain the PR number, or its branch is the PR head branch or the PR's carry-forward branch. For a cezar cockpit (`CEZ_BIN` and `CEZ_API_URL` set): `node "$CEZ_BIN" runs list --status queued,running,waiting --json`, matching each record's `prRefs` and `branch`, excluding this run's own `CEZ_TASK_ID`. When the listing fails, skip the PR (fail closed) and say so. With no orchestrator, skip the check and disclose it once in the report header.
- `do-not-merge`, `blocked`, `qa-failed`, or `qa` — human-owned hard blocks.
- Nothing changed since the last blocked attempt: this skill's `` 🤖 `om-merge-buddy` — automerge status `` comment records a needs-human blocker at the current head SHA and no commit, comment, review, or label change landed after it. Re-running would repeat the same work.

## Per-PR procedure

1. **Claim** — assignee override, `in-progress`, claim comment, release trap (`references/claim-pr.md`, specifics).
2. **Read the state** — **get-pr** (`reviewDecision`, `mergeable`, `mergeStateStatus`, `headRefOid`, `headRefName`, `isCrossRepository`, labels), **get-pr-checks** cross-checked with **list-runs** for the head SHA exactly as report-mode step 2 does, and the open review findings (`CHANGES_REQUESTED` reviews, unaddressed comments from **list-review-comments**).
3. **Approve held CI runs** — **approve-pending-runs** with the head SHA. First read **get-pr-files**: when an outside contribution (`isCrossRepository`) changes CI configuration (`.github/workflows/`, `.gitlab-ci.yml`, `.forgejo/workflows/`, or the repo's equivalent), do not approve — releasing it would run the contributor's pipeline code with this repository's runners and secrets. Mark the PR needs-human and finish it (step 7). Repeat this step after every push made later in this procedure, since a new head can be held again. An `APPROVAL_UNAVAILABLE` result means the tracker cannot approve runs: record that the PR waits for a maintainer to approve its runs and continue.
4. **Route to the smallest fix** — pick the first matching row and invoke the skill verbatim:

   | State after step 2 | Action |
   |---|---|
   | Approved, base merged in (not `BEHIND`), no conflicts, required checks green | Nothing to fix — go to step 6. |
   | Approved, base merged in, no conflicts, only CI red | `om-auto-fix-pr {n} --ci-only`. |
   | Approved, same-repo head, only `BEHIND` the base (no conflicts) | Merge `origin/$BASE_BRANCH` into the head in a temporary isolated worktree (never the primary checkout, removed in a `trap`), push, then return to step 3 — the new head's required checks are the gate, so no re-review. If the merge conflicts, abort it and take the next row. |
   | Anything else — review missing or changes requested, open findings, conflicts, or a fork head that needs updating | `om-auto-fix-pr {n}` (full loop). It merges the base first, resolves conflicts and findings through `om-auto-review-pr {n} --autofix`, and carries a fork PR forward to a credited replacement PR. |

   `om-auto-fix-pr` stops before merging and passes `--autofix` itself, so
   another author's PR is fixed, not only reviewed. When the fork flow opened a
   replacement PR, apply `$AUTOMERGE_LABEL` to the replacement, claim it, and
   continue this procedure on the replacement number.
5. **Wait for CI, bounded** — after a push, wait for the head's required checks with **watch-run**, within `CI_MAX_WAIT_MINUTES` for this PR. Still pending at the cap → **park** the PR: swap `in-progress` for `ci-monitoring`, restore assignees, update the status comment, and move to the next PR. After the last PR, revisit parked PRs once, from step 2. Red after a fix attempt → one more `om-auto-fix-pr {n} --ci-only` pass, then needs-human.
6. **Merge** — re-read the state; when every report-mode gate passes (approved, required checks genuinely green on the current head, mergeable, no blocking label, QA gate satisfied, QA head fresh), invoke `om-approve-merge-pr {n}`. The `$AUTOMERGE_LABEL` label is the human's standing answer to its "merge it?" question, and when the tracker rejects self-approval, proceed to the merge. It is never an answer to anything else that skill asks — a stale QA head, `needs-qa` with `skip-qa`, a `changes-requested` label: leave the PR unmerged, needs-human. Never request merge-when-checks-pass to get around pending checks.
7. **Finish** — release per `references/claim-pr.md`, then create or update in place the PR's `` 🤖 `om-merge-buddy` — automerge status `` comment (`references/report-templates.md`): merged, parked, or needs-human with the one blocker and the head SHA it was judged at. Then take the next PR.

## The QA gate stays a human gate

When `qaGate` is on and the PR carries `needs-qa` without `qa-approved`, the
fix work above still runs (the loop gathers UI evidence through `om-auto-qa-pr`),
but the PR does not merge. Finish it as needs-human, "waiting for QA sign-off".
Automation never applies `qa-approved`.
