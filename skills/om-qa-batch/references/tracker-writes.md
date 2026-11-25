# Tracker writes (steps 6-9)

Every write here happens only when the tester runs the matching action.
Label changes go through the descriptor's guards; `LABELS_ENABLED=false`
skips them and the report says so. Read the batch PR again (**get-pr**)
right before each action; if its head moved since the checklist, say so and
include the new commits before continuing.

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
   `qaBatch.blockerLabel` that names this batch PR. List them.
3. Post or update `` 🤖 `om-qa-batch` — batch verdict `` (template in
   `references/report-templates.md`): `QA verdict: STABLE` or
   `QA verdict: UNSTABLE`, `QA head: <full batch head sha>`, `Range:`,
   blockers, what was tested and what was not.
4. Labels: stable → **label-pr** `qa-approved`, **unlabel-pr** `qa-failed` and
   `qaBatch.inProgressLabel`. Unstable → **label-pr** `qa-failed`,
   **unlabel-pr** `qa-approved`, keep the in-progress label so the batch stays
   frozen while the stabilizer fixes it.
5. Print the channel message from the templates for the tester to send.

The stabilizer decides when fixes are in and tags the batch; a new head
after a stable verdict needs a new verdict for that head.

## `--retest`

1. Find the latest verdict comment's time and head.
2. Stabilization PRs merged into the batch branch after it (**list-prs**
   state merged, base = batch branch) and open blocker issues for the batch.
3. Checklist: each fix with the blocker it closes, the areas it touched, and
   a short smoke of those areas. Then `--verdict` again.
