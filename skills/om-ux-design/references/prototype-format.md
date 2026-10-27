# Output, revision and review preservation

Read this before creating or updating output in `om-ux-design` step 4.

## Existing runtime

Use its source, navigation and review conventions. Keep generated previews
separate from maintained source according to the repo. Record the source files,
launch command, route, selected source revision and deep links in its existing
README/handoff. Do not duplicate an existing review engine. If no comment engine
exists, a screen-linked feedback record is sufficient unless anchored comments
were requested; report that limitation instead of claiming browser annotations.
The bundled DOM engine is not a drop-in React lifecycle adapter.

## New portable prototype

Validate the slug and run from the consuming repository root:

```bash
node <skill-base-dir>/scripts/init-mockup.mjs <slug> --requirements <source-path>
```

This creates `<paths.prototypes>/<slug>/` atomically, generates `tokens.css` and
scaffolds the local anatomy reference only if missing. An existing destination
is an error; do not delete it to make initialization pass. Adapt `index.html`,
local styles and demo behavior to the selected design. Keep the review toolbar
outside product content. Every reviewed screen has a unique permanent ID, a
human name and requirement references. The portable engine records positional anchors; keep reviewed DOM structure
stable where possible and re-anchor affected threads after inserting siblings.

Update the generated README to record source/scope, runtime mode, DS/component
sources, requirement/state map, simulations, supported viewport/theme checks,
launch instructions and acceptance status. Include source paths and screen links.
Do not label an untouched scaffold ready. Native prototypes can keep equivalent
information in their existing handoff instead of creating another document.

## Editing reviewed work

Inspect dirty source and existing handoff before touching a prototype. Update
only the requested scope. Preserve its `data-prototype-id`, screen IDs and the
`om-prototype-comments:v2:<prototypeId>` storage key. Local browser operations
also belong to an origin: changing the port or host does not carry them along.
Export local comments from the existing origin before any required move. If that
browser state is unavailable, leave the origin/identity unchanged and disclose
that pending comments could not be verified.

Preserve a copy of the accepted source and exported feedback before revising it,
using the repository's versioning practice. Keep its accepted `Prototype:` link
resolvable to that version; create a proposal reference for the new work. Do not
silently make an accepted URL serve a different proposal. Never overwrite a
nonempty `comments.js` with the starter's empty log. Merge exported operation
lists by immutable operation ID and retain deletion tombstones; do not merge only
the reconstructed visible threads. Independent designs get different prototype
IDs. A moved copy of the same design must retain its identity and imported log.

The engine's positional anchor fallback can bind to the wrong sibling after DOM
changes. Preserve any native runtime anchor mechanism and inspect each affected
pin against its thread text; a pin that renders is not proof it is correct. Use
Re-anchor for a moved target. Keep orphaned text available, and verify reply focus,
resolve/unresolve, deletion, reload and export after changes to reviewed structure.
Comments are local feedback until exported and shared through an authorized action;
the engine does not provide live collaboration.

## Acceptance

Record the exact source version and the owner's acceptance evidence. Browser
verification and human acceptance are separate. Put pending work under a normal
proposal link with `Acceptance: pending`; do not add it to the spec's authoritative
`Prototype:` field. Once the owner accepts the version and authorizes the spec
update, set `Prototype: <repo-relative path>` in UI/UX to its reproducible entry
point or launch record. Preserve `--no-mockups` in spec-authoring and reuse an
existing accepted design instead of creating parallel illustrative screens.
