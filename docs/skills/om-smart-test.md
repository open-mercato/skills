# om-smart-test

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Runs only the tests a change can affect. It diffs the branch against its base (plus staged, unstaged, and untracked files), maps each changed file to an affected unit — from a repo-owned test map (`.ai/test-map.json`) or, when there is none, from the repository's own workspace manifest — adds the units that depend on them, and then narrows every configured test suite to the smallest safe mode: the runner's related-tests mode, an explicit list of test files, or a per-unit command. Cross-cutting changes, files outside every unit, and anything it cannot validate fall back to the full suite. It prints the plan, runs it without asking, caches the plan per commit, and reports mode, trigger, result, and ran/total coverage for each suite. It never edits code or commits.

## Parameters

- `--base <ref>` — compare against this ref instead of the configured base branch.
- `--suite <name>` — limit the run to the named suites (repeatable).
- `--full` — run every suite in full.
- `--plan-only` — print and cache the plan without running it.
- `--no-cache` — ignore any cached plan.

## Works with

Test commands come from the optional `smartTest.suites` config key or are derived from `validation.commands`; the unit map comes from `smartTest.map`. Suites that need a running app attach to the shared environment from [om-prepare-test-env](om-prepare-test-env.md). A narrowed run is fast feedback, not the merge gate — [om-check-and-commit](om-check-and-commit.md) and CI still run the full configured gate.

---
*Source: [`skills/om-smart-test/SKILL.md`](../../skills/om-smart-test/SKILL.md)*
