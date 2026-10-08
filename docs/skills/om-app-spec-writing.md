# om-app-spec-writing

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Writes and reviews the App Spec: the business architecture document that sits one level above feature specs, written before any feature spec or code exists. It asks you what has no other source — who pays, the flywheel, the measurable goal, what is out of scope — then builds the domain glossary, precise entity fields, the identity model, 3–7 workflows with measurable ROI, user stories with alternate and failure paths, and a cross-story impact matrix. Every story is mapped onto what the platform the app builds on already offers, read from the platform's own knowledge (the repository's `AGENTS.md` and the optional `knowledge.sources` slot), and scored in atomic commits. A fresh-context DDD challenger reviews every major section and an architect subagent checks each gap matrix for missed platform capabilities and overengineering. Nothing is implemented until you confirm the App Spec.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{brief}` | yes | The app name and the business need; with `--review`, the path to an existing App Spec. A `— brief: <path>` suffix reads an `om-brainstorm` handoff brief first. |
| `--review` | no | Review an existing App Spec: section checklists plus challenger, severity-ranked findings. Never edits the spec. |
| `--stories <file>` | no | Story-critique mode for a caller such as `om-gap-analysis`: returns proposed missing stories, paths, and contradictions for an external story list; writes nothing. |

## Works with

Writes the App Spec to the configured specs directory (`paths.specs`, default `.ai/specs`) as `{YYYY-MM-DD}-app-spec-{app}.md`, with notes and the capability catalog under `app-spec-notes/`. After your confirmation it cuts the App Spec into one feature brief per independently deployable capability under `briefs/` and hands each to [om-spec-writing](om-spec-writing.md) (or, for unattended authoring, [om-auto-write-spec](om-auto-write-spec.md)) — the brief's Resolved-unknowns table pre-answers that skill's Open Questions gate, and the App Spec stays the source of truth. When `platform.repo` is configured, mappings that decide a phase are grounded through [om-gap-analysis](om-gap-analysis.md)'s single-capability mode instead of trusting documentation.

---
*Source: [`skills/om-app-spec-writing/SKILL.md`](../../skills/om-app-spec-writing/SKILL.md)*
