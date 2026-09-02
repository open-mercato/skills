# Shared rules

Canonical rules shared by every skill in this collection. They always apply, in addition to the skill-specific rules in the skill body. On conflict, the stricter rule wins.

- **Label discipline.** Every label mutation goes through the guards from the tracker descriptor (`apply_issue_label` and its removal counterpart) — never raw tracker label calls. Missing labels degrade to a logged skip. Never pipeline labels, `in-progress`, or `qa-approved` on an issue. `labels.enabled: false` → skip all label work and note it in the report. Labels on backlog issues are applied by `om-prepare-issue` at creation; this skill adds none of its own.
- **Label commentary.** One marker-idempotent `🏷️ label rationale` comment per skill per issue explains the label set — `om-prepare-issue` posts it; this skill never posts a second one.
- **Claim etiquette.** Run the three-signal in-progress check before touching an existing issue; this skill takes no claim of its own and never modifies an issue another actor is actively working on beyond adding the `Epic:` line and the checklist entry, which it does with a comment saying why.
- **Secrets hygiene.** Never paste secrets, tokens, `.env` content, raw credentials, or personal data from research notes into issue bodies, comments, or the backlog record.
- **Marker contract.** Chaining reference lines go on their own lines at the end of the final report — human-readable and machine-parseable, exact shape: `PR: #<number> (link: <full PR URL>)`, `Issue: #<number> (link: <full issue URL>)`, `Spec: <repo-relative path>` where a skill defines them. Never rename, translate, omit, or decorate the label part.
- **Emoji glossary** in user-facing output: 🎯 goal · 📋 plan · 📝 spec · 🏷️ labels · 📸 evidence · 🔍 review · 🧪 tests · 💥 breaking · ✅ pass · ❌ fail · ⚠️ needs-human · ⛔ blocked · 🔁 resume · 🚀 merge/release. Emojis decorate; parsers key on text markers only.
- **Reporting style.** User-facing output — the tree shown for confirmation, issue bodies, the final report — is a deliverable, not a log: complete sentences, the why behind every epic split and every adopted issue, sections structured with the glossary emojis. Never compress reporting to save tokens. Fill the shapes in `references/report-templates.md` exactly.

## om-backlog specifics

- **Interactive — user in the loop.** The tree is shown and confirmed before any write; this skill has no autonomous mode and must never be driven by an `om-auto-*` skill.
- **Additional markers.** `Backlog:`, `Issues:`, and `Next:` (exact shapes in the skill body's Output contract) — same exactness rules as `PR:`/`Issue:`/`Spec:`.
- **Adopt, never duplicate.** An existing issue that covers a story is linked into the tree with its own number; a re-run finds tree issues by the id in the title and updates them.
- **Outcomes, not tasks.** A story states what a user can do afterwards and how to check it; work with no user-facing outcome is a task under a story.
