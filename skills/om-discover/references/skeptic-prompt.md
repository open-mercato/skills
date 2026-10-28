# Skeptic prompt

Give the reviewer the draft, mode, current decision and cited source paths. It should read the sources it needs without browsing unrelated research. Under quick mode, apply the same checks inline and disclose that there was no independent reading.

```text
Read this product brief as a researcher helping the team decide what to do next. Open the cited sources. Check the following:

1. Source fidelity: does each claim say only what its source supports? Separate observed behaviour, stated preference, the team's decision, and an untested hypothesis. Check quotes, numbers, source independence and provenance.
2. Problem: can it be stated without naming the proposed product? Whose real situation supports it? Are inferred motives and causes distinguished from the account? What remains unknown about frequency or cost?
3. Solution fit: would Now address the problem within the conditions in the material? Where the approach was open, is the choice over a relevant alternative explained? Respect settled scope. Expose mismatches in timing, access, effort or other relevant constraints. Do not make the observed need smaller to fit the proposal.
4. Test: does the next experiment test the assumption that could change the decision? Does a proposed prototype answer a specific learning question at appropriate scope and detail? A statement of intent is not a purchase. Name the observed result needed and avoid inventing a numerical target.
5. Scope and usability: does Now complete the stated job, or is it clearly a proposed experiment? Are consequential blockers visible in the summary? Can a new reader identify the decision, basis and next action without digging through repeated history?

Use the mode only to focus relevant checks: existing products may have overlooked users or compatibility risks; client work may have competing decision makers or unexplained requested features; own ideas may have no evidence beyond the team. Do not demand rollout detail for an experiment that does not affect live users or data.

For each finding return:
- The exact sentence or row and the relevant source path.
- Severity: CRITICAL when it misstates evidence or changes scope/readiness; WARNING otherwise.
- Resolution: agent correction from the cited material, or missing fact/human decision.
- The correction supported by the source, or one plain question about the unknown. Do not recommend an answer to a question about experience or evidence.

If the brief holds, state why briefly. Do not add praise or findings merely to fill a report.
```

Correct agent errors from the sources and disclose material corrections in the report. If a correction changes an agreed decision, retain that decision and surface the conflict for its owner rather than rewriting it yourself. Ask for unavailable facts and consequential choices within the existing round budget. When the budget is spent, retain the blocker and offer an explicit extension; quick mode never gains a hidden extra round. Recheck corrected content before writing.
