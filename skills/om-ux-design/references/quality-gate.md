# Verification before design handoff

Use this at `om-ux-design` step 5; record observed results, not intended coverage.

Run the consuming repository's checks appropriate to changed source and scripts.
Use the configured browser descriptor to open the actual prototype. Reuse a
healthy preview server. If one is needed, choose an available local port, bind
only to localhost, keep the process attached and stop it after the review. Do not
stop a user's existing server or reset their browser session/storage.

Walk the selected tasks from entry through completion and recovery, as each
relevant role. Compare the requirement/state map with the reachable screens.
Verify navigation context, saved/unsaved data, failed-submit preservation,
validation messages, return navigation and access boundaries where applicable.
An illustrative control has an explicit limitation; it cannot count as a passed
interaction. Fix console/runtime failures that occur in the changed flow.

Inspect the representative screen and each materially different state against
its actual component stories, conventions and provided visual references. Check
long content, layout/reading widths, action hierarchy, keyboard/focus and overlays.
Use the product's narrow and wide viewports and supported themes. Capture key
screens and defects as local evidence with the screen/state and viewport named.
Do not claim visual conformance from token generation or isolated render tests.

When review markup or the engine changes, check comment creation on an input and
button, reply focus, reload persistence, resolve/unresolve, correct pin placement,
re-anchor after structure changes, deletion tombstones, both exports and isolation
from another prototype on the same origin. Verify the text still points to its
intended element, including when a positional anchor still resolves elsewhere.
Keep existing local feedback and exports intact throughout verification.

Status is `ready-for-review` only after the selected flow, required visual checks
and applicable source tests pass. It is `incomplete` when a required screen,
interaction or browser pass is missing. A no-DS proposal can be ready for review
with its limitation stated, but cannot claim fidelity to an absent DS. Human
acceptance is always a separate record. Do not claim `ready for implementation`
until both verification and acceptance are complete and blocking decisions are
settled. Report exactly what was not checked and why.
