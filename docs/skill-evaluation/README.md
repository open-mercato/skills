# Evaluate one skill at a time

The dependency-free Node CLI compares two Git revisions of any skill against the
same frozen cases, model and reasoning effort. Cases supply a task and local
evidence; the runner has no GitHub or PR schema. A PR replay is one adapter.

Start with a baseline, make one instruction change on another commit, run both,
and inspect quality alongside resource use. Repeat with the next change, or select
a different skill and new cases. The harness never rewrites or promotes a skill.

## Requirements and configuration

Use Node 20 or later, Git, and an already authenticated Codex CLI that supports
`exec --ignore-user-config --ephemeral --json --sandbox read-only`. No package
installation is needed. Authentication and global skill links stay in place.
The tested CLI version was 0.163.0; other versions must support this invocation.

Copy [the experiment example](../../examples/skill-evaluation/experiment.json).
The version-1 JSON contract is:

```json
{
  "version": 1,
  "skill": {
    "name": "om-code-review",
    "repository": "../../skills-collection",
    "baseline": "BASELINE_COMMIT",
    "candidate": "CANDIDATE_COMMIT"
  },
  "models": [
    { "name": "gpt-6.1-sol", "reasoningEffort": "high" },
    { "name": "gpt-6-luna", "reasoningEffort": "high" }
  ],
  "repetitions": 3,
  "concurrency": 2,
  "order": "interleaved",
  "codex": { "executable": "codex", "timeoutSeconds": 1800 },
  "cases": [
    {
      "id": "case-001",
      "task": "Review the frozen source change. Return an evidence-backed artifact and proposed actions without publishing them.",
      "source": {
        "repository": "../../project-under-test",
        "base": "BASE_COMMIT",
        "head": "HEAD_COMMIT"
      },
      "contextDirectory": "./cases/case-001",
      "expectations": {
        "mustFind": [["missing null check", "null guard"]],
        "mustNotClaim": ["no issues found"]
      }
    }
  ]
}
```

- `skill.name`, case IDs and cohort names use letters, digits, dots, underscores
  or hyphens, starting with a letter or digit; maximum 80 characters.
- Repository and context paths are relative to the config file. Repositories
  must name local checkout roots. `source.head` is required; `base` and
  `contextDirectory` are optional. Refs resolve to immutable commit IDs at prepare
  time, so later branch movement cannot change the experiment.
- Every model needs an explicit `reasoningEffort`: `none`, `minimal`, `low`,
  `medium`, `high` or `xhigh`. The selected model must support that effort.
- `repetitions` defaults to 1 (range 1–100); use at least 3. One repetition gives
  a single sample per pair, so no dispersion can be estimated within a case and
  `report.md` prints an explicit warning. `concurrency` defaults to 1 (1–32) and
  runs independent trials side by side, with the same assigned model/effort per pair.
- `order` sets the run order: `baseline-first` (default — every baseline trial
  finishes before any candidate trial starts), `interleaved` (ABBA: even pairs
  run baseline first, odd pairs candidate first, with no phase barrier) or
  `random` (a seeded shuffle of all trials). `seed` (integer 0–4294967295) applies
  only to `random`; when omitted, prepare picks one. The seed is recorded in
  `manifest.json` and the reports, so the order is reproducible. Baseline-first
  order systematically biases `elapsedSeconds` and `cachedInputTokens`; total
  tokens are unaffected because input tokens already include cached input.
- `expectations` (optional, per case) pre-registers quality checks before the
  run: `mustFind` and `mustNotClaim` list phrases, and an entry may be a list of
  alternative phrases. Matching is literal and case-insensitive over every string
  in the artifact, with whitespace collapsed. A trial passes when every `mustFind`
  entry matches and no `mustNotClaim` entry does. Expectations are frozen in the
  manifest, never shown to the worker, and reported as paired pass rates. They
  are phrase checks, not semantic judgments; keep subtler quality questions for
  blinded assessments.
- `codex.executable` defaults to `codex` on PATH. A path containing a separator is
  resolved relative to the config. `timeoutSeconds` defaults to 1800 (1–86400).
- Context directories must contain ordinary files/directories, with no symlinks.
  Source worktrees may contain symlinks resolving inside the frozen inputs;
  escaping or dangling links fail preparation. Skill collection snapshots reject
  symlinks and submodules. Submodule contents are not initialized automatically.

