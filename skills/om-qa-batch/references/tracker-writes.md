# Tracker writes (steps 6-9)

Every write here happens only when the tester runs the matching action.
Label changes go through the descriptor's guards. With
`LABELS_ENABLED=false`, write actions stop before mutations because the
mandatory claim label cannot be verified. Read the batch PR again (**get-pr**)
right before each action and compare its head with the **tested head**.

## Action preflight and cleanup

Before **any** mutation, including stale-approval withdrawal:

1. Require an exact batch PR; reject `--range` or `--since` with write flags.
   Validate the requested action, the verdict identity checks (bot
   identity, and for `stable` the stabilizer check), checklist ownership,
   `--start` freeze-label availability and stable-verdict guards first.
   A refused action makes no changes.
2. Acquire and verify the action-scoped PR claim under
   `references/claim-pr.md`, with an owned-release finally/trap. An explicit
   `--force` authorizes only the documented claim takeover; it never
   overrides a different recorded tester or any verdict guard. `labels.enabled:
   false` or an unavailable `in-progress` label prevents write actions,
   because the claim's mandatory second check cannot be verified.
3. Re-read the exact lock, reset history, PR head and relevant comments
   before each mutation. A change invalidates the preflight; stop or
   re-evaluate without assuming the earlier reading still authorizes it.
4. Keep one marker-idempotent label-rationale comment using
   `references/report-templates.md`, updating it after label changes.
   Run owned label/assignment cleanup, mark the claim comment released,
   and release the exact lock SHA last, on success and failure. Keep the
   persistent `qaBatch.inProgressLabel` and tested-head checklist.

When `--start` intentionally assigns the tester, preserve that assignment
as the persistent tester signal after transient claim cleanup; record this
handoff explicitly. Other actions restore only assignments they changed.
The action lock is never held while the tester exercises the application.

**Trusted comments.** Every checklist and verdict comment read here is
filtered by `references/trusted-comments.md` (trusted authors, untrusted
ones listed, SHA validation, residual risk). "Trusted verdict" below means
the newest verdict comment that passes it.

**The checklist comment.** Each batch has exactly one: the earliest
`` 🤖 `om-qa-batch` — 🧪 batch checklist `` comment by a trusted author.
Record its comment id; every later action reads and updates that id only
and never posts a second one. When it was written by someone other than
**current-user**, the batch is theirs: stop and name them.

**Tested head.** It is recorded on the batch PR, never in a local file: the
`Tested head: <full sha>` line of the checklist comment. The first `--start`
sets it to the `TO` it checklisted; after that only `--retest` moves it. The
local `checklist.md` is a working copy and never answers this. No checklist
comment, or no `Tested head:` line in it, means the tested head is unknown.
A moved head never joins the tested build silently: say so, name the new
commits, and point to `--retest`.

**Stale approval.** When the batch carries `qa-approved` and its head differs
from the `QA head:` of the trusted verdict, or no trusted verdict exists
(an untrusted one never vouches for the label), the approval no longer
covers the build: after preflight, every eligible write action first
**unlabel-pr** `qa-approved` and
says why; read-only runs report it as stale and tell the tester to run
`--retest`, then `--verdict` — except for a merge-back conflict fix (below).
With an empty `qaBatch.testers` only
**current-user** is trusted, so tester B's write action treats tester A's
verdict as untrusted and withdraws a valid `qa-approved`: teams with more
than one tester set `qaBatch.testers`.

**Merge-back conflict fix.** The trusted verdict is STABLE, a tag starting
with `qaBatch.greenTagPrefix` points at its `QA head:`, and every commit
after that head on the batch branch's first-parent line is a merge of the
base branch into the batch (the stabilizer resolving a merge-back conflict
after tagging). Verify that per commit, never from its subject:

```bash
git fetch origin "$BASE_BRANCH"
git merge-base --is-ancestor "$QA_HEAD" "$BATCH_HEAD" || exit 1        # QA head is in the batch history
for c in $(git rev-list --first-parent "$QA_HEAD..$BATCH_HEAD"); do
  [ "$(git rev-list --parents -n 1 "$c" | wc -w)" -eq 3 ] || exit 1   # exactly two parents
  git merge-base --is-ancestor "$c^2" "origin/$BASE_BRANCH" || exit 1  # second parent is base history
done
```

