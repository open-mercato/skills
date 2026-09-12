# Report templates — user-facing output (step 6 / CI-only mode)

Use `references/rules.md`. Aim for 3–6 lines plus chaining references. The PR
body explains the change; the review owns findings; QA owns its scenario and
screenshots. Link those records and report only this run's result and next action.

## Final run report (full mode, step 6)

```markdown
🚀 `om-auto-fix-pr`: {merge-ready | needs human | blocked after {n} iterations} — {decisive reason and next action}.
{Concrete fixes made; link review dispositions and any follow-up issues}.
🧪 {Required CI result and validation limits}; 📸 {UI result/evidence link when relevant}.
{Remaining QA/decision/blocker and the action needed; mention intentional draft state only when relevant}.
```

Never call a PR merge-ready when required checks remain pending or failed.
State a skipped requested UI pass and its reason. When the wait budget expires,
include the pending checks and the explicit no-further-follow-up statement from
`references/ci-followup.md`. A passing evidence-only UI run leaves required QA
sign-off outstanding. Link all inherited-feedback dispositions once in the
review; summarize only unresolved ones here. Omit label inventories, routine
base-merge metadata, empty follow-up sections, and reports already posted by
sub-skills.

## CI-only run report (`--ci-only`)

```markdown
🧪 `om-auto-fix-pr --ci-only`: {all required checks green | still red | unverified} — {cause fixed or remaining failure}.
{Fix and relevant check/run links; classify failure as real bug, test bug, flake, or infra when consequential}.
{Remaining blocker, pending checks, validation limit, or next action}.
```

The same no-further-follow-up statement applies on wait exhaustion. In plain
branch mode identify the branch; omit PR comments and reference lines.

End reports about a PR with exact chaining lines, including `Issue:` only for a
subject issue:

```text
PR: #<number> (link: <full PR URL>)
Issue: #<number> (link: <full issue URL>)
```
