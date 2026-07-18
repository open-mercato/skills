# Choosing the implementation engine — continue vs continue-loop

How `om-auto-implement-issue` step 5 picks the engine that implements the spec, and
why implementation is a **continuation** rather than a fresh `om-auto-create-pr`
run.

## Why continuation, not a new create-pr run

`om-auto-create-pr` opens a **new** PR as part of its flow. This skill has already
opened a PR in step 4 (the spec-first PR) and written its tracking plan. Running a
fresh `om-auto-create-pr` on top would open a **second** PR for the same work — the
collision this design avoids. The continue skills (`om-auto-continue-pr`,
`om-auto-continue-pr-loop`) resume from a tracking plan **on the existing PR** and
reuse the identical implement → validate → self-review → `om-auto-review-pr` loop →
label → summary machinery, without opening anything new. So implementation is
always a continuation of the spec PR.

(The commit/push/label mechanics inside those skills follow
`om-auto-create-pr/references/pr-open-reuse.md`: prefer `om-open-pr` when installed,
inline otherwise, and never open a duplicate PR.)

## The choice

Read the spec's **Implementation Plan** (Phases → Steps) and pick:

- **`om-auto-continue-pr`** — the default. Use it for an ordinary spec: a handful of
  phases, a bounded number of steps, no need for mid-run checkpoints. Step 4 wrote a
  standard Progress-checklist plan (the format `om-auto-continue-pr` parses), so it
  resumes from the first unchecked step and drives to `complete`.
- **`om-auto-continue-pr-loop`** — for a **large, many-step** spec where resumability
  and strict step tracking matter: many phases/steps (roughly >8–10 steps), UI work
  needing screenshots, or a plan that will not finish in one pass. It expects the
  **run-folder** format (`PLAN.md` Tasks table + `HANDOFF.md`/`NOTIFY.md`) that
  `om-auto-create-pr-loop` writes and checkpoints every ~5 steps.

## Consequence for step 4's plan format

Decide the engine **before** writing the plan in step 4, because the two engines
consume different plan formats:

- Choosing `om-auto-continue-pr` → write the standard Progress-tracked execution
  plan (per `om-auto-create-pr` step 3 / `references/spec-first-flow.md`).
- Choosing `om-auto-continue-pr-loop` → write the run-folder instead, in the format
  `om-auto-create-pr-loop` defines (its `PLAN.md`/`HANDOFF.md`/`NOTIFY.md`), derived
  from the spec's phases and steps.

When in doubt, prefer the plain `om-auto-continue-pr` engine — the loop variant is
justified by scale, not used by default.
