# Report templates — user-facing output (step 12)

Use `references/rules.md`. Aim for 3–6 lines plus machine references. The PR body
owns the explanation and the review owns findings; link them instead of
repeating the pipeline's route, branch, labels, and intermediate reports.

```markdown
🎯 `om-auto-fix-issue`: {fixed | no action needed | already in progress | blocked} — {behavior changed or the concrete reason work stopped}.
{Review verdict/link; unresolved actionable findings or important limitation}.
🧪 {Regression behavior proved and validation/CI result or skipped commands}.
{Relevant UI evidence/coverage gap and the next action or remaining QA gate}.
```

Keep `Review: skipped` with its reason when the review could not run; the PR
stays in `review` for a later reviewer. Keep `UI: skipped (--no-ui)` or
`UI: skipped — {reason}` when applicable; omit a routine no-UI section.
Carry `LOW_CONFIDENCE` from the analyzer with the specific uncertainty. Mention
brief mode only when filing/reusing an issue changed the outcome. Link a spec
when the feature route produced one. Never imply this run merged or granted
`qa-approved`.

When triage returned `NO_ACTION_NEEDED`, report that outcome with its existing
PR, commit, file, or other evidence. Do not invent a branch, review, or QA result.

End with exact reference lines for artifacts that exist; include `Issue:` for
the subject issue:

```text
PR: #<number> (link: <full PR URL>)
Issue: #<number> (link: <full issue URL>)
```