Any commit that fails → not this exception: use the normal stale-approval
and `--retest` path. When every commit passes, the verdict stays on the
green-tagged commit: no `--retest` and no new verdict is asked for. Report
`qa-approved` on the moved head as stale so the stabilizer merges without it
(the merge back is pinned to the resolved head once the full suite is green
on it); a write action under this exception removes `qa-approved` like any
other stale approval, and its report says the verdict still stands on the
tagged commit. List the base PRs the merge brought in as not covered by
this verdict: the next batch's range starts at that green tag, so they are
tested there.

**Pipeline labels.** `qa-failed` is a pipeline label: set it only through
the descriptor's `set_pipeline_label` guard, never with a bare **label-pr**
next to another one. That guard removes every other pipeline label, so a
human merge hold would silently go: when the batch PR carries
`do-not-merge` or `blocked`, keep it and skip the pipeline change
(`merge-queue` or `qa-failed`); still post the verdict, still add or remove
`qa-approved`, and name the hold in the report and the label rationale.
A stable verdict under a hold removes `qa-failed` directly with
**unlabel-pr** (the skipped `merge-queue` change would have cleared it), so
`qa-failed` never sits next to `qa-approved`. An unstable verdict under a
hold defers `qa-failed` until the hold is lifted: the verdict comment and
the removed `qa-approved` record it, and the report says the failed label
is deferred.

## Blocker definition

A defect blocks the batch when a user cannot finish a main task:

- a main screen does not load, or a main path returns a server error;
- signing in, saving, or creating a basic record fails;
- data is lost, saved wrong, or shown to the wrong organization or tenant;
- a migration fails or the app does not start after the update.

Everything else (cosmetics, translations, small UX issues, edge cases with
a workaround) is a normal bug: it is filed, never blocks the batch, and is
fixed through the normal flow.

## `--start`

1. **get-pr** the batch. When it carries `qaBatch.inProgressLabel` and is
   assigned to someone other than **current-user**, stop and name who holds
   it. The same user re-running `--start` updates in place.
2. Before assignment or any other mutation, require the configured
   persistent freeze label to exist, using the descriptor's guard:

   ```bash
   BATCH_FREEZE_LABEL=$(printf %s "$QA_BATCH" | jq -er .inProgressLabel)
   if ! label_exists "$BATCH_FREEZE_LABEL"; then
     printf "Batch freeze label unavailable: %s; provision it before --start.\n" "$BATCH_FREEZE_LABEL" >&2
     exit 1
   fi
   ```

   Then **assign-pr** current user and **label-pr** the freeze label.
   **get-pr** the batch again and require that exact label and the tester
   assignment in the read-back. A skipped guard is not success. Failed
   read-back → stop before publishing a checklist or announcing a freeze;
   undo only this invocation's new assignment/freeze mutations under the
   owned lock, retaining any pre-existing tester freeze or checklist.
3. Find the checklist comment (above). None → **comment-pr** it (template in
   `references/report-templates.md`) with `Tested head:` set to the `TO` of
   the checklist just written, and `Stabilizer:` set to the `--stabilizer`
   login or, without it, the batch PR author. `--start` never changes a
   recorded `Stabilizer:`. It exists without a `Tested head:` line → treat
   it as no tested head recorded: **update-comment** it with the must-test
   list and `Tested head:` set to `TO` (and `Stabilizer:` when missing). It
   exists with a `Tested head:` → `--start`
   never moves it: when the batch head equals it, **update-comment** the
   must-test list in place and keep the line; when the head moved, refuse,
   name the new commits and point to `--retest`, which checklists the
   fixes added after the recorded tested head.
4. Only after the verified freeze read-back and checklist publication,
   tell the tester: the in-progress label is the agreed signal that the
   batch is being tested and must not be refreshed with newer base commits.

## `--blocker <bug-file>` / `--bug <bug-file>`

1. Read the bug file (title, steps, expected, actual, environment). Refuse a
   file that contains secrets or credentials; redact first.
2. Check for a duplicate: **search-issues** open with the title's key words.
   A clear duplicate → report it instead of filing.
3. **create-issue** with the file's title and body, labels `qaBatch.bugLabels`,
   plus `qaBatch.blockerLabel` for `--blocker`. Add a line naming the batch
   PR and `QA head: <full sha>` to the body.
4. `--blocker` only: **comment-pr** on the batch PR with the blocker template,
   mentioning `--stabilizer` or the batch PR author, and the issue link.
   Then, when the batch carries `qa-approved`, **unlabel-pr** it and
   **set_pipeline_label** `qa-failed`, unless a `do-not-merge` or `blocked`
   hold is on the PR (see Pipeline labels above).

