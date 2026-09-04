# Final report

Use 3–6 short lines, excluding machine fields. Report the outcome of the whole
chain once; do not paste the engine report or explain routine routing, branch
naming or label mechanics. Keep required evidence and material limits visible.

```markdown
✅ `om-auto-implement-spec`: {what now works and the implementation PR's actual state.}
🧪 {Validation/review outcome, with failed/unrun checks and pending required-check names explicit.}
{Only when relevant: 📸 UI result and evidence link, or why expected verification was skipped.}
{Remaining decision/QA action; if blocked, what is needed and how to resume.}
```

Use `🔁` or `⛔` instead of `✅` for an incomplete or blocked run. Include any
`⚠ NEEDS HUMAN CONFIRMATION` gate and preserve the design-only spec PR boundary.
Omit a `UI: n/a` ritual for backend/docs work; a user-facing verification skipped
with `--no-ui` or unable to run remains a visible limit.

Relay the engine's routing line verbatim when the engine emitted one. A resume
that emits no engine line does not invent a step count. Pending required checks
still gate merge; name any approval also required by the configured QA gate.
Evidence alone does not approve QA:

```text
Engine: <name> (steps: <N>, --loop: <yes|no>)
```

End with exact undecorated chaining fields; omit `Issue:` without a subject
issue and `PR:` when no PR exists:

```text
Issue: #<issue number> (link: <full issue URL>)
PR: #<PR number> (link: <full PR URL>)
Spec: <repo-relative spec path>
```
