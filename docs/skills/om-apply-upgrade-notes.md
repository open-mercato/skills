# om-apply-upgrade-notes

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Run this after upgrading the OM skills collection to bring the artifacts a previous run installed into your repo back in sync. Upgrading refreshes the skill instructions themselves, but not the tracker descriptors (`.ai/trackers/<tracker>.md`) or browser-provider descriptors (`.ai/browsers/<provider>.md`) already sitting in your repo — and a stale descriptor can quietly degrade or skip operations. The skill reads the collection's `UPGRADE_NOTES.md`, diffs installed descriptors against the freshly shipped versions, adds missing operations and config keys, preserves every local customization (asking before touching an edited section), reports gaps for custom providers, and summarizes exactly what changed. It only touches pipeline artifacts under `.ai/` and leaves the changes uncommitted for your review.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--dry-run` | Optional | Report every change it would make, but apply nothing. |
| `--tracker <name>` | Optional | Override which tracker to sync. Defaults to the config's `tracker`. |
| `--browser <name>` | Optional | Override which browser provider to sync. Defaults to the config's `browser.provider` (or `playwright` on an older config). |
| `--yes` | Optional | Apply purely additive, non-conflicting changes without confirmation. Conflicting changes still require an explicit answer. |

## Works with

Consumes the collection's `UPGRADE_NOTES.md` plus the shipped descriptor sources under [om-setup-agent-pipeline](om-setup-agent-pipeline.md), and stops early pointing at it when `.ai/agentic.config.json` is missing. It edits only `.ai/` pipeline artifacts and config, then suggests committing the diff via [om-check-and-commit](om-check-and-commit.md) before re-running whichever skill degraded.

---
*Source: [`skills/om-apply-upgrade-notes/SKILL.md`](../../skills/om-apply-upgrade-notes/SKILL.md)*