The config, context and source repositories are local trusted experiment inputs.
Their task text and code remain untrusted material for the worker. Do not place
credentials or irrelevant private files in frozen context.

## Prepare, execute and report

Choose a new output directory whose parent exists, outside the input repositories,
context directories and config directory. A sibling directory works:

```sh
node scripts/skill-eval.mjs prepare --config /tmp/study-inputs/experiment.json --out /tmp/study-run
node scripts/skill-eval.mjs run --out /tmp/study-run
node scripts/skill-eval.mjs run --out /tmp/study-run --execute
node scripts/skill-eval.mjs report --out /tmp/study-run
```

`prepare` archives both complete `skills/` collections from Git under opaque
per-run directory names (`inputs/variants/<random>`), so neither the worker
prompt nor any path a worker cites names its arm; only `manifest.json` and the
private blinding key map arms to directories. It also creates
detached base/head worktrees per case. Worktree registration changes Git's common
metadata; the original checkouts, branches, tracked files and global installed
skills are untouched. The evaluated task cannot write to the worktrees. A failed
preparation removes only worktrees/directories created by that preparation.

`run` prints a dry plan unless `--execute` is explicit. Its `commandArgv` array
contains the absolute Node executable, absolute CLI entrypoint and separate
arguments. Invoke it with an argument-array process API, such as
`execFile(commandArgv[0], commandArgv.slice(1))`; do not join it into shell text.
Paths containing spaces, dollar substitutions or backticks remain literal data.
Each trial starts a new
ephemeral Codex process, closes stdin, uses argument arrays without a shell, and
enforces the read-only sandbox. The prompt names the assigned pinned collection,
applies repository-local override extensions and AGENTS guidance, and prohibits
tracker writes, claims, installs, autofix, commits, pushes, publishing and
delegation. It restricts reads to the assigned collection, source and case
context, and never names the arm or the two-arm design. Mutating
skills can be evaluated for their proposed artifact/actions, not write side effects.
Network access is prohibited by the evaluation prompt; the Codex read-only
sandbox supplies enforcement according to the host's supported sandbox backend.
The harness never requests a sandbox bypass.

No HOME/CODEX_HOME relocation or credential copying occurs. `--ignore-user-config`
avoids user-config overrides, but ambient globally discoverable skill metadata
may remain in model context. Both variants use the same host catalog, and the
pinned skill/dependency paths are explicit. This is an evidence limit, not a
claim of a hermetic model context.

Further validity limits:

- **No delegation.** Trials forbid spawning or delegating to other agents, so all
  work is counted in one session (sub-agent tokens would not appear in the
  stream). A skill whose procedure delegates — per-item sub-agents, a
  fresh-context challenger, a `--subagents` mode — is therefore measured running
  a single-agent variant of its procedure, not the procedure it ships.
- **Execution, not triggering.** The prompt names the assigned `SKILL.md` path
  directly. Trials measure how a skill executes once chosen, not whether its
  `description` would make an agent pick it.
- **One backend.** Codex CLI is the only execution backend. The same skill can
  behave differently in another harness.

The generic final result is either plain artifact text or a JSON object:

```json
{
  "artifactText": "The generated description or other requested artifact.",
  "verdict": "optional case-specific verdict",
  "findings": [],
  "proposedActions": [],
  "evidence": [],
  "limitations": []
}
```

Only `artifactText` is required for the structured form. Array contents are
case-specific; the core does not impose a review finding or tracker action schema.
Workers return results on stdout, so they do not need writable output directories.

`manifest.json` contains pinned revisions, paths and the frozen-input digest.
`environment.json` records CLI/Node/platform versions, the helper-source digest
and execution limitations. Each private `trials/<id>/attempt-N/` keeps metadata,
stdout JSONL, stderr and its result. A model identity found in explicit local
metadata must match the requested model; absence is labelled `requested-only`.
The controller does not claim that the provider resolved a model alias to a
specific model revision when no such metadata exists.

## Resume and failures

Repeat `run --out ... --execute` to skip existing CLI attempts. Failed, partial,
timed-out and interrupted attempts are preserved and skipped too. Add
`--retry-failed` to create new numbered attempts for those trials. Completed trials
are never silently rerun. Reports retain every attempt and use the latest attempt
within each trial/cohort for paired comparisons.

