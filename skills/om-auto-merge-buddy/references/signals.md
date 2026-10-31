# The three signals — evidence, record, invalidation

A signal is **held** only when both of these are true:

- its label is on the PR;
- the status comment's signal record has a matching `pass` (or `n/a`) entry for the PR's **current head SHA**.

A label without a record means a human or another tool added it by hand. Verify
that signal again; never trust the label alone. A record without its label means
the label was removed. Treat the signal as not held and verify it again. Checking
a signal is cheap. Producing one is a stage (`references/stages.md`), so always
check first.

## 1 · Code review — `automerge-signal-1-cr`

Held when either of these is true on the current head:

- **`om-auto-review-pr` approved it.** The last orchestrated review stage returned `outcome=pass` for this head, and the record links the review. On a self-authored PR the host rejects an approving review, so the review skill posts the approving body as a comment, and that comment is the evidence.
- **A human approved it.** An `APPROVED` review on this exact head commit (from **get-pr** `reviews` / `latestReviews`) by someone other than the PR author and other than `CURRENT_USER`. No newer `CHANGES_REQUESTED` review from a human may still stand, and no unresolved blocker may remain from this skill's last review. Bot accounts do not count as human approval.

A standing human `CHANGES_REQUESTED` review does not block the signal once
`om-auto-review-pr` has approved this head. The review stage picks up that
feedback as `INHERITED` findings and fixes it, or answers it with a reason.

## 2 · QA — `automerge-signal-2-qa`

- **`n/a`** — the PR carries `skip-qa`, or does not carry `needs-qa`, or `qaGate` is `false`. Record `qa: n/a` and apply the label: the signal is satisfied.
- **Held** — the PR carries `qa-approved`, and the newest comment granting it (a QA reviewer's note, or `om-auto-qa-pr`'s self-QA sign-off) has a `QA head:` line pinning it to a commit, per `SDLC.md`. That commit must be the current head, or every commit after it must leave the tested scope untouched: only target-branch merges, or no user-facing files. In the second case, record the carry-forward and its reason in the status comment (`qa: pass <head> carried from <QA head>`). Otherwise the approval is stale. The label stays, but the signal is missing.
- **Missing** — the QA stage produces it. When the PR is `risk-high` (labeled, or inferred per `SDLC.md`), the self-QA exception does not apply. The visit then ends `waiting-human` with `qa: waiting-human <head>` recorded. While that record matches the head and no fresh `qa-approved` has appeared, the signal check returns `waiting-human` straight away; QA is not re-run and no attempt is counted.

## 3 · CI — `automerge-signal-3-ci`

Read **get-pr-checks** for the current head, and `mergeable` from **get-pr**.

| Reading | Meaning |
|---|---|
| every check completed `SUCCESS` / `NEUTRAL` / `SKIPPED`, head not conflicting | **held** |
| any check `PENDING` / `QUEUED` / `IN_PROGRESS` and none failed | **pending** → `waiting-ci` (no attempt counted). A check that has been pending for more than 4 hours on one head counts as **failing**: a stuck runner is a CI problem, not a reason to wait forever |
| any check `ACTION_REQUIRED` (runs held for maintainer approval) | approve held runs, then **pending** (below) |
| any `FAILURE` / `ERROR` / `CANCELLED` / `TIMED_OUT`, or head `CONFLICTING` | **failing** → CI stage |
| no checks at all | **pending** for the first 10 minutes after the head commit. After that, **held** as "no CI configured" only when **list-runs** on the target branch also shows no workflow runs; otherwise **failing** (CI did not start) |

All checks count, not only the required ones: the three signals replace the host's
merge rules, so a red optional check is still red.

**Held runs.** Call **approve-pending-runs** for the head SHA only when the PR
carries `AUTOMERGE_LABEL` and its changed files (**get-pr-files**) touch no CI
or workflow definitions. When an outside contributor's diff changes those files,
park the PR as `blocked`: a maintainer must approve the runs. An agent never lets
unreviewed contributor code drive this repository's CI.

## Invalidation when the head moves

Compare the current head with the SHA in each record. When they differ:

- **CI** — always stale; read the checks for the new head.
- **CR** — stale, *unless* every new commit only merges the PR's target branch with no conflict resolution (each merge commit's tree equals the automatic merge result). The next review stage is a delta re-review of the new commits, which costs much less than a first review.
- **QA** — stale when the new commits touch a user-facing surface (UI, routes, templates, styles, user-visible copy), whoever granted `qa-approved`. In that case the PR needs a fresh `QA head:`, from a re-run QA stage or a human. `n/a` is never invalidated by commits. A label change that adds `needs-qa` re-opens the signal.
- A retargeted PR (its `baseRefName` changed) invalidates all three.

Remove the label of every invalidated signal in the same step, so the labels
never show a signal the record no longer backs.

## Signal record (inside the status comment)

A fenced block with exactly these lines, rewritten whole on every change:

```text
head: <sha>
cr: <pass|missing|fail> <sha> <evidence url>
qa: <n/a|pass|missing|fail|waiting-human> <sha> <evidence url>
ci: <pass|pending|fail|missing> <sha> <checks url>
attempts: cr=<n> qa=<n> ci=<n>
```

The attempt counters reset to zero when a human removes `automerge-blocked`
(seen as the label gone while the record still shows a cap reached) and when
the PR is replaced.
