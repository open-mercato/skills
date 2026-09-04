# Report templates — user-facing output (step 14)

The posted review owns the findings; the session reply reports the outcome and
next action. Follow `references/rules.md`. Aim for 3–6 lines plus chaining
references, expanding only for a decision or blocker that cannot be linked.

## Final run report

```markdown
🔍 `om-auto-review-pr`: {APPROVED | CHANGES REQUESTED} — {concrete reason and recommended next action}.
{What changed during autofix or re-review, if anything; link the authoritative review.}
🧪 {Validation and required-CI outcome; any pending/failed/skipped checks and their consequence}.
{Remaining QA, decision, or access requirement; give the next action.}
```

When autofix was ineligible, preserve
`autofix: skipped (not my PR — re-run with --autofix to fix it here)`.
Surface inability to read inline feedback, a draft left intentionally incomplete,
or CI wait exhaustion when applicable. Link inherited feedback dispositions from
the review rather than listing them again. Do not repeat labels, the PR body,
resolved findings, or routine branch/claim metadata. Approval alone does not
establish that required CI and QA gates are satisfied.

End with exact chaining lines; include `Issue:` only for a subject issue:

```text
PR: #<number> (link: <full PR URL>)
Issue: #<number> (link: <full issue URL>)
```

## CI-result comment (step 13)

Update the existing `` 🤖 `om-auto-review-pr` — CI result `` comment via
**update-comment**. Report the new result and consequence in 40–100 words;
link the checks and review rather than repeating them. A wait-budget exit still
includes every local `validation.commands` result, pending check names/links,
and **no further follow-up will come from this agent**. This ends
`ci-monitoring`; it never waives required CI. Procedure:
`references/ci-followup.md`.

## Completion comment (step 12)

Keep the exact release/retain marker from `references/claim-pr.md`
(`🤖 … completed: {VERDICT}. Lock released.` / `Lock retained — chain continues.`).
Add only the review link, changes made, and next action. Preserve the autofix
skip text when applicable. Update this comment in place on a re-run; do not
repeat the review or label rationale.
