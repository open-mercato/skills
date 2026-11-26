# CI evidence and merge gates (steps 5 and 8)

## CI evidence on the head (step 5)

1. **get-required-checks** for the PR's base branch: the check names the
   branch requires.
2. **get-pr-checks** for the PR, keeping only results for the head SHA.
3. **list-runs** for the head branch, keeping runs whose head SHA is the PR
   head. A run that is not completed counts as pending. A short check list
   is not proof of green: jobs of a freshly created run appear late (see the
   descriptor's note on **get-pr-checks**).

Result:

- **green**: every required check passed on the head and every run for the
  head SHA completed.
- **pending**: any required check or run for the head is missing or still
  running.
- **red**: any required check failed or was cancelled on the head. Read the
  failed log (**get-run-failed-logs** when the descriptor has it). A failure
  caused by the diff, or one you cannot attribute, is a blocker finding. An
  infrastructure failure clearly unrelated to the diff (runner lost, network
  timeout before tests ran) is reported as such and counts as pending.

A check skipped by design (for example a lane the project's CI picks for
docs-only changes) counts as passed only when the project's CI reports it as
successful; never infer success from absence.

## Merge gates (step 8)

Move the PR to `merge-queue` only when all of these hold on the current head:

1. **CI is green** on the head (above).
2. **An approving review on the head** from someone other than the author:
   this review, or another one bound to the same SHA.
3. **No blocking label**: `qa-failed`, `changes-requested`, `blocked`,
   `do-not-merge`, or the human QA label without `qa-approved`. When
   `QA_GATE_LABEL` is `needs-qa` (no separate human lane), `needs-qa`
   without `qa-approved` blocks as well.
4. **No open acceptance**: the PR does not carry `prTriage.acceptanceLabel`.
   This skill cannot verify who added an acceptance decision, so an outside
   contribution waiting for one stays in `review` with "waiting for a
   maintainer's acceptance".

When a gate is open, set or keep `review` and name the open gates in the
report and the label rationale: "waiting for CI", "waiting for a human
tester", "waiting for a maintainer's acceptance". A project may also run a
workflow that removes `merge-queue` when a blocking label appears later; this
skill does not rely on it.

## Automerge proposal

A PR that passes every gate, carries the lowest risk label, needs no human
tester, and is a small fix with a test gets the line "Proposed for
automerge" and the reason in the report. Adding the automerge label stays a
person's decision.
