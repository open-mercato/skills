# om-mockup-prototype

> 🧑‍💻 Interactive: creates one local prototype after confirming the flow.

Turns a selected product-brief flow and its first synthetic panel into neutral
clickable screens. It runs during discovery, before the brief refresh and
backlog. The prototype uses simulated data and visible assumptions, so the team
can check navigation, states and recovery before committing to detailed design.
It keeps the repository's design contract and application code unchanged.

In **spec mode** (`--spec`), [om-spec-writing](om-spec-writing.md) calls it to
mock up the UI a feature spec proposes; autonomous spec runs pass `--autonomous`,
which records the simulation boundary as visible assumptions instead of asking.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{brief}` | No | Product brief; defaults to `<paths.specs>/product-brief.md`. |
| `--flow <name>` | No | Flow from the brief to make clickable. |
| `--panel-report <path>` | No | First synthetic-panel report for this flow. |
| `--slug <slug>` | No | Name of the prototype under `<paths.prototypes>/discovery/`. |
| `--spec <path>` | No | Feature spec to prototype instead of a brief (spec mode); output under `<paths.prototypes>/specs/`. |
| `--autonomous` | No | Spec mode only: no confirmation question; open choices become recorded assumptions, never business policy. |
| `--refresh <directory>` | No | Create a new revision of an existing discovery or spec prototype, preserving earlier revisions and manual changes. |

`paths.prototypes` defaults to `.ai/prototypes` without setup questions. Each
revision contains `index.html`, its context in `README.md`, a `prototype.json`
manifest and browser evidence. The final report emits `Prototype:`,
`Prototype context:`, `Verification:` and `Next:`; incomplete browser checks
remain explicit.

## Works with

[om-discover](om-discover.md) writes the brief and offers the prototype after the
first [om-synthetic-users](om-synthetic-users.md) panel. A separately accepted
walkthrough can inspect the resulting screens, then `om-discover --refresh`
records hypotheses and confirmed decisions before [om-backlog](om-backlog.md)
checks readiness. A prototype approval does not establish demand or usability.

[om-ux-setup](om-ux-setup.md) extracts an implemented design system for the later
detailed design stage. This prototype creates neither tokens nor a moodboard.

---
*Source: [`skills/om-mockup-prototype/SKILL.md`](../../skills/om-mockup-prototype/SKILL.md)*
