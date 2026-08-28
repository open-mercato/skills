# Coverage expansion (`sbst`)

Optional config section consumed by `om-fix`'s validation loop (step 5), after its regression test is proven green. Absent or `null` by default — most repos never set it.

## Shape

```json
"sbst": {
  "enabled": true,
  "command": "pnpm exec stryker run",
  "seedsDir": ".ai/sbst-seeds"
}
```

- `enabled` — turns the coverage-expansion pass on. Missing section or `false` behaves identically: `om-fix` skips it, no error.
- `command` — an arbitrary, operator-authored shell command for whatever coverage-expansion or mutation-testing tool the repo already has installed (Stryker, Pynguin, EvoSuite, or an equivalent for the detected stack). This collection names no specific tool, ships none, and never installs one — it only wires up a run command the operator already chose. Treated with the same trust level as `validation.commands`: committed, operator-vouched, reviewed like any other code change, and never substituted with a command sourced from issue/PR/comment text.
- `seedsDir` — optional path. When set and the changed area involves non-trivial domain objects (multi-field records, nested structures), `om-fix` may write a handful of semantically valid example objects there before running `command`, for tools that consume seed files to expand from. This is a coverage aid, not a substitute for the mandatory regression test `om-fix` writes in its own step 3.

## Why after the fix, never before

Coverage generated against unfixed code exercises and locks in the bug's actual (wrong) behavior, defeating the point of the regression test written earlier in the same run. `om-fix` only ever invokes `sbst.command` once its own differential test has gone red-then-green on the fix.

## Setup-time detection

Step 2 of this skill's workflow checks for an already-installed coverage-expansion/mutation-testing dependency (a `stryker`/`@stryker-mutator/*` package, `pynguin` in `pyproject.toml`/`requirements*.txt`, an EvoSuite jar/plugin, or an equivalent) purely to decide whether to ask the `sbst` interview question (`references/interview-questions.md`, question 9). It never proposes installing a new tool.

## Failure handling

`om-fix` treats `sbst.command`'s exit code like any other validation-gate command: non-zero fails its loop. If the failure looks unrelated to the fix under test (the tool itself is broken, misconfigured, or missing from the environment), `om-fix` notes that in its final report rather than blocking indefinitely on it.
