# om-eject-and-customize

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Use this when you need to change part of an installed dependency — a module, component, template, or plugin — beyond what its extension points allow. Ejecting copies that part into your repository, and from then on your repository owns its upgrades, so the skill first checks whether configuration, an extension point, an override, an add-on package, or an upstream fix would do instead. When nothing smaller works, it follows the eject recipe the dependency itself ships (found through the `knowledge.sources` config key or your `AGENTS.md` Task Router): the supported command, where the copy lands, how the app switches to it, and which contracts must stay intact. You see the exact command, paths, and rollback before anything changes. After the eject it records the dependency, exact version, and a checksum of every ejected file in a provenance ledger, so a later upgrade can tell upstream changes from yours. If the dependency ships no recipe, the skill stops and changes nothing.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{target}` | Required | The dependency and the part to eject, or a path inside the installed dependency. |
| `--reason <text>` | Optional | The behavior the eject is for; asked for when omitted. |
| `--dry-run` | Optional | Run the decision gate and print the plan, change nothing. |

## Config

Reads `knowledge.sources` and `validation.commands` from `.ai/agentic.config.json` when present, plus the optional `paths.ejectLedger` (default `.ai/ejected.json`). Works without a config: the gate then comes from your `AGENTS.md`.

## Works with

Leaves changes uncommitted and suggests [om-check-and-commit](om-check-and-commit.md) to validate and commit — first the unmodified copy and ledger, then the customization.

---
*Source: [`skills/om-eject-and-customize/SKILL.md`](../../skills/om-eject-and-customize/SKILL.md)*
