# Upgrade notes

Upgrading the skills themselves is easy — re-run `npx skills add open-mercato/skills --skill '*'`
(or `git pull` in a symlinked local checkout) and the new skill instructions are live on the next
invocation. What does **not** auto-update is everything a skill previously **installed into your
repository**. Those files are yours, they may carry your local edits, and the skills execute
against them — not against the copies shipped in this repo:

| Installed artifact | Installed by | Updated how |
|--------------------|--------------|-------------|
| `.ai/trackers/<tracker>.md` (tracker descriptor — the file every tracker operation executes from) | `om-setup-agent-pipeline` | Manual re-sync (see below) |
| `.ai/browsers/<provider>.md` (browser automation and autonomous provisioning operations) | `om-setup-agent-pipeline` | Manual re-sync (see below) |
| `.ai/agentic.config.json` | `om-setup-agent-pipeline` | Re-run `/om-setup-agent-pipeline`; it preserves answers where it can |
| `SDLC.md`, `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`, `AGENTS.md` starter | `om-setup-agent-pipeline` | Regenerated only when missing — edit or regenerate deliberately |
| `.ai/skills/<name>/SKILL.md` repo-local overrides | you | Never touched by upgrades; review them against new skill behavior |

## 2026-09-08 — The generated SDLC.md names the QA and design skills it always had

The lifecycle table drove every stage with a skill except one: QA read `QA reviewer (manual)`, and no QA or design skill appeared anywhere in the document. `om-prepare-test-env`, `om-auto-qa-pr`, and `om-integration-tests` have shipped for months and are documented on the QA role page; a reader of `SDLC.md` alone would conclude QA is the stage the collection does not help with, and a role matrix drawn from this file says so in as many words. Four additive changes to `skills/om-setup-agent-pipeline/references/sdlc-template.md` and to this repository's own `SDLC.md`:

- **The QA row names its tools.** Boot the app once with `om-prepare-test-env`, walk the change with `om-auto-qa-pr` (screenshots and a pass/fail report, no labels touched by default), keep the flow worth keeping as `om-integration-tests` coverage. The gate itself is unchanged: `qa-approved` is applied by a person, and the "Done when" column now says so explicitly.
- **A Design row between Claim and Implement**, driven by `om-ux-shape` or a human designer, scoped to user-facing changes and skipped by every other ticket. Its "Done when" is the flow and its states being decided, not an artifact.
- **The Review loop row gains the design pass.** `om-ux-review-pr` walks a user-facing PR's screens; the row states that it is advisory and does not hold the merge, which is the behavior the skill already had.
- **A Designer role and a rewritten QA reviewer role.** "Manually exercises" became "manual means a person judges the result and owns `qa-approved`; it does not mean the work is unassisted" — the distinction the previous phrasing lost. `om-ux-setup` is named in *Amending this process* as one-time setup, next to `om-setup-agent-pipeline`, because a design contract is not a per-ticket stage.
- **Migration:** an existing `SDLC.md` is never regenerated, so copy the QA row, the Design row, the Review loop row, and the two role bullets from the template by hand. No skill behavior, label, or gate changes — this is the document catching up to what the skills already do, so a repository that skips the migration keeps working exactly as before.

