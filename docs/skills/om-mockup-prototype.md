# om-mockup-prototype

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Builds a clickable, commentable prototype from requirements that already contain user stories, so reviewers can answer "does this flow make sense" **before** implementation starts — the cheapest moment to discover a flow is wrong. The output is a self-contained directory under `<paths.prototypes>/<slug>/` (default `.ai/prototypes/<slug>/`) that renders with no build step, no network, and no installed design system: click-through navigation with visited-screen history, presentation mode for stakeholder walkthroughs, and review comments pinned to the exact element under discussion, persisted in the browser and exportable back into the repository (append-only operation log, deletion tombstones, re-anchoring for orphaned pins). A story gate forces coverage of the unhappy paths: empty, no-access, error, and undo states become screens, not footnotes.

Token values come from the optional `designTokens` config path, the conventional `.ai/ds/ds-tokens.json` snapshot, or a bundled example design system in that order; every prototype carries a `theme.css` with eight identity tokens, so rebranding is editing one file. Prototypes review desktop flows; it does not judge design-system fidelity — that question belongs to a design-system composer where one exists.

## Parameters

- **slug** — kebab-case prototype name; becomes `<paths.prototypes>/<slug>/` (default `.ai/prototypes/<slug>/`).
- **requirements** — path to the requirements document with user stories (the skill gates on them and can add a story map with your approval).

## Works with

Sits between [om-ux-shape](om-ux-shape.md) (decide the direction) and implementation: shape first, prototype the decided flow, then let the pipeline build it — for example via [om-auto-write-spec](om-auto-write-spec.md) or [om-auto-create-pr](om-auto-create-pr.md) — and [om-ux-review-pr](om-ux-review-pr.md) closes the loop on the resulting PR's real UI. When the [om-ux-setup](om-ux-setup.md) contract (`.uxproof/`) exists, initialization pre-fills the repo-local screen-anatomy override from it, so screens match your product's shapes instead of the neutral defaults.

---
*Source: [`skills/om-mockup-prototype/SKILL.md`](../../skills/om-mockup-prototype/SKILL.md)*
