# Selection — classification order and per-suite modes

Loaded by `om-smart-test` steps 4–5. Apply the rules in this order; the first
that fires decides. Every "full" is per suite unless it says "every suite".

## Classification (step 4)

1. `--full` → every suite `full`.
2. Drop files matching `ignore`. Nothing left → report "only ignored files changed" and run nothing.
3. Any remaining file matches `wide`, or belongs to no unit → **every suite `full`** (record the triggering file).
4. Every remaining file is a test file of some suite (matches a suite's `files`) → **test-only**: each suite runs `direct` with exactly its own changed test files (that still exist); suites with no changed tests `skip`. A suite without `direct` runs `full`.
5. Otherwise → **unit-scoped**: resolve `affected` units (`references/test-map.md` → Resolving affected units) and choose each suite's mode below.

## Per-suite mode (step 5, unit-scoped)

For each suite, first check the **layer gate**: every remaining changed file
belongs to a layer whose `skipSuites` names this suite → `skip` (report the
layer). Otherwise take the first mode whose inputs exist:

| Mode | Use when | Inputs |
|---|---|---|
| `related` | the suite defines `related` | changed non-test source files that still exist; units that became affected only through a map-declared edge (`dependsOn` / `declarations` — invisible to the runner's import graph) get an additional `direct` run of their tests, or the suite runs `full` when it has no `direct` |
| `direct` | the suite defines `direct` and the affected units' tests for this suite (map `tests.<suite>` or `files` under the unit paths) are listable | the test files of all `affected` units |
| `unit` | the suite defines `unit` | one invocation per affected unit |
| `full` | otherwise, or any input failed validation | — |

- A `direct` list that resolves to **zero** tests for an affected unit is not
  proof the unit is untested: when the unit has source changes and the suite has
  no test mapped to it, report it as `uncovered` rather than widening silently;
  when the suite's `files` globs are unknown, run `full`.
- Mixed changes (some test-only, some source) → unit-scoped, with the changed
  test files added to the `direct` list.
- Deleted files count for unit mapping but are never passed as runner arguments.

## Decision tree

```
--full?                                   → every suite full
cache valid (references/cache.md)?        → run cached plan
only ignored files?                       → nothing to run
wide file / file outside every unit?      → every suite full
only test files?                          → per suite: direct(changed tests) | skip | full
otherwise (unit-scoped):
  per suite:
    all changes in layers skipping it?    → skip
    related usable?                       → related(changed sources)
    direct usable?                        → direct(tests of affected units)
    unit usable?                          → unit(each affected unit)
    else                                  → full
save cache → prepare app for needsApp suites → run → report
```
