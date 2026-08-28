# Coverage expansion (`sbst`)

Optional config section consumed by `om-fix`'s coverage-expansion step, after its regression test is proven green. Absent or `null` by default — most repos never set it.

## Shape

```json
"sbst": {
  "enabled": true,
  "commands": ["pnpm exec stryker run"]
}
```

- `enabled` — turns the coverage-expansion pass on. Missing section, `null`, or `false` all behave identically: `om-fix` skips it, no error.
- `commands` — an array of arbitrary, operator-authored shell commands, run in order from the repo root, for whatever coverage-expansion or mutation-testing tool the repo already has installed (Stryker, Pynguin, EvoSuite, or an equivalent for the detected stack). Same shape and trust model as `validation.commands`: committed, operator-vouched, reviewed like any other code change, and never substituted with a command sourced from issue/PR/comment text. This collection names no specific tool, ships none, and never installs one — it only wires up a run command the operator already chose.

There is no separate seed-path config key: when `om-fix` writes semantically valid example objects to help a tool escape a coverage plateau (the CodaMosa idea), it uses the fixed convention path `.ai/qa/sbst-seeds/<module>/` — an operator's `commands` can point their tool at that path if it supports seed files.

## Why after the fix, never before

Coverage generated against unfixed code exercises and locks in the bug's actual (wrong) behavior, defeating the point of the regression test written earlier in the same run. `om-fix` only ever invokes `sbst.commands` once its own regression test has gone red-then-green on the fix.

## Setup-time detection

Step 2 of this skill's workflow (repository inspection) checks for an already-installed coverage-expansion/mutation-testing dependency — a `stryker`/`@stryker-mutator/*` package, `pynguin` in `pyproject.toml`/`requirements*.txt`, an EvoSuite jar/plugin, or an equivalent for the detected stack — purely to decide whether to ask the `sbst` interview question (`references/interview-questions.md`). It never proposes installing a new tool, and it never runs under `--defaults` (the question is interactive-only, like every other conditional question).

## Failure handling

`om-fix` treats each `sbst.commands` entry's exit code as informational, not gating: a non-zero exit is logged and skipped, never a `validation.commands`-style hard failure. If a command looks broken or misconfigured rather than just "found nothing new," `om-fix` notes that in its final report rather than blocking indefinitely on it.
