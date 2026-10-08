# Report templates

Lead with what was wrong and what changed for the user of the failing
behavior. The regression oracle and the gate results are the evidence; do not
replay the investigation. Usually 6–12 lines before the `Next:` line.

## Fixed (a verified change sits in the working tree)

```markdown
✅ `om-troubleshooter`: {behavior that now works, for whom} — fixed in the working tree, not committed.

- Symptom: {exact failing command/test/request} → {actual} instead of {expected}
- Root cause: {trigger → code path → wrong result}, `{file:line}`{; inferred, not reproduced — when true}
- Fix: {the smallest change, at the real call site} (`{file}`, …)
- 🧪 Oracle: `{test id}` — failed before for {intended reason}, passes now
- 🧪 Gates: {focused suite, validation commands, integration tests — pass/fail each when they differ}
- ⚠️ Residual risk: {what the fix does not cover, or a contract it touched} (only when present)

Next: om-check-and-commit
```

## Diagnosed (no edit — diagnosis-only, deferred, or blocked)

```markdown
🔍 `om-troubleshooter`: {one-sentence root cause and its consequence}.

- Symptom: {exact failing command/test/request} → {actual} instead of {expected}
- Root cause: {trigger → code path → wrong result}, `{file:line}`{; inferred — when true}
- Proposed fix: {smallest change} + oracle `{family}` ({why not applied: diagnosis-only, needs scope decision, dependency defect})
- ⚠️ Open question: {decision the user must make} (only when present)

Next: {om-prepare-issue "<one-line summary>" | none}
```

For a dependency defect, the proposed fix is an upstream issue or PR carrying
the installed version and a minimal reproduction (from `om-framework-context`),
or the dependency's documented extension point — never a patch to the installed
copy.

## Could not reproduce

```markdown
⛔ `om-troubleshooter`: could not reproduce {symptom} — {what was tried, where}.

Needed to continue: {exact missing detail — command, input, environment, version}.

Next: none
```

Quote log or payload excerpts only as far as they prove a point, with secrets
and personal data redacted.
