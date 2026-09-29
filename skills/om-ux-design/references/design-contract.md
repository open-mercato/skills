# Design sources and runtime selection

Use this in `om-ux-design` step 2 to choose how to build the selected screens.

## Existing components and prototype runtime

Inspect the repository's prototype entry point, build/launch scripts, component
exports and stories. Reuse that runtime and its real components when it can
represent the selected flow. Trace the shell, forms, navigation, feedback and
other repeated patterns to their source files. Respect their variants, spacing,
action order, language, themes and breakpoints. Token reuse alone does not make
a hand-written substitute equivalent to the component.

If an existing preview fails, diagnose the failure using its documented workflow.
A failed build or unavailable process is not evidence that the project needs a
second prototype stack. If the chosen flow cannot be represented there, explain
that concrete limitation before changing the approach. Do not install a new
framework or replace a working prototype environment as routine setup.

Use the registry and archetypes in `.uxproof/` as an index, then verify the actual
files and current UI. If they disagree, retain manual conventions, identify the
stale source, and resolve the affected design choice from the project's authority.
Do not silently edit `.uxproof/` to make a new screen pass. A missing component
is a specific design gap: propose its behavior and location, and implement it
only when that is within the user's requested scope.

## Portable HTML

Use the bundled scaffold when no suitable runtime exists, or the user requests a
self-contained HTML artifact. It runs without a framework build. Its CSS and
screen patterns are starter assets, not an approved design system. Adapt them to
the supplied references and verified project conventions. Record the components
being represented and deviations that the HTML cannot reproduce.

The helper's token order is `.uxproof/tokens.json`, configured `designTokens`,
legacy `.ai/ds/ds-tokens.json`, then the bundled default. Read
`references/ds-tokens.md` for both schemas and failure behavior. When `.uxproof/`
and `designTokens` coexist, identify that `.uxproof/` won and investigate relevant
visual disagreement instead of claiming the explicit snapshot was used. A native
runtime continues to use its own actual styles; this CSS adapter is portable-only.

## No design system

Read any product screens and user-supplied visual references first. Establish a
small coherent proposed direction for the selected flow, using the representative
screen to settle type, spacing, color, controls and density. A bundled default is
only a starting proposal. Label what is proposed, what is derived from existing
UI and what the owner already accepted.

Do not claim DS fidelity when no DS exists, create `.uxproof/` as a side effect,
or block all design work on installing another skill. If the task includes
extracting an existing system, use `om-ux-setup` when available or record the
same sources manually within the design context. Refreshing an existing contract
requires explicit authorization. Keep proposals local until the owner accepts
and chooses where they become a maintained design contract.
