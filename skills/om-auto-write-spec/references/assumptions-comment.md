# Assumptions comment (step 7)

Post only when the spec's `Resolved assumptions (autonomous defaults)` section is non-empty — Open Questions `om-spec-writing --autonomous` resolved, or behavior-changing prototype assumptions it copied there. Use
**comment-pr** with a body file, and **comment-issue** on the subject issue.
Keep the exact marker below; reruns update it in place via **update-comment**.
Aim for 40–100 words, but retain every default and its rationale when the table
needs more space. Link the spec for design detail.

```markdown
🤖 `om-auto-write-spec` — Open Questions answered with autonomous defaults

Applied these defaults in [the spec]({SPEC_PATH}); correct any answer before merge.

| # | Question | Applied default | Why | Confirm? |
|---|----------|-----------------|-----|----------|
| Q1 | {question} | {default} | {concrete reason} | {reversible / ⚠ NEEDS HUMAN CONFIRMATION} |

{Only for gated rows: the PR remains draft until these assumptions are confirmed.}
To change a default, edit the spec or reply here before rerunning
`om-auto-write-spec` or `om-auto-implement-spec {SPEC_PATH}`.
```

High-stakes guard: any `⚠ NEEDS HUMAN CONFIRMATION` row (or legacy
`⚠ needs human`) keeps the PR draft; the body states the merge gate.
Never apply `qa-approved` from this skill.
