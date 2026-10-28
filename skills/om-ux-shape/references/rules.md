# Shared rules

Canonical rules shared by every skill in this collection. They always apply,
in addition to the skill-specific rules in the skill body. On conflict, the
stricter rule wins.

- **Interactive run — a user is in the loop.** This skill acts once, may ask
  the few questions that could change the direction, reports, and hands
  control back. It is not an `om-auto-*` skill: it chains no further skills
  and starts no implementation unless asked.
- **Secrets hygiene.** Never paste secrets, tokens, `.env` content, or raw
  credentials into specs, handoffs, or reports.
- **Emoji glossary** in user-facing output: 🎯 goal · 📋 plan · 📝 spec · 🏷️ labels · 📸 evidence · 🔍 review · 🧪 tests · 💥 breaking · ✅ pass · ❌ fail · ⚠️ needs-human · ⛔ blocked · 🔁 resume · 🚀 merge/release. Emojis decorate; parsers key on text markers only.
- **Reporting style.** Lead with the outcome or recommended action and the concrete reason. Explain what changes for whom in everyday language; use before/after behavior when useful. Include technical names only to locate evidence or explain a consequence. Avoid process narration, generic praise, repeated conclusions, and empty `None`/`N/A` sections.
- **One explanation, updates elsewhere.** The PR or issue body explains the current change; keep it current when this skill owns that body. Reviews add findings; run comments add changes since the last report, evidence, blockers, or a handoff. Link existing detail instead of repeating it. Preserve the claim, label, assumption, evidence, and release comments this workflow requires, updating their stable markers in place.
- **Decision evidence.** Within this skill's scope, separate direction/scope questions from verified defects. State the affected behavior, consequence, and next action; cite code or the repository rule behind a finding. Distinguish observed facts, inferences, and checks not run. Qualify absence claims by where you searched. A planned consumer or missing document alone is not proof of a defect.
- **Useful detail only.** Include cross-system effects, durable contracts, defaults imposed on users, and rollback limits when they affect the decision. Use a small Mermaid flow or dependency diagram when relationships are clearer than prose; label current, changed, and planned parts accurately and add a one-sentence takeaway. Do not add an intake document or diagram for every change.
- **Length follows the decision.** Aim for 150–300 words for a substantive PR/issue body, 40–100 for a routine update, and 3–6 lines for a final handoff; simple work needs less. These are editing targets, not caps. Keep every actionable finding, required evidence, material uncertainty, and recovery instruction. Put long logs and inventories in linked artifacts or collapsible detail.
- **Template contract.** Use the skill's template for its purpose and required fields; omit optional sections that add no information. Preserve exact machine fields, verdicts, stable comment markers, and chaining lines even when shortening prose. The complete agent artifact stays complete when a skill defines a shorter human projection; disclose omitted counts and link the full findings. Use glossary emojis for meaningful headings or states, and backticks around skill names in human-facing prose.
- **Reader's language over method vocabulary.** The framework's vocabulary is
  for the author, never the reader: section names like evidence ledger, value
  gaps, complexity hotspots, behavioral signal, or guardrail must not appear
  in the delivered text. Render each as a plain statement about screens,
  behavior, and what to change.
- **The result obeys the rules it enforces.** Before delivering, check the
  text against the repository's own copy conventions (the manual section of
  `.uxproof/conventions.md` and any team rules the user has stated). A
  recommendation that flags a copy violation while committing it is invalid.

## om-ux-shape specifics

- **Never invent evidence.** No fabricated research, user quotes, metrics, or
  constraints. An unverified belief is labeled as an assumption and given a
  validation path; a provisional persona is not evidence.
- **Recommend, do not enumerate.** One direction with the decisive trade-off
  beats an unranked menu. Rejected options stay internal unless they help the
  reader understand a consequential choice.
- **Depth follows risk.** A small, reversible decision gets a short answer.
  Do not make a low-risk task carry the full process.
- This skill writes no code and touches no tracker item. Its Handoff output is
  written to be consumed by the collection's implementing skills.
