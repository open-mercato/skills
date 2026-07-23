# Choosing the implementation engine — plain vs loop, create vs continue

How `om-auto-implement-spec` step 2 picks the engine. Two independent axes:
**create vs continue** — decided by whether an **implementation PR** already exists for the spec (resume it, never a second one); **plain vs loop** — decided by the deterministic rule below, applied the same on both sides. `om-auto-fix-issue`'s feature route follows this rule too (it forwards `--loop` only when the user passed it; it never adds it on its own).

## Why a separate implementation PR, never the spec PR's branch

PRs stay **atomic**: a spec PR is a design deliverable — reviewed as a specification, merged as documentation. Implementation always ships on its **own PR** (`Refs #{specPr}` + the `Source doc:` line), and "continue" means resuming that implementation PR — found via **search-prs** by the `Source doc:`/`Refs` linkage — never the spec PR. (Commit/push/label mechanics inside the engines follow `references/pr-finalize.md`.)

## The choice: plain unless the loop is earned

The **plain engine** (`om-auto-continue-pr` when an implementation PR exists, `om-auto-create-pr` when not) is the default — always. The loop engine's run-folder ceremony (PLAN/HANDOFF/NOTIFY, per-step commits, checkpoints) costs several times the tokens of a plain run, so it must be earned.

Select the **loop engine** (`om-auto-continue-pr-loop` when an implementation PR exists, `om-auto-create-pr-loop` when not) only when at least one holds:

1. **`--loop` was passed** — by the user directly, or forwarded verbatim by a routing skill (e.g. `om-auto-fix-issue`); routing skills never add the flag on their own.
2. **The plan exceeds 20 Steps.** Count the Steps (not Phases) in the spec's Implementation Plan — the same items that become the plan's checklist/Tasks rows. More than 20 → loop.

Nothing else selects the loop: not UI work (plain engines post screenshots via `om-auto-qa-pr` / **attach-image-evidence**), not "might not finish in one pass" (`om-auto-continue-pr` resumes a plain run fine), not subjective "feels large". If the count is ambiguous (no step breakdown in the spec), draft the plan first, count its Steps, then decide.

State the decision in one line in the run report and PR summary comment: `Engine: <name> (steps: <N>, --loop: <yes|no>)`.

## Consequence for the plan format

Decide the engine **before** committing the plan, because the two engines consume different plan formats: plain → the standard Progress-tracked execution plan (per `om-auto-create-pr` step 3); loop → the run-folder in `om-auto-create-pr-loop`'s format (`PLAN.md` Tasks table + `HANDOFF.md`/`NOTIFY.md`), derived from the spec's phases and steps.
