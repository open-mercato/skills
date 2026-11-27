# Tracker writes (steps 6-9)

Every write here happens only when the tester runs the matching action.
Label changes go through the descriptor's guards; `LABELS_ENABLED=false`
skips them and the report says so. Read the batch PR again (**get-pr**)
right before each action and compare its head with the **tested head**.

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
covers the build: every write action first **unlabel-pr** `qa-approved` and
says why; read-only runs report it as stale and tell the tester to run
`--retest`, then `--verdict`.

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
2. **assign-pr** current user; **label-pr** `qaBatch.inProgressLabel`.
3. Find the checklist comment (above). None → **comment-pr** it (template in
   `references/report-templates.md`) with `Tested head:` set to the `TO` of
   the checklist just written. It exists without a `Tested head:` line → treat
it as no tested head recorded: **update-comment** it with the must-test list
and `Tested head:` set to `TO`. It exists with a `Tested head:` → `--start`
   never moves it: when the batch head equals it, **update-comment** the
   must-test list in place and keep the line; when the head moved, refuse,
   name the new commits and point to `--retest`, which checklists the
   stabilization fixes that `--start` never shows.
4. Tell the tester: the in-progress label is the agreed signal that the
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
   **label-pr** `qa-failed`.

## `--verdict stable|unstable`

A verdict run skips steps 1-5: it never rebuilds the checklist, because a
rebuilt checklist would take the current head as tested. It reads the batch
PR (**get-pr**), the tested head from the checklist comment, and the open
blockers, nothing else.

1. Refuse when **current-user** is a bot or automation identity: the verdict
   is a human's. Refuse `stable` when **current-user** is the stabilizer —
   the batch PR author, or the `--stabilizer` login given to this run —
   whatever `qaBatch.testers` contains: the stabilizer never certifies their
   own batch. `unstable` stays allowed.
2. `stable` is refused while **search-issues** finds an open issue labelled
   `qaBatch.blockerLabel`, whichever batch it names: a blocker from an
   earlier batch is still in this build until it is fixed. List them. One that
   no longer reproduces on the tested head is closed by the tester first; this
   skill never closes it.
3. `stable` is refused when the tested head is unknown: say that no trusted
   batch checklist comment records one, so nothing proves which head was
   tested. Tell the tester to run `--start`, test the head it records, then
   `--verdict` again; a head tested before it was recorded is never
   certified after the fact. `stable`
   is also refused when the batch head differs from the tested head: commits
   landed after testing. Name them and point to `--retest`. `unstable` is
   still recorded, against the tested head, or the current head marked
   "tested head unknown" when none is recorded.
4. Post or update `` 🤖 `om-qa-batch` — batch verdict `` (template in
   `references/report-templates.md`): `QA verdict: STABLE` or
   `QA verdict: UNSTABLE`, `QA head: <tested head sha>`, `Range:` ending at
   that head, blockers, what was tested and what was not.
5. Labels: stable → **label-pr** `qa-approved`, **unlabel-pr** `qa-failed` and
   `qaBatch.inProgressLabel`. Unstable → **label-pr** `qa-failed`,
   **unlabel-pr** `qa-approved`, keep the in-progress label so the batch stays
   frozen while the stabilizer fixes it.
6. Print the channel message from the templates for the tester to send.

The stabilizer decides when fixes are in and tags the batch; a new head
after a stable verdict needs a new verdict for that head, and the stale
`qa-approved` is withdrawn as above.

## `--retest`

1. `RETEST_FROM` = the `Tested head:` of the checklist comment. It works
   before any verdict exists, the common case: a stabilizer pushed during the
   first pass. Use the `QA head:` of the trusted verdict
   instead only when it is newer (a descendant of the tested head). Neither
   exists → refuse and point to `--start`.
2. `git log --first-parent "$RETEST_FROM..<current batch head>"` on the
   batch branch: map each commit to its stabilization PR (**search-prs** by
   SHA, base = batch branch); keep a commit with no PR as `(no PR found)`.
   Add every open `qaBatch.blockerLabel` issue.
3. Checklist: each fix with the blocker it closes, the areas it touched, and
   a short smoke of those areas. Write it to
   `$QA_DIR/batches/<batch-slug>/retest.md` with
   `Range: <RETEST_FROM>..<current batch head>`.
4. **update-comment** the checklist comment by its id: `Tested head:`
   becomes that current batch head and `Retest range:` names the range. Then
   `--verdict` again.
