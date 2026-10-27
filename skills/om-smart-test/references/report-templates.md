# Final report (step 8)

Lead with the outcome and how much was tested. A normal run fits in 4–8 lines
plus the suite table. This skill emits no chaining lines.

```markdown
🧪 `om-smart-test`: {✅ all selected tests passed / ❌ N failed in <suite>} — {classification: unit-scoped | test-only | wide | ignored-only}{, [cache hit: <short-sha>]}.
Base: `{base ref}` ({N} changed files{, local changes only — no base resolved}). Affected units: {list, or "all (wide: <file>)"}.

| Suite | Mode | Why | Result | Ran / total |
|---|---|---|---|---|
| {name} | {related / direct / unit / full / skip / not run} | {changed unit, dependency, wide file, layer, fallback reason} | {✅ passed / ❌ N failed / —} | {ran} / {total} ({pct}%) |

{Only when relevant: environment — reused test env at <baseUrl> / provisioned via `om-prepare-test-env` / not available (suites marked not run).}
{Only when relevant: ⚠️ fallbacks and gaps — narrowed command fell back to full, units with changes but no mapped tests (`uncovered`), dropped ignored files.}
{On failure: first failing test and assertion per suite, with the runner report link; exact rerun command.}
{Only when the plan needed data the repo lacks: suggested `.ai/test-map.json` / `smartTest.suites` addition.}
```

- `Ran / total`: total = files matching the suite's `files` globs (`git ls-files`),
  ran = test files executed (runner summary for `related`/`unit`). Round to one
  decimal. Write `unknown` when either side cannot be counted — never a remembered number.
- A `full` run is 100% by definition; a `skip` or `not run` suite shows `0 / total`
  and the reason, so narrowed coverage is never mistaken for a full gate.
- Aggregate passing tests; list failures individually. Omit empty optional lines.
