# om-setup-discovery-pipeline

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Adds the product layer to a repository `om-setup-agent-pipeline` already configured. Two questions (is there a domain expert who is not the product owner; is there a designer), then a `discovery` block in `.ai/agentic.config.json`, and the product-layer blocks of the SDLC template inserted into the existing `SDLC.md` between `discovery:start` / `discovery:end` markers: the Product owner role (plus Domain expert and Discovery design when declared), the Discovery stage driven by `om-discover`, an Intake row that requires a ready ticket, the *Definition of Ready*, and *Product decisions as a protected contract*. Also creates `<paths.specs>/research/` and appends one routing row to the task-routing table in `AGENTS.md` when it exists. Additive and idempotent: re-run with `--refresh` after upgrading the collection, and nothing outside the markers is ever touched. A missing delivery setup is run first; missing product skills are named with their install command. Teams that want only the delivery pipeline never run it.

## Parameters

| Flag | Meaning |
|---|---|
| `--defaults` | No domain expert, no designer, `paths.specs` as is; no questions. |
| `--refresh` | Re-render every marked block from the current template and show the diff. |
| `--dry-run` | Show every change; write nothing. |

## Works with

Reads the template and the config-loading snippet from [om-setup-agent-pipeline](om-setup-agent-pipeline.md) and runs it when the delivery layer is missing. Turns on what [om-auto-manage-issues](om-auto-manage-issues.md), [om-auto-fix-issue](om-auto-fix-issue.md), and [om-backlog](om-backlog.md) check tickets against (the Definition of Ready) and what [om-code-review](om-code-review.md) protects (the brief's non-goals, rules, and decisions). [om-discover](om-discover.md), [om-synthetic-users](om-synthetic-users.md), and [om-mockup-prototype](om-mockup-prototype.md) do not require it. [om-apply-upgrade-notes](om-apply-upgrade-notes.md) points at its `--refresh` for the marked blocks.

---
*Source: [`skills/om-setup-discovery-pipeline/SKILL.md`](../../skills/om-setup-discovery-pipeline/SKILL.md)*
