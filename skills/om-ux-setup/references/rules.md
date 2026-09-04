# Shared rules

Canonical rules shared by every skill in this collection. They always apply,
in addition to the skill-specific rules in the skill body. On conflict, the
stricter rule wins.

- **Interactive run — a user is in the loop.** This skill acts once, asks the
  questions only the team can answer, reports, and hands control back. It is
  not an `om-auto-*` skill: it chains no further skills and continues past the
  report only when asked.
- **Secrets hygiene.** Never paste secrets, tokens, `.env` content, or raw
  credentials into the contract, reports, or logs. The contract describes
  design, not configuration.
- **Emoji glossary** in user-facing output: 🎯 goal · 📋 plan · 📝 spec · 🏷️ labels · 📸 evidence · 🔍 review · 🧪 tests · 💥 breaking · ✅ pass · ❌ fail · ⚠️ needs-human · ⛔ blocked · 🔁 resume · 🚀 merge/release. Emojis decorate; parsers key on text markers only.
- **Reporting style.** Lead with the outcome or recommended action and the concrete reason. Explain what changes for whom in everyday language; use before/after behavior when useful. Include technical names only to locate evidence or explain a consequence. Avoid process narration, generic praise, repeated conclusions, and empty `None`/`N/A` sections.
- **One explanation, updates elsewhere.** The PR or issue body explains the current change; keep it current when this skill owns that body. Reviews add findings; run comments add changes since the last report, evidence, blockers, or a handoff. Link existing detail instead of repeating it. Preserve the claim, label, assumption, evidence, and release comments this workflow requires, updating their stable markers in place.
- **Decision evidence.** Within this skill's scope, separate direction/scope questions from verified defects. State the affected behavior, consequence, and next action; cite code or the repository rule behind a finding. Distinguish observed facts, inferences, and checks not run. Qualify absence claims by where you searched. A planned consumer or missing document alone is not proof of a defect.
- **Useful detail only.** Include cross-system effects, durable contracts, defaults imposed on users, and rollback limits when they affect the decision. Use a small Mermaid flow or dependency diagram when relationships are clearer than prose; label current, changed, and planned parts accurately and add a one-sentence takeaway. Do not add an intake document or diagram for every change.
- **Length follows the decision.** Aim for 150–300 words for a substantive PR/issue body, 40–100 for a routine update, and 3–6 lines for a final handoff; simple work needs less. These are editing targets, not caps. Keep every actionable finding, required evidence, material uncertainty, and recovery instruction. Put long logs and inventories in linked artifacts or collapsible detail.
- **Template contract.** Use the skill's template for its purpose and required fields; omit optional sections that add no information. Preserve exact machine fields, verdicts, stable comment markers, and chaining lines even when shortening prose. The complete agent artifact stays complete when a skill defines a shorter human projection; disclose omitted counts and link the full findings. Use glossary emojis for meaningful headings or states, and backticks around skill names in human-facing prose.
- **Reader's language over method vocabulary.** Report what was found in the
  repository and what it means for the team, not the names of the extractor's
  internal steps.

## om-ux-setup specifics

- **Extract, do not judge.** This skill writes the contract and hands it over.
  Producing findings, verdicts, or a review of code, screens, or mockups is
  out of scope even when the user's wider goal is an evaluation: name the
  skill that owns that work and let the user invoke it.

- **Never regenerate silently.** An existing contract is team knowledge under
  review. When one is present, say what a refresh would change and let the
  user decide.
- **The manual section is sacred.** Everything between the manual markers in
  `conventions.md` survives every regeneration. If a tool or a step would
  drop it, stop and report ⛔ rather than losing the team's own rules.
- **Proposed is not enforced.** In a repository with no declared tokens, the
  derived palette is documentation of what the code already does. It never
  arms the audit and is never cited as a `[PRODUCT]` rule until the team
  declares real tokens.
- The contract is committed like code. Treat a contract change as a code
  change: reviewable, diffable, and explained in the commit.
