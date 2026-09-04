# Final report

Use 3–6 short lines, excluding chaining fields. Keep the proposed behavior,
actual PR state, outstanding decision and next step. Omit absent concerns;
link the PR for its full explanation and label rationale.

```markdown
📝 `om-auto-write-spec`: {what the proposal enables and whether its PR is ready or draft.}
{Only when relevant: ⚠️ assumption requiring confirmation, why, and comment link.}
{Only when relevant: 📸 current/proposed evidence link, or a material verification gap.}
Continue with `om-auto-implement-spec {SPEC_PATH}` for implementation on its own PR.
```

If publication failed, report `Status: blocked`, the blocker and what unblocks
it; do not imply that a local spec is a published PR. Keep every
`⚠ NEEDS HUMAN CONFIRMATION` gate explicit even if the report needs more lines.

End with exact undecorated chaining fields; omit `Issue:` without a subject
issue and `PR:` when no PR exists:

```text
Issue: #<issue number> (link: <full issue URL>)
PR: #<PR number> (link: <full PR URL>)
Spec: <repo-relative spec path>
```
