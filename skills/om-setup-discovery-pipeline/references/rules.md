# Shared rules

Canonical rules shared by every skill in this collection. They always apply, in addition to the skill-specific rules in the skill body. On conflict, the stricter rule wins.

- **Interactive run — a user is in the loop.** This skill acts once, asks the questions only the team can answer, reports, and hands control back. It is not an `om-auto-*` skill: it chains no further skills and continues past the report only when asked. The autonomous-run contract applies only under `--defaults`.
- **Secrets hygiene.** Never paste secrets, tokens, `.env` content, or raw credentials into the config, `SDLC.md`, reports, or logs. Names, handles, and emails count: roles are flags.
- **Emoji glossary** in user-facing output: 🎯 goal · 📋 plan · 📝 spec · 🏷️ labels · 📸 evidence · 🔍 review · 🧪 tests · 💥 breaking · ✅ pass · ❌ fail · ⚠️ needs-human · ⛔ blocked · 🔁 resume · 🚀 merge/release. Emojis decorate; parsers key on text markers only.
- **Reporting style.** User-facing output is a deliverable, not a log: write complete sentences and explain the why behind every change you report. Never compress reporting to save tokens. Fill the shape in `references/report-templates.md` exactly and expand with detail.
- **Marker contract.** This skill emits no chaining reference lines (`PR:` / `Issue:` / `Spec:`); the markers it owns are `<!-- discovery:start -->` / `<!-- discovery:end -->` in `SDLC.md` and `<!-- discovery:routing-start -->` / `<!-- discovery:routing-end -->` in the agent instruction file, and nothing else in the collection writes between them.

## om-setup-discovery-pipeline specifics

- **Additive, marked, reversible.** Everything this skill writes into an existing file sits between its markers, so removing the layer is deleting the marked blocks and the `discovery` key. Say so in the report the first time.
- **No tracker, no claims, no labels.** This skill touches files only; it names no tracker operation and applies no label.
- **One source of truth for the template.** The blocks are rendered from `om-setup-agent-pipeline/references/sdlc-template.md`; never paraphrase them here or keep a second copy.