## `--verdict stable|unstable`

A verdict run skips steps 1-5: it never rebuilds the checklist, because a
rebuilt checklist would take the current head as tested. It reads the batch
PR (**get-pr**), the tested head from the checklist comment, and the open
blockers, nothing else.

1. Refuse when **current-user** is a bot or automation identity: the verdict
   is a human's. Refuse `stable` when **current-user** stabilized the batch,
   whatever `qaBatch.testers` contains — the stabilizer never certifies their
   own fixes. **current-user** stabilized it when it is:
   - the batch PR author;
   - the `Stabilizer:` login of the checklist comment (read under
     `references/trusted-comments.md`), or the `--stabilizer` login given to
     this run;
   - the author or the merger of any stabilization PR (**list-prs** state
     merged, base = batch branch, with author and merged-by);
   - the author of any commit on the batch branch (**get-pr** the batch with
     its commits' author logins).
   Name which of these matched. `unstable` stays allowed.
2. `stable` is refused while **search-issues** finds an open issue labelled
   `qaBatch.blockerLabel`, whichever batch it names: a blocker from an
   earlier batch is still in this build until it is fixed. List them. After a
   passing retest of the fix, QA (or the stabilizer) closes the blocker issue
   by hand; this skill never closes it. `unstable` is refused while no
   blocker issue is open: unstable means at least one open blocker, so file
   it with `--blocker` first; a defect that does not block is a `--bug` and
   never makes the batch unstable.
3. `stable` is refused when the tested head is unknown: say that no trusted
   batch checklist comment records one, so nothing proves which head was
   tested. Tell the tester to run `--start`, test the head it records, then
   `--verdict` again; a head tested before it was recorded is never
   certified after the fact. `stable`
   is also refused when the batch head differs from the tested head: commits
   landed after testing. Name them and point to `--retest` (a merge-back
   conflict fix after the green tag needs no new verdict; see above). `unstable` is
   still recorded, against the tested head, or the current head marked
   "tested head unknown" when none is recorded.
4. Post or update `` 🤖 `om-qa-batch` — batch verdict `` (template in
   `references/report-templates.md`): `QA verdict: STABLE` or
   `QA verdict: UNSTABLE`, `QA head: <tested head sha>`, `Range:` ending at
   that head, blockers, what was tested and what was not.
5. Labels: stable → **set_pipeline_label** `merge-queue` (which clears
   `qa-failed` and `qa`), **label-pr** `qa-approved`, **unlabel-pr**
   `qaBatch.inProgressLabel`. Unstable → **set_pipeline_label** `qa-failed`,
   **unlabel-pr** `qa-approved`, keep the in-progress label so the batch stays
   frozen while the stabilizer fixes it. With a `do-not-merge` or `blocked`
   hold on the PR, skip the pipeline change in both cases and name the hold;
   stable still **unlabel-pr** `qa-failed`, unstable defers `qa-failed`
   until the hold is lifted (see Pipeline labels above).
6. Print the channel message from the templates for the tester to send.

The stabilizer decides when fixes are in and tags the batch; a new head
after a stable verdict needs a new verdict for that head, and the stale
`qa-approved` is withdrawn as above — except the merge-back conflict fix
after the green tag, where the verdict stays on the tagged commit.

## `--retest`

1. `RETEST_FROM` = the `Tested head:` of the checklist comment. It works
   before any verdict exists, the common case: a stabilizer pushed during the
   first pass. Use the `QA head:` of the trusted verdict
   instead only when it is newer (a descendant of the tested head). Neither
   exists → refuse and point to `--start`.
2. `git log "$RETEST_FROM..<current batch head>"` (every commit, so base
   merges into the batch are included; a merge commit without a PR of its
   own is skipped and its PRs found through their commits) on the
   batch branch: map each commit to its PR as in `references/batch-window.md`
   (Enumerate) — stabilization PRs (base = batch branch) and any base PRs a
   base merge brought in, which get the step 3-4 check; keep a commit with
   no PR as `(no PR found)`.
   Add every open `qaBatch.blockerLabel` issue.
3. Checklist: each fix with the blocker it closes, the areas it touched, and
   a short smoke of those areas. Write it to
   `$QA_DIR/batches/<batch-slug>/retest.md` with
   `Range: <RETEST_FROM>..<current batch head>`.
4. **update-comment** the checklist comment by its id: `Tested head:`
   becomes that current batch head and `Retest range:` names the range. Then
   `--verdict` again.
