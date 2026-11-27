# CI evidence and merge gates (steps 5 and 8)

## CI evidence on the head (step 5)

1. **get-required-checks** for the PR's base branch: the check names the
   branch requires. Preserve the descriptor's 404 fallback: treat all reported checks as required
   when branch protection is unavailable. Other query failures remain pending.
2. **get-pr-checks** for the PR, keeping only results for the head SHA.
3. **list-runs** for the head branch, keeping runs whose head SHA is the PR
   head. A run that is not completed counts as pending. A short check list
   is not proof of green: jobs of a freshly created run appear late (see the
   descriptor's note on **get-pr-checks**).

Result:

- **green**: **get-required-checks**, **get-pr-checks**, and **list-runs**
  all succeeded (or the documented 404 fallback applies); every required check passed on the head; every workflow run
  for the head SHA completed with a passing conclusion (`success`, or
  `skipped`/`neutral` only when the project's CI reports it as passing by
  design — never `failure`, `cancelled`, `timed_out`, `action_required`, or
  `startup_failure`); and no held fork CI run (`action_required`) is waiting.
- **pending**: any required check or run for the head is missing, queued,
  still running, or held in `action_required`, or any CI query failed or was
  unreadable (fail closed — never infer green from an error or absence).
- **red**: any required check or workflow run for the head failed, was
  cancelled, or timed out. Read the failed log (**get-run-failed-logs** when
  the descriptor has it). A failure caused by the diff, or one you cannot
  attribute, is a blocker finding. An infrastructure failure clearly
  unrelated to the diff (runner lost, network timeout before tests ran) is
  reported as such and counts as pending.

A check skipped by design (for example a lane the project's CI picks for
docs-only changes) counts as passed only when the project's CI reports it as
successful; never infer success from absence.

**Routing evidence.** A matching head SHA alone does not prove the selected
CI level and areas ran. Read the scope file's implications against the live
labels, and confirm the required jobs or run logs show that level and those
areas were exercised. When routing labels changed on the same head, use a
run triggered after the raise or explicit job evidence covering the final
selection; an older lower-level pass stays pending. If the workflow cannot
prove its selection, report the missing evidence and keep `review`.

## Merge gates (step 8)

Re-read the PR (**get-pr**) after step 6 so every gate below is checked
against the live head SHA and the live post-mutation label set. If the head
SHA moved, stop and do not set `merge-queue`.

Move the PR to `merge-queue` only when all of these hold on the current head:

1. **CI is green** on the head (above), and **no CI or QA routing label was
   raised in this run**. Count both step 2 (delegated triage) and step 6
   (review) raises. When either raised any CI level label, area label,
   risk label that implies a higher CI level, or blocking QA label, re-read
   labels and leave `merge-queue` off (keep `review`): CI from step 5 ran
   under the old labels and must run and pass for the new level (and any
   newly added human QA gate must receive `qa-approved`) before `merge-queue`
   can be set.
2. **Current-head trusted triage**: a comment authored by a trusted identity
   (the current user, the automation identity, or a login in
   `humanQaPolicy.trustedTriageAuthors`) carries
   `CI-Triage-Head: <current head sha>`.
3. **An approving review on the head** from someone other than the author:
   this review, or another one bound to the same SHA (never set `merge-queue`
   on the current user's own PR). For an external author (without `write`,
   `maintain` or `admin` permission), this review must be a **human**
   approving review on the current head from a user with `write`, `maintain`
   or `admin` permission who is not a bot or an automation identity — never
   count `om-review-pr`'s own approval toward `merge-queue`.
4. **No blocking label or state**: no `qa-failed`, `changes-requested`,
   `blocked`, `do-not-merge`, or the human QA label without `qa-approved`
   supported by current-head QA evidence when `QA_GATE=true`.
   When `QA_GATE_LABEL` is `needs-qa` (no separate human lane), `needs-qa`
   without `qa-approved` blocks as well when `QA_GATE=true`. With
   `QA_GATE=false`, QA requests are advisory; explicit human vetoes and
   other hard blocks still apply. The PR must be open, non-draft, and
   have no unresolved merge conflicts.
   Inspect each reviewer's latest effective review: a latest changes-requested
   verdict remains a hold until that reviewer approves or a maintainer
   explicitly dismisses it; this skill's own approval cannot erase it.
   An unresolved human QA NO-GO from a verified repository writer remains
   a veto without a label, until that reviewer or a maintainer releases it.
   A required QA approval must have trusted evidence pinned by
   `QA head: <current-full-sha>` covering the changed behavior; a stale
   `qa-approved` label is insufficient. Preserve the existing self-QA
   exception only with its current-head PASS and eligibility evidence;
   never let self-QA answer a human-only gate. Missing evidence blocks the
   queue; do not remove a human verdict or manufacture a new one.
5. **External PR acceptance**: the PR must not carry
   `prTriage.acceptanceLabel`. Classify core vs external authors strictly by
   repository permission (`write`, `maintain` or `admin` from the
   collaborator permission API — never `author_association`, since
   `COLLABORATOR` and `MEMBER` can hold only `read` or `triage`; fail closed
   when permission cannot be read). For any author without `write`,
   `maintain` or `admin` permission, require an `accepted` label added by a
   **human** with `write`, `maintain` or `admin` permission who is not a bot
   or the skill's account/automation identity (verified from the label's
   timeline event; fail closed when unverifiable), together with the human
   current-head approval in gate 3. Never count an `accepted` label added by
   a bot or this skill's account toward `merge-queue`; keep `review` with
   "waiting for a maintainer's acceptance and human approval".

When a gate is open, set or keep `review` and name the open gates in the
report and the label rationale: "waiting for CI", "waiting for CI on raised
labels", "waiting for current-head triage", "waiting for a human tester",
"waiting for a maintainer's acceptance". A project may also run a workflow
that removes `merge-queue` when a blocking label appears later; this skill
does not rely on it.

## Automerge proposal

A PR that passes every gate, carries the lowest risk label, needs no human
tester, and is a small fix with a test gets the line "Proposed for
automerge" and the reason in the report. Adding the automerge label stays a
person's decision.
