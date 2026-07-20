# skill-optimizer

**Lower your pipeline costs by running skills on cheaper models.** Bigger models
are expensive to run at scale. `scripts/skill-optimizer.mjs` verifies a skill on
a cheaper model, measures where that model falls short of a stronger one, and
rewrites the skill text to be direct enough that the cheaper model does the job
correctly — then proves it with a side-by-side quality comparison. The headline
workflow is the **downshift**: hold a quality bar with a strong model, target a
cheaper one, and iterate the skill until the cheap model reaches parity.

It runs the skill through Claude Code headless in a throwaway sandbox, measures
the run (tokens, cost, wall time, per-step trace), **scores its quality**
(findings recall, step completion, rule violations, and — for code-modifying
skills — whether the produced change still achieves the goal), asks a second
Claude call to propose `SKILL.md` edits biased toward what the cheap model got
wrong, applies them to a **candidate copy** (never `skills/<name>`), and
re-measures — N passes. Nothing lands until you say so.

Zero npm dependencies; needs Node ≥ 20 and the `claude` CLI on `PATH`.

## The headline example — downshift to sonnet (or haiku)

```
# Can sonnet run this skill as well as opus? Optimize it until it can.
node scripts/skill-optimizer.mjs --skill om-code-review \
  --baseline-model opus --run-model sonnet --passes 3

# Aggressive savings: target haiku, analyze with opus, and A/B the result.
node scripts/skill-optimizer.mjs --skill om-code-review \
  --baseline-model opus --run-model haiku --analysis-model opus \
  --compare-models haiku,sonnet,opus --passes 3
```

`report.md` ends with a **Downshift result** verdict — either *parity reached*
(`runs on sonnet at 34% of opus cost at equal quality`) or *parity not reached*
(what still fails, plus a recommended minimum model).

`--run-model` defaults to **sonnet** — the standard optimization target.

## Hermetic by default

