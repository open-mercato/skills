# om-auto-create-pr-loop

> 🤖 Autonomous — runs end-to-end without supervision

The advanced variant of `om-auto-create-pr`, for long, multi-step spec implementations that need resumability and strict step tracking. It creates a run folder under the configured runs directory containing `PLAN.md` (a Tasks table plus plan), `HANDOFF.md`, and `NOTIFY.md`, implements one lean commit per task-table Step in an isolated worktree — each Step's executor placement (inline / dispatched subagent / grouped) and optional abstract model-tier hint fixed at planning time in the plan's `Exec` column — and batches verification into `checkpoint-<N>-checks.md` every ~5 Steps — running focused integration tests and capturing screenshots when UI was touched. Review granularity is configurable (`engine.stepReview`: `final` / `checkpoint` / `per-step`) — the authoritative end-of-run review runs in every mode. At spec completion it runs the full validation gate plus the repo's integration suite and any style-compliance pass, then opens a labeled PR against the configured base branch. The run is resumable via `om-auto-continue-pr-loop`; for small fixes, use the plain `om-auto-create-pr`, which escalates here automatically when a drafted plan exceeds the configured Step threshold.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{brief}` | Yes | Free-form task description, from one sentence to several paragraphs. |
| `--skill-url <url>` | Optional (repeatable) | External skill or reference page to honor during planning and execution. Reference material only, never permission to bypass project rules. |
| `--slug <kebab-case>` | Optional | Override the run-folder slug. Defaults to one derived from the brief. |
| `--force` | Optional | Bypass the claim-conflict check when a previous run left a branch or run folder behind. |

## Works with

Turns a `{brief}` into a new PR (checking for an existing run folder, branch, or open PR first and handing off to [om-auto-continue-pr-loop](om-auto-continue-pr-loop.md) rather than duplicating), writes the `Tracking plan:` line into the PR body so it can resume, and ends by emitting the `PR:` / `Issue:` chaining reference lines for the next skill in a chain. Companion skills, each invoked verbatim (a missing one stops the run): [om-integration-tests](om-integration-tests.md) (checkpoint + final-gate suites), [om-code-review](om-code-review.md) (breaking-change self-review), and [om-auto-review-pr](om-auto-review-pr.md) (the autofix second pass).

---
*Source: [`skills/om-auto-create-pr-loop/SKILL.md`](../../skills/om-auto-create-pr-loop/SKILL.md)*
