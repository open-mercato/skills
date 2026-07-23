# Choosing the implementation engine — plain vs loop, create vs continue

How `om-auto-implement-spec` step 2 picks the engine. Two independent axes:
**create vs continue** is decided by whether a spec PR already exists (continuation, never a second PR); **plain vs loop** is decided by the deterministic rule below — the same rule applies on both sides, so a qualifying spec gets the loop engine whether it starts fresh (`om-auto-create-pr-loop`) or continues a spec PR (`om-auto-continue-pr-loop`). This is also the path an issue takes through `om-auto-fix-issue`'s feature route, so the rule applies there automatically (that route forwards `--loop` only when the user passed it to `om-auto-fix-issue`; it never adds it on its own).

## Why continuation, not a new create-pr run

`om-auto-create-pr` opens a **new** PR as part of its flow. When a spec PR already exists (from `om-auto-write-spec`), running a fresh `om-auto-create-pr` on top would open a **second** PR for the same work — the collision this design avoids. The continue skills (`om-auto-continue-pr`, `om-auto-continue-pr-loop`) resume from a tracking plan **on the existing PR** and reuse the identical implement → validate → `om-auto-review-pr` review/autofix loop → label → summary machinery, without opening anything new.

(The commit/push/label mechanics inside those skills follow the shared contract in `references/pr-finalize.md`: prefer `om-open-pr` when installed, inline otherwise, and never open a duplicate PR.)

## The choice: plain unless the loop is earned

The **plain engine** (`om-auto-continue-pr` when a spec PR exists, `om-auto-create-pr` when not) is the default — always. The loop engine's run-folder ceremony (PLAN/HANDOFF/NOTIFY, per-step commits, checkpoints) costs several times the tokens of a plain run, so it must be earned, never assumed.

Select the **loop engine** (`om-auto-continue-pr-loop` when a spec PR exists, `om-auto-create-pr-loop` when not) only when at least one holds:

1. **`--loop` was passed** — by the user directly, or forwarded verbatim by a routing skill (e.g. `om-auto-fix-issue`) from the user's own invocation. The user explicitly bought the loop's resumability and checkpoint discipline; routing skills never add the flag on their own.
2. **The plan exceeds 20 Steps.** Count the Steps (not Phases) in the spec's Implementation Plan — the same items that become the plan's checklist/Tasks rows. More than 20 → loop.

Nothing else selects the loop: not UI work (the plain engines post screenshots via `om-auto-qa-pr` / **attach-image-evidence**), not "might not finish in one pass" (`om-auto-continue-pr` resumes a plain run fine), not subjective "feels large". If the count is ambiguous (the spec lacks a step breakdown), draft the plan first, count its Steps, then decide.

State the decision in one line in the run report and PR summary comment: `Engine: <name> (steps: <N>, --loop: <yes|no>)`.

## Consequence for the plan format

Decide the engine **before** committing the plan, because the two engines consume different plan formats: plain → the standard Progress-tracked execution plan (per `om-auto-create-pr` step 3); loop → the run-folder in `om-auto-create-pr-loop`'s format (`PLAN.md` Tasks table + `HANDOFF.md`/`NOTIFY.md`), derived from the spec's phases and steps.
