# Shared rules

These rules always apply alongside the skill body. The writing rules below use
the collection's canonical wording; the skill performs no tracker operations.

- **Interactive run.** Work within the user's confirmed scope, ask for missing product decisions, report, and return control. This skill has no autonomous mode and invokes no further skill.
- **Secrets hygiene.** Never paste secrets, tokens, `.env` content, raw credentials or personal interview details into artifacts or reports.
- **Marker contract.** Output reference lines go on their own lines at the end of the final report. Preserve the exact label, value shape and meaning; never translate or decorate machine fields.
- **Emoji glossary** in user-facing output: 🎯 goal · 📋 plan · 📝 spec · 🏷️ labels · 📸 evidence · 🔍 review · 🧪 tests · 💥 breaking · ✅ pass · ❌ fail · ⚠️ needs-human · ⛔ blocked · 🔁 resume · 🚀 merge/release. Emojis decorate; parsers key on text markers only.
- **Reporting style.** Lead with the outcome or recommended action and the concrete reason. Explain what changes for whom in everyday language; use before/after behavior when useful. Include technical names only to locate evidence or explain a consequence. Avoid process narration, generic praise, repeated conclusions, and empty `None`/`N/A` sections.
- **One explanation, updates elsewhere.** The PR or issue body explains the current change; keep it current when this skill owns that body. Reviews add findings; run comments add changes since the last report, evidence, blockers, or a handoff. Link existing detail instead of repeating it. Preserve the claim, label, assumption, evidence, and release comments this workflow requires, updating their stable markers in place.
- **Decision evidence.** Within this skill's scope, separate direction/scope questions from verified defects. State the affected behavior, consequence, and next action; cite code or the repository rule behind a finding. Distinguish observed facts, inferences, and checks not run. Qualify absence claims by where you searched. A planned consumer or missing document alone is not proof of a defect.
- **Useful detail only.** Include cross-system effects, durable contracts, defaults imposed on users, and rollback limits when they affect the decision. Use a small Mermaid flow or dependency diagram when relationships are clearer than prose; label current, changed, and planned parts accurately and add a one-sentence takeaway. Do not add an intake document or diagram for every change.
- **Length follows the decision.** Aim for 150–300 words for a substantive PR/issue body, 40–100 for a routine update, and 3–6 lines for a final handoff; simple work needs less. These are editing targets, not caps. Keep every actionable finding, required evidence, material uncertainty, and recovery instruction. Put long logs and inventories in linked artifacts or collapsible detail.
- **Template contract.** Use the skill's template for its purpose and required fields; omit optional sections that add no information. Preserve exact machine fields, verdicts, stable comment markers, and chaining lines even when shortening prose. The complete agent artifact stays complete when a skill defines a shorter human projection; disclose omitted counts and link the full findings. Use glossary emojis for meaningful headings or states, and backticks around skill names in human-facing prose.

## om-mockup-prototype specifics

- **Additional markers.** `Prototype:`, `Prototype context:`, `Verification:` and `Next:` follow the exact shapes in the skill body. A `Next:` invocation is explicitly chosen and still unexecuted; otherwise the value is `none`.
- **Read-only source context.** The brief, panel reports, application code and `.uxproof/` remain unchanged. Business decisions keep their owner and source; any proposed change follows the brief's change path.
- **Evidence distinctions.** `[SYNTHETIC]` suggestions and `[ASSUMPTION]` values keep their labels in the context record. Browser checks observe the prototype. Neither those checks nor prototype approval satisfy the Definition of Ready.
- **Neutral simulation.** Keep low-fi styling, in-memory fictitious data and local operation. Brand decisions, design tokens and production implementation belong to later work.
- **Preservation.** Write one new revision only. Keep previous revisions, manually edited files and decision history; recorded ownership never authorizes overwriting them.
