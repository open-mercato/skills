# Final report (step 6)

Use 3–6 lines for a normal run. This skill emits no chaining lines.

```markdown
{✅/❌} `om-check-and-commit`: {configured validation passed / stopped at the failing gate}.
Checks: {configured commands and actual results; mark anything not run}.
{When fixes were made: behavior corrected and linked files; locale changes when relevant.}
{When published: commit SHA, subject, and branch. Otherwise: verification-only or publication blocker.}
{When blocked: first error, why unresolved, and exact next action.}
```

Use a command/result table when checks have different outcomes or distinct
caveats. Aggregate unchanged passes rather than forcing notes per command. A
fixed gate passes only after its required rerun and dependent checks pass. Keep
failed and skipped checks visible. Omit empty fix/locale sections and repeated
publication summaries.
