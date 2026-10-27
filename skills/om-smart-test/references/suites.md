# Suites — what runs, and how it can be narrowed

Loaded by `om-smart-test` step 1. A **suite** is one kind of test with one full
command and optional narrowed forms. Suites are configuration, never guessed.

## Schema (`smartTest.suites` in `.ai/agentic.config.json`)

```json
{
  "smartTest": {
    "map": ".ai/test-map.json",
    "suites": [
      {
        "name": "unit",
        "full": "<command that runs the whole suite>",
        "files": ["**/*.test.*", "**/__tests__/**"],
        "direct": "<command template running only {tests}>",
        "related": "<command template the runner resolves from {sources}>",
        "unit": "<command template for one affected unit: {unit} / {unitPath}>",
        "needsApp": false
      },
      {
        "name": "integration",
        "full": "<command that runs every integration test>",
        "files": ["e2e/**/*.spec.*"],
        "direct": "<command template running only {tests}>",
        "needsApp": true
      }
    ]
  }
}
```

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | Stable suite id; the test map's `tests.<suite>` and `layers[].skipSuites` refer to it. |
| `full` | yes | Runs the whole suite. The fallback for every uncertain case. |
| `files` | recommended | Globs recognizing this suite's test files — used for test-only changes, for per-unit test lists, and to count the total for coverage. Without it, test-only detection and coverage totals are `unknown` for the suite. |
| `direct` | no | Template; `{tests}` = space-separated, single-quoted test files. |
| `related` | no | Template; `{sources}` = changed non-test source files that still exist. Use only when the runner itself traverses the import graph. |
| `unit` | no | Template run once per affected unit; `{unit}` = unit name, `{unitPath}` = its root path. |
| `needsApp` | no (`false`) | The suite needs a running application (step 6). |

Order of `suites` is the run order.

## Deriving suites when `smartTest.suites` is absent

1. Take the commands in `validation.commands` that run tests: a manifest script or
   task whose name is or starts with `test`, or a command invoking a test runner
   directly. Typecheck, lint, format, and build commands are **not** suites.
2. Each becomes a suite named after its script/task (`test`, `test:e2e`, …) with
   that command as `full`. Set `needsApp: true` only when the repository's own
   docs or scripts show the suite runs against a started application.
3. Narrowed forms are derived **only** when the command resolves to one known
   runner invoked directly (read the manifest script it calls) — then use the
   runner's own narrowing mode from the table below, invoked through the same
   launcher the full command uses. A script that fans out to several tools or
   packages (a task runner, a chain of `&&` commands) does not forward file
   arguments reliably: keep that suite full-only.
4. Verify any derived flag against the installed runner (`--help` or its version's
   docs) before relying on it. Unverifiable → full-only.
5. Nothing test-like in `validation.commands` and no `smartTest.suites` → ask the
   user which command runs the tests; propose the `smartTest.suites` entry they
   can commit. Never run an invented command.

Record in the plan which suites were configured and which were derived.

## Runner narrowing modes (derivation aid — verify before use)

| Runner family | `related` (import graph) | `direct` (explicit files) | `unit` (per unit) |
|---|---|---|---|
| Jest | `--findRelatedTests {sources} --passWithNoTests` | `{tests}` | the unit's own test script |
| Vitest | `related {sources} --run --passWithNoTests` | `run {tests}` | project/workspace filter |
| Playwright / Cypress | — | `{tests}` / `--spec {tests}` | — |
| pytest | — | `{tests}` | `{unitPath}` |
| Go test | — | — | `./{unitPath}/...` |
| Cargo test | — | — | `-p {unit}` |
| Maven / Gradle | — | test-class filter | module selection (`-pl {unitPath}` / `:{unit}:test`) |

A runner not listed, or a flag not confirmed for the installed version, gets no
narrowed mode — the suite runs full.
