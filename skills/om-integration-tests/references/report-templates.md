# Test results and failure analysis

Lead with outcome and tested behavior. Successful runs usually need 3–6 lines;
use a table for failures, not a paragraph per passing test. No chaining lines.

## Run report

```markdown
🧪 `om-integration-tests`: {N passed, M failed, K skipped} for {behavior/scope}.
Ran `{command}` against {base URL}; {material coverage/environment limitation, if any}.
{Authoring only: linked files added/changed and behavior their assertions cover.}
Evidence: {runner report, trace, or screenshot links needed to assess the result}.
{When needed: unresolved failure or exact next check before merge.}
```

Report skipped or unexecuted coverage honestly. Aggregate routine passes and
link detailed results. Do not claim app-wide correctness from a single flow,
repeat runner output, or explain routine fixture conventions.

## Failure-analysis table (mandatory after any failed run)

Place immediately after the result sentence, before supporting prose. Keep one
row per failing test with evidence, diagnosis, and next action:

```markdown
| Failing test | Evidence | Cause and confidence | Owner | Next action |
|---|---|---|---|---|
| `<path>::<test name>` | {artifact link + decisive observation} | {product regression / test issue / environment or data; mechanism, or hypothesis and missing proof} | {User/Product team / Agent/QA / Shared} | {specific fix or check} |
```

Mark resolved failures with the passing rerun. Do not repeat rows in a closing
paragraph. Preserve initial failure evidence when retries pass; distinguish a
clean pass from a flaky run.
