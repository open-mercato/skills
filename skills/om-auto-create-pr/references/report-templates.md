# Final report

Report the result in 3–6 short lines, excluding machine fields. Lead with what
changed and the PR's actual state. Do not repeat the PR body, label rationale,
branch naming choice or run history. See `references/rules.md` for shared style.

```markdown
{✅ or 🔁 or ⛔} `om-auto-create-pr`: {what changed; ready, incomplete or blocked, and why.}
🧪 {Validation and review result; evidence link and material limits and pending required-check names.}
{Only when relevant: 📸 UI evidence link, or why required verification did not run.}
{Next review/QA decision, or first remaining Step and `om-auto-continue-pr {prNumber}`.}
```

For a spec-only handoff, name `om-auto-implement-spec {SPEC_PATH}`. Keep an
incomplete PR's `Status: in-progress` and link the plan or HANDOFF.md when needed
to resume. Include a material unresolved risk or high-stakes assumption explicitly;
do not hide it behind the short-report target. Pending required checks still
gate merge; name any approval also required by the configured QA gate. When CI
is pending, state whether this run will follow up; do not promise monitoring
that will not happen or infer required-check status from an unknown check.

On a fresh `om-auto-create-pr` run, include the routing line from
`references/engine-selection.md` on its own line. On a loop handoff, prefix the
relayed engine report with that line, without rewriting it:

```text
Engine: <name> (steps: <N>, --loop: <yes|no>)
```

End with the exact undecorated chaining lines; include `Issue:` only for a subject
issue and never emit a nonexistent PR:

```text
PR: #<number> (link: <full PR URL>)
Issue: #<number> (link: <full issue URL>)
```
