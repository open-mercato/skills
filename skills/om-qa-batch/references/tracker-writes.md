# Tracker writes (steps 6-9)

Every write here happens only when the tester runs the matching action.
Label changes go through the descriptor's guards; `LABELS_ENABLED=false`
skips them and the report says so. Read the batch PR again (**get-pr**)
right before each action and compare its head with the **tested head**: the
`<to>` of the `Range: <from>..<to>` line in the newest checklist the tester
worked from (`$QA_DIR/batches/<batch-slug>/checklist.md` or the `--retest`
checklist). A moved head never joins the tested build silently: say so, name
the new commits, and point to `--retest`.

**Stale approval.** When the batch carries `qa-approved` and its head differs
from the `QA head:` of the latest verdict comment, the approval no longer
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
3. Find the `` 🤖 `om-qa-batch` — 🧪 batch checklist `` comment
   (**list-issue-comments**); **update-comment** it, or **comment-pr** a new one
   (template in `references/report-templates.md`).
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

1. Refuse when **current-user** is a bot or automation identity: the verdict
   is a human's.
2. `stable` is refused while **search-issues** finds an open issue labelled
   `qaBatch.blockerLabel`, whichever batch it names: a blocker from an
   earlier batch is still in this build until it is fixed. List them. One that
   no longer reproduces on the tested head is closed by the tester first; this
   skill never closes it.
3. `stable` is refused when the batch head differs from the tested head:
   commits landed after testing. Name them and point to `--retest`.
   `unstable` is still recorded, against the tested head.
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

1. Find the latest verdict comment's time and head.
2. Stabilization PRs merged into the batch branch after it (**list-prs**
   state merged, base = batch branch) and every open `qaBatch.blockerLabel`
   issue.
3. Checklist: each fix with the blocker it closes, the areas it touched, and
   a short smoke of those areas. Write it to
   `$QA_DIR/batches/<batch-slug>/retest.md` with
   `Range: <last QA head>..<current batch head>`; that `<to>` becomes the
   tested head. Then `--verdict` again.
