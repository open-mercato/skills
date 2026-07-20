# skill-optimizer

`scripts/skill-optimizer.mjs` measures a skill by running it and then tries to
make it better — automatically. It runs a skill through Claude Code in headless
mode inside a throwaway sandbox, reads the run's stream-json trace to measure it
(per-step wall time, tool calls, tokens, plus run totals and cost), asks a
second headless Claude call to propose `SKILL.md` edits, applies them to a
**candidate copy** (never to `skills/<name>` in the repo), and re-runs — for N
passes. You get a report, per-pass metrics, and a diff to review. Nothing lands
until you say so.

It has zero npm dependencies and needs Node ≥ 20 and the `claude` CLI on `PATH`.

## What one run looks like

```
node scripts/skill-optimizer.mjs --skill om-fix --passes 2
```

- **Pass 1** installs the *shipped* skill into a sandbox and measures a dry-run.
- Between passes, the analysis call proposes edits; guarded ones are applied to
  a fresh candidate.
- **Pass 2** measures the *candidate*. With `--passes N` you get N runs and N−1
  optimization rounds (pass N always ends on a measurement).

At the end you get `report.md` — a per-pass metrics table, what each round
changed and why, and `diff -ru` of the final candidate vs the shipped skill.

## CLI

```
node scripts/skill-optimizer.mjs --skill <name> [options]
```

| Flag | Default | Meaning |
|---|---|---|
| `--skill <name>` | (required) | Directory under `skills/` to optimize. |
| `--passes N` | `2` | measure→analyze→optimize iterations. |
| `--task "<brief>"` | canned dry-run brief | Scenario handed to the run. |
| `--target-repo <path>` | this repo | Repo the skill is exercised against. |
| `--model <model>` | CLI default | Model for both the run and analysis calls. |
| `--out <dir>` | `.ai/analysis/skill-optimizer/<skill>-<ts>/` | Artifacts dir. |
| `--mode cli\|api` | auto (see below) | Which credential the child uses. |
| `--apply-final` | off | Copy the final candidate over `skills/<name>/`. |
| `--help` | | Usage. |

## The two auth modes

Both modes invoke the **same** `claude` binary. `--mode` only controls whether
`ANTHROPIC_API_KEY` reaches the child process:

- **`cli`** — for local use. `ANTHROPIC_API_KEY` is *removed* from the child
  environment so the run uses your logged-in Claude Code subscription and the
  API key can never bill by accident.
- **`api`** — for CI. `ANTHROPIC_API_KEY` is exported into the child.

Default: `api` when `ANTHROPIC_API_KEY` is set **and** `CI=true`; otherwise
`cli`. `--mode api` errors if no key is present.

## The dry-run safety model

Every skill run is side-effect-free by construction — belt *and* braces:

1. **Sandbox, never the real repo.** `--target-repo` is copied into a temp
   sandbox (`git clone --local` for a repo, or `cp` + fresh `git init`
   otherwise). The skill runs there.
2. **No push target.** Every git remote is stripped from the sandbox, so there
   is nothing to push to even if a guard were bypassed.
3. **Tool restrictions.** The headless run is launched with
   `--permission-mode dontAsk` and `--disallowedTools` covering
   `Bash(git push:*)`, `Bash(git commit:*)`, and `Bash(gh:*)` — no push, no
   commit, no `gh`/tracker mutation.
4. **No tokens in the child.** `GH_TOKEN` and `GITHUB_TOKEN` are removed from
   the child environment (and in `cli` mode, so is `ANTHROPIC_API_KEY`).
5. **Prompt-level dry-run rules.** The run prompt tells the model to never
   commit/push and never create/edit/comment on any issue or PR — to *describe*
   what it would do instead.

Candidate edits are applied **only** to the copy in the out dir. `skills/<name>`
in your checkout is touched only when you pass `--apply-final`, and only after
you have seen the report and diff. Every proposed `SKILL.md` edit is also passed
through the same body-budget guard the lint gate uses: it must keep the
frontmatter `name`/`description` and stay under 20000 bytes, or the change is
rejected and noted in the report.

## Artifacts layout

```
<out>/
  report.md                 # human-readable summary + final diff
  candidate-current/        # working candidate (pass 1 = shipped skill)
  candidate-pass-<i>/        # candidate produced for pass i
  final-candidate/          # the last measured skill version
  pass-<i>/
    run-prompt.txt          # exact prompt used for the run
    transcript.jsonl        # raw stream-json from the headless run
    metrics.json            # parsed per-step + totals + SKILL_TRACE
    skill-candidate/        # the exact skill version measured this pass
    analysis-prompt.txt     # (passes < N) prompt sent to the analysis call
    analysis.json           # (passes < N) proposed changes + rationale
```

## How to read the report

- **Per-pass metrics** — watch tokens, wall time, tool calls, and step count
  trend down across passes. A pass that regresses (or errors) is a signal the
  proposed edit hurt; the candidate diff shows exactly what changed.
- **Per-pass step breakdown** — the `SKILL_STEP_*` markers the run emits, timed
  and attributed. Long or tool-heavy steps are the optimization targets.
- **What changed each round** — the analysis call's bottlenecks, redundant work,
  ambiguities, and which edits were applied vs rejected by the guard.
- **Final candidate diff** — `diff -ru` of `final-candidate/` vs the shipped
  skill. This is what `--apply-final` would write.

## Run it in CI (workflow_dispatch)

`.github/workflows/skill-optimizer.yml` runs the loop on demand:

1. Actions → **skill-optimizer** → *Run workflow*.
2. Inputs: `skill` (required), `passes` (default `2`), `task` (optional).
3. It installs `@anthropic-ai/claude-code`, runs with `--mode api` using the
   `ANTHROPIC_API_KEY` secret, and uploads the out dir as an artifact.

The workflow never commits results — download the artifact, read `report.md`,
and open a normal PR if you want to adopt a change.

## Notes and limitations

- **Candidate precedence.** The candidate is installed at project scope
  (`<sandbox>/.claude/skills/<name>/`), which takes precedence over any
  user-level (`~/.claude/skills`) copy of the same skill. If your environment
  loads the skill some other way, verify the sandbox copy is the one exercised.
- **Measurement is noisy.** Wall time and tokens vary run to run (caching,
  model load, tool latency). Treat single-digit-percent moves as noise; look for
  clear trends and structural changes (fewer steps, fewer tool calls).
- **Per-step tokens are approximate.** They attribute assistant output tokens to
  the open step from the stream; totals and cost come from the run's `result`
  event and are exact.
- **The analysis call can be conservative.** If it proposes nothing (or every
  change fails the guard), the candidate is carried forward unchanged and the
  next pass simply re-measures.
