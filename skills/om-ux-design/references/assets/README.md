# {{MODULE}} design prototype

Source: {{REQUIREMENTS}}

This is a portable scaffold. Replace this context with the selected flow's
actual design sources, coverage, launch instructions and checks before handoff.

## Design context

- Scope and source version: record the selected requirements and revision.
- Component and visual sources: link actual files/stories, supplied references
  and the token source printed in `tokens.css`.
- Coverage: map requirement IDs to screen links, roles, states and recovery.
- Simulations: name the backend behavior represented only by local demo state.
- Verification: not run. Record browser, viewport/theme and source-check results.
- Acceptance: pending. Record the owner's acceptance of the exact version.

## Review

Open `index.html` directly, or use the repository's local preview workflow and
an available localhost port. Keep any new server attached to the session and
stop it after review. Preserve the origin while local comments remain unexported.

The toolbar supports click, presentation and comment modes. Comments remain in
this browser until exported. Before replacing a nonempty `comments.js`, merge
operation lists by ID and preserve tombstones. Export before changing the port,
host or directory; retain this design's prototype ID and screen IDs on updates.
Sharing an export or publishing the prototype requires the user's authorization.

## Styling and limits

`tokens.css` is generated; refresh it with the skill's `sync-tokens.mjs` helper.
Adapt `theme.css` identity overrides to the selected design source instead of
letting starter colors override the repository's DS. Record represented component
behavior, icon or translation differences here. Use fictional sample records.
Portable HTML is design source, not production application code.
