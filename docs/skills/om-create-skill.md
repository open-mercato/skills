# om-create-skill

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Authors a new OM skill from a brief, or splits an oversized `SKILL.md` into layered `references/` files without changing behavior. It follows the repo's layering philosophy — a thin router-and-map body with execution detail loaded on demand — and understands the lint invariants, tracker-operation abstraction, and shared pipeline contracts so output matches house conventions. It is interactive by default (asking only the questions that change the output) and refuses to hand back anything that fails `scripts/lint.sh` or the completeness gate. Use it for "create a skill for…", "new om-skill", or "split this skill into references".

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{brief-or-skill-name}` | Yes | In author mode, a free-form description of what the skill should do; in split mode, the name of an existing skill under `skills/`. |
| `--mode <author\|split>` | Optional | Override the auto-detected mode. |
| `--dry-run` | Optional | Plan and print the files it would write, but write nothing. |

## Works with

Runs against the skills repository itself, using no pipeline config vars or tracker operations of its own. It has no companion skills in its chain; instead it bakes the shared tracker-operation vocabulary and pipeline protocols into the skills it generates, and gates every result on `scripts/lint.sh` plus the completeness checks.

---
*Source: [`skills/om-create-skill/SKILL.md`](../../skills/om-create-skill/SKILL.md)*