With no `--target-repo`, the tool generates a self-contained mock repo (see
[Evaluation repo](#evaluation-repo-hermetic-by-default)) and runs the skill
against that — a run never touches, copies, or depends on a production repo.
Point `--target-repo` at a real repo only when you accept the sandbox copy of it.

```
node scripts/skill-optimizer.mjs --skill om-code-review   # hermetic, sonnet target, 2 passes
```

## CLI

```
node scripts/skill-optimizer.mjs --skill <name> [options]
```

| Flag | Default | Meaning |
|---|---|---|
| `--skill <name>` | (required) | Directory under `skills/` to optimize. |
| `--passes N` | `2` | measure→analyze→optimize iterations. |
| `--task "<brief>"` | scenario default | Brief handed to the run (overrides a scenario goal). |
| `--target-repo <path>` | (off) | Exercise against a sandbox **copy** of a real repo. Mutually exclusive with `--mock*`. |
| `--mock [scenario]` | **default source** | Hermetic mock repo. Scenarios: `review` (default), `implement`, `mini`. |
| `--mock-spec <path>` | | Mock repo from a JSON scenario spec. |
| `--run-model <model>` | `sonnet` | **Optimization target** — the model the skill is run and measured under every pass. |
| `--analysis-model <m>` | CLI default | Model for the analyze/optimize + quality-scoring calls. |
| `--baseline-model [m]` | (off; bare = `opus`) | Measure the shipped skill under this model first; its quality is the downshift parity bar. |
| `--compare-models <l>` | (off) | After the final pass, measure the final candidate under each comma-separated model and emit a cross-model comparison. |
| `--model <model>` | | Shorthand that sets **both** run and analysis model (error if combined with either). |
| `--out <dir>` | `.ai/analysis/skill-optimizer/<skill>-<ts>/` | Artifacts dir. |
| `--mode cli\|api` | auto | Which credential the child uses (see below). |
| `--apply-final` | off | Copy the final candidate over `skills/<name>/`. |
| `--open-pr` | off | Blind-run: commit the final candidate on a fresh branch and open a PR. |
| `--help` | | Usage. |

## The two auth modes

Both modes invoke the **same** `claude` binary. `--mode` only controls whether
`ANTHROPIC_API_KEY` reaches the child process:

- **`cli`** — for local use. `ANTHROPIC_API_KEY` is *removed* from the child so
  the run uses your logged-in Claude Code subscription and the API key can never
  bill by accident.
- **`api`** — for CI. `ANTHROPIC_API_KEY` is exported into the child.

Default: `api` when `ANTHROPIC_API_KEY` is set **and** `CI=true`; otherwise
`cli`. `--mode api` errors if no key is present.

## Model targeting

Three model roles, independently settable:

- **`--run-model`** (default `sonnet`) is the *optimization target*: the model
  the skill executes under on every pass. Accepts CLI aliases (`haiku`,
  `sonnet`, `opus`) and full model ids. This is the model you want to run the
  skill on cheaply in production.
- **`--analysis-model`** (default: the CLI's configured model) runs the
  analyze/optimize and quality-scoring calls. Analyzing a weak run with a
  stronger model is the expected setup.
- **`--baseline-model`** (off unless given; bare defaults to `opus`) measures the
  *shipped* skill once, up front, to set the quality bar (see Downshift).

When the run model is cheaper than the analysis/baseline model, the optimizer
switches into **directness bias**: the analysis prompt is told its primary job
is to make the skill text robust enough that the cheap model succeeds — explicit
numbered imperatives, concrete pass/fail criteria instead of judgment calls, no
reliance on implicit repo knowledge, tighter step scoping, pre-answered edge
cases — with token trims strictly secondary to correctness.

## Quality scoring — correctness, not just cost

Every measured pass gets a **quality score** (`pass-<i>/quality.json`, a Quality
column in the report), because a cheaper/faster run is worthless if it does the
job wrong. Sources, strongest first:

1. **Findings recall/precision** — when a mock manifest is present, the analysis
   model compares the run's output against the planted findings: caught / missed
   / hallucinated → recall and precision.
2. **Step completion** — the `SKILL_STEP` markers vs the skill's documented
   workflow; skipped, aborted, or out-of-order steps are flagged.
3. **Rule violations** — anything the run did that the skill forbids (would have
   committed, skipped the validation gate, produced the wrong verdict shape).

A **quality regression** between passes is called out in `report.md` as a
regression, and the final candidate is chosen by **highest quality, not lowest
tokens** — the optimizer never silently trades correctness for cost. A poor
score is the signal that drives the next optimization round: the analysis prompt
receives the quality report and prioritizes fixing what the run model got wrong.

### Outcome equivalence for code-modifying skills

For skills whose job is to *produce a change* (om-fix, om-auto-create-pr,
om-auto-continue-pr, …), a report is not the deliverable — the code is. After
each pass the tool snapshots the skill's work product (`git diff` of the sandbox
working tree → `pass-<i>/workproduct.diff`, final text → `pass-<i>/outcome.txt`).
A non-empty diff marks the run as code-modifying, and quality scoring adds an
**outcome verdict** comparing the candidate's work product against the baseline
pass's work product and the task goal:

- `equivalent` — same behavior, goal still met.
- `improved` — better (e.g. added the missing tests).
- `degraded` — shallower: dropped tests, missing input checks, narrower
  implementation. A `degraded` verdict is a quality regression: it blocks silent
  acceptance and becomes the top fix priority for the next round.

In `--compare-models`, when work products exist, the comparison diffs the code
each model produced, so the downshift verdict rests on the actual code, not just
trace metrics.

## Comparison mode — "which model can run this skill?"

`--compare-models haiku,sonnet,opus` measures the final candidate once under
each model, then runs an analysis pass that **diffs the runs**: where the cheaper
model diverged (missed findings, skipped steps, shallower analysis, weaker code),
and whether each divergence is a **skill-text problem** (fixable by making the
skill more direct) or a **capability gap** (the model is simply too weak). Output
is `comparison.md` + a Model comparison section in `report.md`, ending with a
**recommended minimum model**.

It works **without** the optimization loop, too — pure evaluation:

```
# Which model can run the shipped skill as-is?
node scripts/skill-optimizer.mjs --skill om-code-review --passes 1 \
  --compare-models haiku,sonnet,opus
```

## Downshift verdict

When `--baseline-model` is set, the run opens with a **baseline pass** — the
*shipped* skill measured under the baseline model — whose quality score becomes
the parity bar. Every run-model pass is judged against it, and `report.md` ends
with a verdict:

- **Parity reached** — `runs on <run-model> at X% of <baseline-model> cost at
  equal quality`, with the token and cost delta.
- **Parity not reached** — what still fails and the recommended minimum model.

## Blind-run shipping: `--open-pr`

`--open-pr` lets you run the optimizer and just review a PR. After the final
pass, in the **collection repo** (never the sandbox — the sandbox stays dry) it:

1. creates branch `optimize/<skill>--<run-model>` from the current branch,
2. applies the final candidate over `skills/<name>/`,
3. runs `scripts/lint.sh`,
4. commits (`feat(<skill>): optimizer candidate for <run-model>`), pushes, and
   opens a PR against `main` with the full evidence (run config, per-pass metrics,
   finding-recall table, what the analysis proposed, downshift verdict), attaching
   `report.md` as a comment.

Safety: it **refuses on a dirty working tree**, only ever writes `skills/<name>/`
on a fresh branch, and never merges. A candidate that **breaks lint** is still
committed, but the PR is opened as a **DRAFT** with the lint failure quoted, so a
broken candidate can never look mergeable.

## Evaluation repo: hermetic by default

Two sources; the default is hermetic:

- **Mock (default).** With no `--target-repo`, the tool generates a fresh,
  self-contained fixture repo inside the sandbox. `--mock [scenario]` selects a
  built-in scenario.
- **Real-repo copy.** `--target-repo <path>` copies an existing repo into the
  sandbox (`git clone --local`, remotes stripped) and runs there.

### The mock repo

The default mock is a **small-but-real multi-file TypeScript app** — a mini
order-management domain (`types.ts`, `money.ts`, `discount.ts`, `coupons.ts`,
`orders.ts`, `api/handlers.ts`, `index.ts`) with real cross-module imports, a
`tsconfig.json`, and tests under `tests/`. It runs with **no build step and zero
dependencies** on Node's native TypeScript type-stripping (Node ≥ 23 runs
erasable-syntax `.ts` directly; the collection targets Node 24), validated by
`node --test tests/*.test.ts`. It ships a committed `.ai/agentic.config.json`
(`labels.enabled=false`, `qaGate=false`, `validation.commands=["npm test"]`,
`baseBranch=main`) and the real `.ai/trackers/github.md`, so a skill's preflight
finds a configured pipeline and never needs a live tracker. **You never have to
write a spec — the built-in scenarios are meant to be enough.**

Built-in scenarios:

- **`review`** (default) — a `feat/loyalty-pricing` branch that reworks coupon
  stacking across **several files**, with a coherent, file-attributed set of
  planted findings: a widened type in `types.ts`, an off-by-one and a dropped cap
  in `coupons.ts`, **`orders.ts` left un-updated** (the interesting cross-file
  inconsistency — `priceOrder` can now go negative), a swallowed error in
  `api/handlers.ts`, and missing tests. Scored by finding recall. The flaws are
  latent (they pass the existing tests), so a real review is needed to catch them.
- **`implement`** — ships the correct app on `main` plus a `task/currency-rounding`
  branch and a multi-file **goal** ("add banker's rounding to `money.ts` and
  thread it through `discount.ts` and `orders.ts`, with tests") plus a manifest of
  required **outcome properties**. For code-modifying skills; scored by outcome
  equivalence against those properties.
- **`mini`** — the original tiny single-file JS fixture (one buggy `coupons.js` +
  a basic test). Fast and cheap — for smoke-testing the optimizer itself / CI.

The planted findings / outcome properties are recorded in `.mock-manifest.json`
inside the sandbox (git-ignored, so they never appear in the diff the skill
reviews) and echoed into `report.md` + `mock-manifest.json` in the out dir.

### Custom scenarios: `--mock-spec <path.json>`

Custom scenarios are **optional** — the built-in defaults are the intended
experience. When you do want one, a spec layers files/branches on a base app
(TypeScript by default) and can carry its own run `task`:

```json
{
  "name": "rounding-eval",
  "base": "ts",
  "task": "Add a formatMoney() to money.ts and use it in api/handlers.ts, with tests.",
  "goal": "Money is formatted through one helper; handler returns a formatted string.",
  "outcomeProperties": ["money.ts exports formatMoney", "handlers.ts uses it", "tests cover formatting"],
  "files": {
    "src/notes.ts": "export const OWNER = 'orders-team'\n"
  },
  "branches": [
    { "name": "task/format-money", "commitMessage": "chore: scaffold", "files": {} }
  ]
}
```

```
node scripts/skill-optimizer.mjs --skill om-fix --mock-spec ./my-scenario.json
```

Schema:

- `base` (optional, `"ts"` (default) | `"mini"`) — which built-in base app the
  spec layers on.
- `name` (optional) — scenario label used in the report/manifest.
- `task` (optional) — the brief handed to the run (falls back to `goal`, then a
  generic brief). `--task` on the CLI still overrides it.
- `goal` / `outcomeProperties` (optional) — the goal and the properties the
  outcome is scored against.
- `files` (optional) — `path → content`, layered on the base app on `main`.
- `branches` (required, non-empty) — each `{ name` (required, no whitespace,
  unique)`, files?`, `commitMessage?`, `plantedFindings?` `}`. A branch with no
  `files` stays even with `main`, so the skill's own edits become the diff. The
  run is left checked out on the **last** branch.

Invalid shapes fail fast with a specific message.

## The dry-run safety model

Every skill run is side-effect-free by construction — belt *and* braces:

1. **Sandbox, never the real repo.** Default source is a generated mock; a
   `--target-repo` is *copied* (remotes stripped). The skill may edit the sandbox
   working tree (that is the measured work product for code-modifying skills) but
   never the original.
2. **No push target.** Every git remote is stripped from the sandbox.
3. **Tool restrictions.** `--permission-mode dontAsk` with `--disallowedTools`
   covering `Bash(git push:*)`, `Bash(git commit:*)`, `Bash(gh:*)` — no push, no
   commit, no `gh`/tracker mutation.
4. **No tokens in the child.** `GH_TOKEN`/`GITHUB_TOKEN` removed from the child
   env (and in `cli` mode, `ANTHROPIC_API_KEY` too).
5. **Prompt-level rules.** The run prompt forbids committing/pushing and any
   issue/PR/tracker mutation — describe, don't perform.

The analysis prompt carries a hard rule: **do not optimize for sandbox quirks** —
proposed edits must be correct in real environments; weakening tracker
integration or dropping a step because the sandbox denied it is forbidden.

Candidate edits are applied **only** to the copy in the out dir. `skills/<name>`
is touched only with `--apply-final` or `--open-pr` (on a fresh branch). Every
proposed `SKILL.md` edit passes the same body-budget guard as the lint gate
(keeps frontmatter `name`/`description`, stays under 20000 bytes) or is rejected
and noted.

## Artifacts layout

```
<out>/
  report.md                 # summary: metrics, quality, downshift verdict, comparison, diff
  comparison.md             # (--compare-models) cross-model table + divergence analysis
  mock-manifest.json        # (mock runs) scenario, goal, planted findings / outcome props
  candidate-current/  candidate-pass-<i>/  final-candidate/
  baseline/                 # (--baseline-model) the baseline measurement
  pass-<i>/  compare-<model>/
    run-prompt.txt  transcript.jsonl  metrics.json  skill-candidate/
    workproduct.diff  outcome.txt        # what the skill produced
    quality-prompt.txt  quality.json     # the quality score
    analysis-prompt.txt  analysis.json   # (passes < N) proposed changes
```

## How to read the report

- **Downshift result / Model comparison** (top / bottom) — the bottom line: does
  the cheap model run the skill, at what cost, and what is the minimum model.
- **Per-pass metrics** — tokens, wall, cost, and the **Quality** and **Recall**
  columns. Trust the quality column over raw token deltas.
- **Quality regressions** — called out explicitly; the final candidate is the
  highest-quality one.
- **Per-pass quality** — caught/missed/hallucinated findings, step completion,
  rule violations, outcome verdict.
- **What changed each round** — the analysis call's quality fixes, ambiguities,
  and applied vs rejected edits.
- **Final candidate diff** — `diff -ru` vs the shipped skill; what `--apply-final`
  / `--open-pr` would write.

## Run it in CI (workflow_dispatch)

`.github/workflows/skill-optimizer.yml`:

1. Actions → **skill-optimizer** → *Run workflow*.
2. Inputs: `skill` (required), `passes` (default `2`), `mock` (`review` |
   `implement` | `mini`), `run_model` (default `sonnet`), `analysis_model`
   (optional), `open_pr` (boolean), `task` (optional).
3. Installs `@anthropic-ai/claude-code`, runs with `--mode api` using the
   `ANTHROPIC_API_KEY` secret, and uploads the out dir as an artifact. With
   `open_pr` it opens a PR using the workflow token.

## Notes and limitations

- **Candidate precedence.** The candidate is installed at project scope
  (`<sandbox>/.claude/skills/<name>/`), which takes precedence over a user-level
  copy. If your environment loads skills differently, verify the sandbox copy is
  the one exercised.
- **Measurement is noisy.** Wall time and tokens vary run to run. Trust the
  quality column and structural changes over small deltas.
- **Per-step attribution is approximate.** When the model emits step markers in
  one batch, per-step tool/token counts are redistributed and flagged (`markers
  batched`); run totals and cost come from the run `result` event and are exact.
- **Quality scoring is an LLM judgment.** Recall/precision and the composite
  score are computed deterministically from the analysis model's finding lists,
  but those lists are still a model's read — spot-check the per-pass detail.
