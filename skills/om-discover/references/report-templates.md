# Report templates

Final-report shapes for `om-discover` (workflow step 9). Fill them exactly and expand with detail — the reader did not sit in the session. End with the Output contract lines from the skill body, one per line, exact and undecorated.

## Brief written

```markdown
## 🎯 om-discover — product brief

📋 **Mode and why.** {the mode chosen, what in the repository or the material decided it, and who signs the Definition of Ready in this mode}

📝 **What the brief establishes.** {the vision in one sentence; the users and the problem; the scope split; the decisions taken this session, each with its owner}

📸 **What it rests on.** {the sources used, and the coverage line in words: how much is interviews and data, how much is synthetic or assumed, and which sections are thinnest}

⚠️ **What is still missing.** {every section on the collection plan with who, how, and by when; every blocking open question and who can answer it; the riskiest assumption and its test}

🔍 **What the skeptic changed.** {claims that lost a tag or moved to the collection plan; questions that went back to the user; what held}

🧪 **Ready for what.** {whether the ticket-level tier of the Definition of Ready is satisfied on tiers 1 to 5; what the next skill can start from and what it cannot yet}

🧭 **Next step.** {what the hand-off offered (one more decision round, or the first *now* slice routed to a skill), what the user chose, and what ran as a result, with its own contract lines quoted when a skill ran}

Product brief: {…}
Coverage: {…}
Collection plan: {…}
Next: {…}
```

Include `Collection plan:` only when the gate held anything back; `{k}` counts entries, in the same shape as the brief header. Always end with `Elapsed: <minutes per step>` before the contract lines, so the next run can be sized.

## Quick pass

Under `--quick`, the report is the *Brief written* shape with the header line `Quick pass — one round, inline skeptic, critical gate items only.` and one more paragraph, **🔁 What a full run would add**: the sections left on the collection plan by the mode rather than by missing material, the skeptic checks that needed a fresh pair of eyes, and the gate items not scored.

## Nothing written — collection plan only

When the gate found no material for the ticket-level sections and the user did not choose to continue on assumptions, the report is the plan itself: the sections waiting, who can answer them, how, the owner and the date, and the capture templates written under the research directory. Close with why nothing was written (the sections that would have been fiction) and the contract lines:

```
Collection plan: {k} entries waiting for material
Next: none
```

## Refresh

On `--refresh`, the report adds a **🔁 What changed** section: sections rewritten and why, decisions superseded (old id → new id, owner), coverage before and after, and collection-plan entries closed.
