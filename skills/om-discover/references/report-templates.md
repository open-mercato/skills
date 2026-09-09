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
only when material was held back. `Next: none` applies when readiness is blocked.
When another skill ran, relay its output fields without claiming that an offered
or declined step ran. Include the chosen mode and signer when they explain the
readiness decision. Coverage counts stay in their field; do not repeat them in
prose. If a skeptic finding changed scope or an evidence claim, state the change
and its source once. Never replace missing evidence with a confident summary.

## Quick pass

Keep the header `Quick pass — one round, inline skeptic, critical gate items only.`
State what remains unexamined: deferred brief sections, checks needing a fresh
reviewer, and unscored gate items. Link the collection plan for those sections;
a quick pass does not satisfy missing readiness evidence.

## Nothing written — collection plan only

Explain which ticket-level sections lack material. Give a compact table of each
waiting section, who can supply it, how to collect it, the owner/date, and the
capture-template path. The collection plan is the deliverable; do not invent a
brief or an owner/date that was not supplied. End with:

```text
Elapsed: <minutes per step>
Collection plan: <k> entries waiting for material
Next: none
```

## Refresh

Lead with what changed and why. Include superseded decision ids (old → new) and
their owners, coverage before/after, and collection-plan entries closed. Keep
prior decisions in the brief's history; report unchanged material only when it
explains a remaining blocker.
