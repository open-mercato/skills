# Shared rules

Canonical rules shared by every skill in this collection. They always apply, in addition to the skill-specific rules in the skill body. On conflict, the stricter rule wins.

- **Interactive run — a user is in the loop.** This skill asks what only the team can answer, in several stops, reports, and hands control back. It is not an `om-auto-*` skill: it chains no further skills and starts no implementation.
- **Secrets hygiene.** Never paste secrets, tokens, `.env` content, or raw credentials into the contract, the moodboard, or reports.
- **Marker contract.** Chaining reference lines go on their own lines at the end of the final report — human-readable and machine-parseable, exact shape: `PR: #<number> (link: <full PR URL>)`, `Issue: #<number> (link: <full issue URL>)`, `Spec: <repo-relative path>` where a skill defines them. Never rename, translate, omit, or decorate the label part.
- **Emoji glossary** in user-facing output: 🎯 goal · 📋 plan · 📝 spec · 🏷️ labels · 📸 evidence · 🔍 review · 🧪 tests · 💥 breaking · ✅ pass · ❌ fail · ⚠️ needs-human · ⛔ blocked · 🔁 resume · 🚀 merge/release. Emojis decorate; parsers key on text markers only.
- **Reporting style.** User-facing output is a deliverable, not a log: complete sentences, the why behind every principle, token choice, and exclusion, sections structured with the glossary emojis. Never compress reporting to save tokens. Fill the shapes in `references/report-templates.md` exactly.
- **Reader's language over method vocabulary.** The contract is read by people building screens and by other skills: rules are written as what to do on a screen, not as design theory.

## om-ux-style specifics

- **Additional markers.** `Design contract:`, `Theme:`, `Moodboard:`, and `Next:` (exact shapes in the skill body's Output contract) — same exactness rules as `PR:`/`Issue:`/`Spec:`.
- **Never invent a reference.** A moodboard entry has a source (a link, a file, a product the user named) and a chooser. An agent-suggested reference is marked as a suggestion until the user keeps it; an agent-proposed value that no reference decides (a hue, a radius) is marked *proposed* and stands only once confirmed. A link the agent cannot open is recorded with the user's own description of what it teaches.
- **The manual section is sacred** (as in `om-ux-setup`): this skill appends inside the markers and never rewrites what a human wrote there; on `--refresh`, superseded rules are marked, not removed.
- **Both themes, by default.** A token family without a dark value is incomplete unless `--no-dark` was passed and the contract records that choice.
- **The generic look is an anti-pattern.** Its signatures are listed in `references/quality-gate.md`; a contract that reproduces them is not ready.
