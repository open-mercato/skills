# om-spec-writing

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Writes and reviews feature specifications to staff-engineer standards. It drafts skeleton-first with a hard Open Questions gate (it stops and waits for your answers before designing), researches against open-source market leaders, and breaks delivery down into phases and testable steps that each leave the app working. Specs that add or change entities include a Mermaid data-model graph by default, with an optional interactive local HTML view. It can also produce a severity-ranked architectural review of an existing spec.

## Parameters

| Parameter | Description |
|---|---|
| `--autonomous` | Resolves Open Questions with documented, reversible defaults for unattended runs. |
| `--data-model-graph` / `--no-data-model-graph` | Enables or disables step 6 graph generation; enabled by default and the last flag wins. |

## Works with

Writes specs into the configured specs directory (`paths.specs`, default `.ai/specs`) using the `{YYYY-MM-DD}-{kebab-case-title}.md` filename shape. Interactive graph views use `paths.dataModel` (default `.ai/data-model`); autonomous runs keep only the Mermaid diagram embedded in the spec. Its phased implementation breakdown maps directly onto [om-auto-create-pr](om-auto-create-pr.md)'s execution plan (spec referenced as `Source doc:`), and once a spec ships as a PR [om-followup-issue-from-pr](om-followup-issue-from-pr.md) can file the `Implement:` tracking issue.

---
*Source: [`skills/om-spec-writing/SKILL.md`](../../skills/om-spec-writing/SKILL.md)*