Frozen input or manifest changes reject execution. Resume also rejects changed
Codex version, Node/platform or helper-source digest; prepare a new experiment
when changing the executor. Source refs and original context are not reloaded.
Execution, native import and cleanup acquire the same exclusive `.running`
writer lock. Ownership and frozen inputs are checked again inside the lock before
execution/import. Cleanup checks ownership inside its lock and can remove owned
snapshots even when their contents have drifted. A competing writer fails without
removing the current writer's lock.
SIGINT/SIGTERM stop current workers and preserve evidence. An abrupt host crash or
SIGKILL can leave `.running`; after verifying its recorded process has ended,
remove that stale lock explicitly before resuming. Never remove an active lock.
If disk/process failures prevent a result file, reports expose the trial metadata
as interrupted. Raw partial stdout stays available for local diagnosis. Attempt
directories are created atomically: the first metadata file is written into a
temporary directory that is then renamed into place, so a crash never leaves an
`attempt-N` without metadata. An empty attempt directory from an older harness
is still reported as interrupted (with `metadataMissing: true`) and treated as an
interrupted CLI attempt on resume: skipped, or retried with `--retry-failed`.

After every trial the runner checks only what that trial could read: the
assigned collection and the case context by digest, and the case's source
worktrees by `HEAD` plus an empty `git status`. Any change records the attempt as
`input-drift` and stops the run. Each `run`, `import` and `report` start still
hashes the whole frozen input tree.

`report` takes no lock. When `.running` exists it warns that a writer may be
active and that in-flight trials appear as interrupted; re-run it afterwards.

## Metrics and generated descriptions

`reports/report.json`, `pairs.csv` and `report.md` provide per-trial results, paired
deltas and per-model/per-case aggregates. Only completed pairs enter the deltas,
intervals and expectation pass rates. So that failures cannot quietly leave the
comparison, every aggregate also carries:

- `incompleteByArm`: incomplete pairs split by which arm did not complete
  (baseline only, candidate only, both).
- `guardrails.<arm>`: counts by status over **all** recorded attempts, retried
  failures included, plus the tokens and seconds spent on attempts that did not
  complete (`nonCompleted`, with counts of attempts whose cost is unknown).
- `statistics.<measurement>`: the mean, sample SD and a 95% t interval of the
  paired deltas. When the aggregate pools two or more cases, the interval is
  clustered by case (a t interval over per-case mean deltas, each case weighted
  equally); within one case it covers the pair deltas. It needs at least two
  cases or two complete pairs.
- `expectations` (when cases define them): judged complete pairs, per-arm pass
  counts, the paired split (both, baseline only, candidate only, neither) and
  pass^k — the share of cases whose every one of k repetitions passed, counting
  missing or failed trials as failures.

`report.md` shows these as columns and prints warnings (single repetition,
active writer lock) at the top; `report.json` lists them under `warnings`.
CLI comparisons cover every expected manifest pair, including missing/missing
trials that never started; those pairs count as incomplete. Native cohorts cover
only pairs with an imported attempt. `cohortScopes` records that distinction.
Unknown values stay null/empty/unknown; a failed trial is never interpreted as
zero-cost success. CLI tool counts count each completed invocation item ID once,
including failed command executions. Agent messages have a separate count.

Input tokens include cached input; output tokens include any reported reasoning
subset. Total is input plus output, never input plus cached input plus output plus
reasoning. Available cached-input, cache-write and reasoning counts are shown
separately; unsupported fields stay unknown. Usage from completed turns is kept
even when a later failure interrupts the worker. A CLI that does not emit partial
turn usage cannot supply that missing cost.

Descriptions appear side by side in Markdown and in full in JSON. Word and UTF-8
byte counts describe output size. Sentence lengths and semicolon counts are
explicitly heuristic: code blocks, headings and pipe-table rows are excluded;
link labels remain and inline code becomes one identifier. The mean, maximum and
individual sentence word counts use a simple punctuation split, not a
language-standard parser. Shorter text is
not automatically better; check whether evidence, qualifications and decisions
survived. More findings are not automatically higher quality either.

All reports stay local. Raw streams, error text, personal source paths and auth
configuration are not copied into exports. Generated artifacts themselves can
contain sensitive source details, so review any report before sharing it.
`judge/blinded-artifacts.json` is the only file in its directory, so the folder can
be handed to a judge on its own. It omits variant/model provenance and randomizes artifact
order by opaque run-specific IDs. Results, report JSON/CSV and blinded artifacts
expose `artifactDigest`, a SHA-256 over the complete parsed artifact with sorted
object keys. Text, structured findings/actions, array order and qualifications
all participate in the digest. Legacy results without this field receive a
derived digest when reporting; stored results are never rewritten. The key is
written to `private/blinding-key.private.json`. Keep it, and every file in
`reports/` (each one identifies the arms), away from the judge. Redact
self-identification inside generated text if needed before judging. Reports from
older harness versions placed both files in `reports/`; re-running `report`
removes those copies.

