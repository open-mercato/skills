# Report templates

Report the decision and its reason. The brief preserves supporting detail;
the report does not replay the conversation. Usually 3–6 lines before contract lines.

## Routed conclusion (ramps 2–6)

```markdown
🎯 `om-brainstorm`: {chosen direction and concrete outcome for its user}.
{Decisive reason; a rejected alternative only when it explains the choice.}
{Material assumption or unresolved risk, when one remains.}
Next: {exact confirmed invocation}
Brief: {repo-relative path}
Issue: #<number> (link: <full issue URL>)
```

Include `Brief:` only when written (ramps 2–5), and `Issue:` only on ramp 6.
Do not restate the invocation in prose. Preserve the confirmation gate and
brief-write restrictions from the skill body.

## Answered conclusion (ramp 1)

Answer directly. Explain why no work follows when that is the decision, and
name missing evidence that could change it. End with:

```text
Next: none
```
