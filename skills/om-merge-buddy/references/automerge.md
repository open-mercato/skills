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
- `in-progress` label or a recent robot claim comment — another agent is working it. This holds even when the claim belongs to `CURRENT_USER`, because runs on other servers may share the automation user. Only a stale claim (`references/claim-pr.md`, stale-lock recovery) is taken over, with the takeover note; that is how a crashed run's own lock is recovered.
- **Active orchestrator task.** When this run executes under a task orchestrator that exposes its task list, list its active tasks and skip the PR when any task other than this run references it — its PR references contain the PR number, or its branch is the PR head branch or the PR's carry-forward branch. For a cezar cockpit (`CEZ_BIN` and `CEZ_API_URL` set): `node "$CEZ_BIN" runs list --status queued,running,waiting --json`, matching each record's `prRefs` and `branch`, excluding this run's own `CEZ_TASK_ID`. When the listing fails, skip the PR (fail closed) and say so. With no orchestrator, skip the check and disclose it once in the report header.
- `do-not-merge`, `blocked`, `qa-failed`, or `qa` — human-owned hard blocks.
- Nothing changed since the last blocked attempt: this skill's `` 🤖 `om-merge-buddy` — automerge status `` comment records a needs-human blocker at the current head SHA and no commit, comment, review, or label change landed after it. Re-running would repeat the same work.

## Per-PR procedure