Optional manual/reference assessments keep quality separate from measured cost:
copy [the assessment example](../../examples/skill-evaluation/assessments.json)
and replace its trial identity, digest and judgment with reviewed evidence.

```json
{
  "version": 1,
  "assessments": [
    {
      "trialId": "m0-case-001-r1-candidate",
      "cohort": "cli",
      "artifactDigest": "<copy the exact artifact digest from report.json or the private blinding key>",
      "qualityScore": 4,
      "scale": "1–5, reviewer-defined retained-detail rubric",
      "notes": "Retained the compatibility and CI qualifications."
    }
  ]
}
```

Pass it to `report --assessments FILE`. Every assessment, including notes-only
assessments, requires the exact artifact digest. The report rejects a stale
assessment when the latest retry or native reimport has a different artifact;
reassess that artifact before applying a score. An unchanged artifact can retain
its assessment. Blinded IDs change when their artifact changes. Notes need no
numeric score; numeric scores require an explicit scale. The harness does not
invent prices, precision, recall
or ground truth. Baseline-first order can favor warm caches; use `interleaved` or
`random` order, at least 3 repetitions, real cases and independently judged
quality before interpreting savings.

## Import an explicit native session

Native trials are a separate backend/cohort and are never pooled with CLI costs.
Each imported result and import reply records its numbered `attempt`; assessment
identity still binds to the full artifact digest, so an unchanged artifact can
retain its judgment:

```sh
node scripts/skill-eval.mjs import --out /tmp/study-run --session /tmp/selected-trial.jsonl --pair m0-case-001-r1 --variant baseline --model gpt-6.1-sol --effort high --cohort native-pilot --artifact /tmp/selected-artifact.txt
node scripts/skill-eval.mjs report --out /tmp/study-run
```

Imports use the same exclusive writer lock as execution. Wait for active trials
to finish before importing sessions into that run. Invalid input files do not
create an attempt or replace an earlier result.

Only the explicitly supplied session file is read; the harness never searches
private session directories and never copies the raw session into reports. It
deduplicates `token_usage_record` usage by response ID. When those records are
absent, it uses the last `event_msg` token-count cumulative total for the supplied
session, clearly labelled `session-cumulative`. Supply a session containing just
the intended trial; cumulative totals can include earlier session activity.
Native function/custom tool call IDs are deduplicated invocation counts, labelled
as such because the log may omit completion status. Elapsed time stays unknown.
An explicit final-answer message supplies the artifact; `--artifact` can provide
a separately reviewed artifact. Completion requires a recorded task-complete
event; a supplied artifact cannot turn a started or aborted task into a completed
trial. Recorded model and turn-context effort metadata must match `--model` and
`--effort`; absent identity/effort metadata is labelled `unverified-import`.

## Reuse for another skill

Keep model/effort/repetition settings, select another `skill.name` and its two
Git revisions, and replace case tasks/evidence. For example, evaluate
`om-root-cause` with frozen bug reports in `contextDirectory` and tasks asking for
the minimal cause/change surface. Or evaluate a specification-writing skill with
frozen product briefs and tasks asking for specification artifacts. The same
prepare/run/report commands work without a new adapter or code change.

The tests run a second unrelated skill fixture through the same contract and
check source immutability, paired accounting, failures, resume drift and cleanup:

```sh
node --test scripts/test-skill-eval.mjs
```

For PR replay, use [the adapter recipe](pr-replay.md). To release disk space while
retaining results, run `cleanup --out /tmp/study-run`. It removes only owned
worktrees/frozen inputs and keeps trial evidence/reports. Execution cannot resume
after cleanup; prepare a fresh experiment instead.

The [six-PR comparison in skills PR #140](https://github.com/open-mercato/skills/pull/140#issuecomment-6477327051)
exercised 24 real CLI trials across two skill revisions and both requested models.
Its four-run native pilot is reported separately. Execution used frozen runtime
`a266c03`; reporter `00156f6` preserved the measurements and attached assessments
bound to the exact judged artifacts. The results illustrate why shorter prose,
fewer tool calls and better review quality need separate checks.
