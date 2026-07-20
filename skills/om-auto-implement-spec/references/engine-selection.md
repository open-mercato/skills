# Choosing the implementation engine — continue vs continue-loop

How `om-auto-implement-spec` step 2 picks the engine when a spec PR already exists, and why implementation is then a **continuation** rather than a fresh `om-auto-create-pr` run.

## Why continuation, not a new create-pr run

`om-auto-create-pr` opens a **new** PR as part of its flow. When a spec PR already exists (from `om-auto-write-spec`), running a fresh `om-auto-create-pr` on top would open a **second** PR for the same work — the collision this design avoids. The continue skills (`om-auto-continue-pr`, `om-auto-continue-pr-loop`) resume from a tracking plan **on the existing PR** and reuse the identical implement → validate → self-review → `om-auto-review-pr` loop → label → summary machinery, without opening anything new.

(The commit/push/label mechanics inside those skills follow the shared contract in `references/pr-finalize.md`: prefer `om-open-pr` when installed, inline otherwise, and never open a duplicate PR.)

## The choice

Read the spec's **Implementation Plan** (Phases → Steps) and pick:

- **`om-auto-continue-pr`** — the default. Use it for an ordinary spec: a handful of phases, a bounded number of steps, no need for mid-run checkpoints. Write the standard Progress-checklist plan (the format it parses) so it resumes from the first unchecked step and drives to `complete`.
- **`om-auto-continue-pr-loop`** — for a **large, many-step** spec where resumability and strict step tracking matter: many phases/steps (roughly >8–10), UI work needing screenshots, or a plan that will not finish in one pass. It expects the **run-folder** format (`PLAN.md` Tasks table + `HANDOFF.md`/`NOTIFY.md`) that `om-auto-create-pr-loop` writes and checkpoints every ~5 steps.

## Consequence for the plan format

Decide the engine **before** committing the plan, because the two engines consume different plan formats: plain continue → the standard Progress-tracked execution plan (per `om-auto-create-pr` step 3); continue-loop → the run-folder in `om-auto-create-pr-loop`'s format, derived from the spec's phases and steps.

When in doubt, prefer the plain `om-auto-continue-pr` engine — the loop variant is justified by scale, not used by default.
