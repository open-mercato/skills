# Summary comment — outcome and handoff

Use the PR body for the full explanation. This comment tells a returning reviewer
what changed in this run and what happens next. Aim for 40–100 words; include all
unresolved actionable findings and required evidence even if that takes more.
Find the marker below and update it via **update-comment**; create via
**comment-pr** only when absent. Preserve multiline formatting with a body file.

```markdown
## 🤖 `om-auto-continue-pr-loop` — resume summary

**Final status:** {complete | still in-progress}
{One sentence: what this run changed and whether the PR is ready or remains draft.}
🧪 {Validation/review outcome, material limits or pending required-check names, and evidence link.}
{Only if needed: remaining decision, defect or QA action, with reason and next step.}
[Current change and scope]({PR URL})
```

- Publish after the step-8 review/autofix pass finishes or reports its blocker;
  reflect the actual final state and never claim completion not reached.
- An incomplete run names its first remaining Step, blocker, and exact resume
  command `om-auto-continue-pr-loop {prNumber}`. A spec-only handoff names
  `om-auto-implement-spec {SPEC_PATH}` and keeps the spec PR design-only.
- Keep full validation results, smoke steps, rollback details and enduring risks
  in the PR body or linked evidence. Link the authoritative review for remaining
  findings; retain each unresolved finding's impact and disposition, without
  repeating the review narrative. Include follow-up commit SHAs when they help
  locate fixes. Never repeat label rationales here.
- Surface all applicable validation, review, integration and UI outcomes on the
  PR; this comment can point to their existing evidence comments. A failed,
  skipped or pending check must remain visible, not become an implied pass.
  Name pending required checks and state that they still gate merge. Name any
  approval still required by the configured QA gate; evidence alone does not
  grant `qa-approved`. State whether this run will follow up on pending CI;
  if it will not, name who owns the next check. Do not call a check required
  unless the tracker or configured fallback establishes that status.
- Never include secrets, tokens, `.env` content or credentials.
- Link the latest checkpoint/final-gate record for detailed command results.
  Keep Tasks, HANDOFF.md and NOTIFY.md as the resume record rather than copying
  their contents into the comment. Simple runs omit run-folder references.
