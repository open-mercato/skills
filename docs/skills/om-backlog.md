# om-backlog

> 🧑‍💻 Interactive — acts once, may ask questions, reports, and hands control back

Turns a product brief (its Scope and Key flows) or a spec's Phasing into a tracker backlog: epics for the *Now* items or Phases, stories as user-facing outcomes with Given / When / Then acceptance criteria derived from the brief's Goals and Business rules, tasks only where a story needs decomposition. Ids open every title (`E01`, `E01-S02`), stories carry an `Epic:` line and the decision ids they rely on, epics carry a checklist of their stories. Every issue is filed through `om-prepare-issue`, so dedupe, SDLC labels, and the rationale comment are unchanged; existing issues that cover a story are adopted, never duplicated. It refuses a brief whose problems and users rest on synthetic or assumed claims and offers the research backlog instead, and it shows the whole tree and waits for a yes before writing anything.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{source}` | Yes | Path to `product-brief.md` or to a spec with Phasing. |
| `--epic <id>` | No | File only this epic and its children. |
| `--prefix <letters>` | No | The id prefix in titles. Default `E`. |
| `--assignee <login>` | No | Passed through to `om-prepare-issue` for every issue. |
| `--dry-run` | No | Draft and show the tree, write nothing. |

## Works with

Reads the brief [om-discover](om-discover.md) wrote or a spec from [om-spec-writing](om-spec-writing.md); creates every issue through [om-prepare-issue](om-prepare-issue.md); the result is what [om-auto-manage-issues](om-auto-manage-issues.md) triages and [om-auto-fix-issue](om-auto-fix-issue.md) implements, story by story.

---
*Source: [`skills/om-backlog/SKILL.md`](../../skills/om-backlog/SKILL.md)*