1. **Claim** — assignee override, `in-progress`, claim comment, release trap (`references/claim-pr.md`, specifics).
2. **Read the state** — **get-pr** (`reviewDecision`, `mergeable`, `mergeStateStatus`, `headRefOid`, `headRefName`, `baseRefName`, `baseRefOid`, `isCrossRepository`, labels). Set `TARGET_BRANCH` to this PR's `baseRefName`, validate it as a branch name, and use it for every base fetch/merge and **get-required-checks** call. Missing target → needs-human; never fall back to the configured `baseBranch` or the repository default. Read **get-pr-checks** cross-checked with **list-runs** for the head SHA exactly as report-mode step 2 does, and the open review findings (`CHANGES_REQUESTED` reviews, unaddressed comments from **list-review-comments**). Re-resolve the target on every cycle and after a replacement PR; if retargeted, discard the old gate readings and re-evaluate against the new target.
3. **Approve held CI runs** — **approve-pending-runs** with the head SHA. First read **get-pr-files**: when an outside contribution (`isCrossRepository`) changes CI configuration (`.github/workflows/`, `.gitlab-ci.yml`, `.forgejo/workflows/`, or the repo's equivalent), do not approve — releasing it would run the contributor's pipeline code with this repository's runners and secrets. Mark the PR needs-human and finish it (step 7). Repeat this step after every push made later in this procedure, since a new head can be held again. An `APPROVAL_UNAVAILABLE` result means the tracker cannot approve runs: record that the PR waits for a maintainer to approve its runs and continue.
4. **Route to the smallest fix** — pick the first matching row and invoke the skill verbatim:

   "Approved" means `reviewDecision` is `APPROVED`. On a PR the automation user
   authored, the tracker rejects self-approval, so it also means this
   pipeline's own latest `om-auto-review-pr` verdict is APPROVED at the current
   head and the PR carries `merge-queue`. When branch protection still demands an
   approving review from someone else, step 6 ends the PR as needs-human,
   "needs an approving review from someone other than the automation user". It
   never loops back into fixing.

   | State after step 2 | Action |
   |---|---|
   | Approved, base merged in (not `BEHIND`), no conflicts, required checks green | Nothing to fix — go to step 6. |
   | Approved, base merged in, no conflicts, only CI red | `om-auto-fix-pr {n} --ci-only`. |
   | Approved, same-repo head, only `BEHIND` the base (no conflicts) | Fetch `origin`'s `TARGET_BRANCH`, then merge `origin/$TARGET_BRANCH` into the PR head in a temporary isolated worktree (never the primary checkout, removed in a `trap`), push, then return to step 2 to re-read the target and head and approve any newly held runs. Re-review when approval no longer covers that head, including the self-authored current-head verdict in step 4. If the merge conflicts, abort it and take the next row. |
   | Anything else — review missing or changes requested, open findings, conflicts, or a fork head that needs updating | `om-auto-fix-pr {n}` (full loop). It merges the base first, resolves conflicts and findings through `om-auto-review-pr {n} --autofix`, and carries a fork PR forward to a credited replacement PR. |

   `om-auto-fix-pr` stops before merging and passes `--autofix` itself, so
   another author's PR is fixed, not only reviewed. After any sub-skill returns,
   re-read the claim: if it released this invocation's lock, re-establish it
   before proceeding, unless another run claimed the PR meanwhile (then skip).
   Never treat a shared automation login as proof of re-entry.
   When the fork flow opens a replacement PR, follow **Carry-forward continuity**
   below: copy applicable labels, switch the active PR context, and continue this
   procedure on the replacement through the final merge. Never stop at the
   replacement's creation or wait for a human to restart the chain.
5. **Wait for CI, bounded** — after a push, wait for the head's required checks with **watch-run**, within `CI_MAX_WAIT_MINUTES` for this PR. Still pending at the cap → **park** the PR: swap `in-progress` for `ci-monitoring`, restore assignees, update the status comment, and move to the next PR. After the last PR, revisit parked PRs once, from step 2. Red after a fix attempt → one more `om-auto-fix-pr {n} --ci-only` pass, then needs-human.
6. **Merge** — re-read the head, `baseRefName`, `baseRefOid`, label, claim, and gates. If the target branch or its tip changed since evaluation, return to step 2. When every report-mode gate passes (approved as defined in step 4, required checks genuinely green on the current head against `TARGET_BRANCH`, mergeable, no blocking label, QA gate satisfied, QA head fresh), invoke `om-approve-merge-pr {n} --automerge` with this invocation's claim context (PR number, claim comment id, actor, run identity when available). That skill validates the delegated claim and label independently and merges into this PR's current target branch without retargeting it. The `in-progress` claim this run holds is the one exception to report mode's claim gate; no other run's claim is exempt. A validated handoff answers self-approval rejection alone. Any other ambiguity — stale QA head, `needs-qa` with `skip-qa`, `changes-requested` — returns needs-human and leaves the PR unmerged. Never request merge-when-checks-pass to get around pending checks. If the installed merge skill lacks this handoff mode, stop needs-human and name the required skill upgrade; never fall back to an interactive invocation in an unattended run.
7. **Finish** — release per `references/claim-pr.md`, then create or update in place the PR's `` 🤖 `om-merge-buddy` — automerge status `` comment (`references/report-templates.md`): merged, parked, or needs-human with the one blocker and the head SHA it was judged at. Then take the next PR.

## Carry-forward continuity

- Immediately before transfer, read the original's current labels through
  **get-pr**; a removed automerge label cancels this continuation, so do not
  recreate it from an earlier snapshot. Before the original closes, verify the
  replacement retains the original `baseRefName`, credit, and supersede link.
  Copy the original's category, priority, risk, custom labels, QA requirements (`needs-qa` / `skip-qa`),
  and `$AUTOMERGE_LABEL` through the label guards; preserve human hard blocks.
  Keep exactly one priority and risk label, preserving the originals unless a
  documented scope increase requires raising them.
  Normalize the pipeline label to the replacement's verified state through
  `set_pipeline_label`, retaining any human block. Never copy `qa-approved`,
  `qa-self-verified`, `in-progress`, or `ci-monitoring`: QA evidence is tied to
  a head, and claims/monitoring belong to a run. Missing labels degrade through
  the guards, but a missing automerge label prevents unattended merging.
  Conflicting QA requirements remain a blocker, not permission to pick one.
- Read back the replacement's labels through **get-pr** before accepting the
  transfer. Establish this run's own claim on it, then release only this run's
  original claim. A competing live claim stops the transfer. The original may
  close only after the replacement exists with its required labels verified;
  label-transfer failure leaves it open with the blocker recorded.
- Consume the replacement's `PR:` chaining line (accept legacy markers), update
  the active PR number, URL, branch, target, claim context, and cleanup tracking,
  then return to per-PR step 2. All later fixes, review, CI, evidence, comments,
  and the merge act on that replacement. Repeat for any later replacement;
  never resume work on a superseded PR or open a duplicate.
- Continue in this invocation until the active replacement merges or a genuine
  gate, access/claim conflict, or bounded CI wait prevents progress. Do not ask
  for routine confirmation, wait for the original author's recheck, or hand the
  user a command to restart. `om-auto-fix-pr` still returns without merging;
  this driving skill resumes automatically and invokes `om-approve-merge-pr`
  with the validated automerge handoff. A fresh QA or independent-review gate
  still needs its required evidence; copying labels never satisfies it.

## The QA gate stays a human gate

When `qaGate` is on and the PR carries `needs-qa` without `qa-approved`, the
fix work above still runs (the loop gathers UI evidence through `om-auto-qa-pr`),
but the PR does not merge. Finish it as needs-human, "waiting for QA sign-off".
Automation never applies `qa-approved`.
