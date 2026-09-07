# Discovery report

Use after the confirmed brief is written. Follow `references/rules.md`: link the
brief's explanation, decisions and sources rather than retelling the session.
Aim for 3–6 lines before the exact output fields; keep every blocking question,
owner and next action even when more space is needed.

## Brief written

```markdown
🎯 `om-discover` — {product}: {ready for the first slice | more evidence needed}.
{Users, problem and agreed scope in one sentence; link the brief.}
🧪 **Ready for what.** {Whether the ticket-level Definition of Ready is met; unresolved blockers with owners and the riskiest assumption/test.}
🔁 **Next step.** {What was offered, what the user chose, and which skill actually ran or was declined.}
Elapsed: <minutes per step>
Product brief: <repo-relative path>
Coverage: <n> claims — <a> sourced (interview <i>, data <d>, document <c>, product <p>, benchmark <b>), <s> synthetic, <u> assumed
Collection plan: <k> entries waiting for material
Next: om-brainstorm "<topic>" | om-spec-writing "<goal>" | om-prepare-issue "<goal>" | none
```

Preserve the Output contract from the skill body. Include `Collection plan:`
only when material was held back. There is exactly one final `Next:`: an explicitly chosen, unexecuted invocation with its exact arguments, otherwise `none`. A completed panel, a completed backlog dry run, and a declined offer each yield `Next: none` unless the user chose a separate outstanding hand-off. Readiness blockers prevent a backlog hand-off.
When another skill ran, relay its artifact output fields, never its routing lines, without claiming that an offered
or declined step ran. Include the chosen mode and signer when they explain the
readiness decision. Coverage counts stay in their field; do not repeat them in
prose. If a skeptic finding changed scope or an evidence claim, state the change
and its source once. Never replace missing evidence with a confident summary.
