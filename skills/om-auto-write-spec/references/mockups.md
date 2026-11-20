# UI mockups and current-app screenshots (step 5)

Visual evidence for a UI-facing spec: what the affected screens look like **today**, and what the spec proposes they look like. Both end up on the spec PR via **attach-image-evidence**. The proposed UI normally already exists as a clickable prototype: `om-spec-writing` builds one with `om-mockup-prototype` for every UI spec (its `Proposed prototype:` line), unless mockups were opted out, declined, or supplied.

## Preconditions

- `--no-mockups` skips this whole visual-evidence step. Preserve any accepted
  design reference already present in the spec; the flag does not revoke it.
- `.ai/agentic.config.json` names a browser provider whose descriptor exists at `.ai/browsers/<provider>.md` — needed for every screenshot. Current-state screenshots (§1) additionally need the `om-prepare-test-env` descriptor (produced or producible); proposed-UI screenshots of a prototype or static mockup (§2) do not.
- Skip only the part whose precondition is missing, preserve existing design references, add a `Mockups: skipped — {reason}` (or `Current screenshots: skipped — {reason}`) line to the PR body, and continue. A committed prototype without screenshots, or a text-only spec PR, is a valid outcome; a failed run is not.

## 1. Current-state screenshots

1. Boot the app through the test-env descriptor (same flow as `om-auto-qa-pr` step 4 — reuse a healthy running env when the descriptor says it is fresh).
2. From the spec's UI/UX section, list the existing screens/flows the feature touches (routes, admin pages, components). Cap at the 3–6 most relevant screens.
3. Drive each screen with the browser-provider operations (open → wait for load → screenshot) into `${SPECS_DIR}/assets/${SLUG}/current-NN-<screen>.png`. Verify each PNG is non-empty.
4. When the app cannot boot or a screen errors, capture what you can and note the gaps — partial evidence beats none.

## 2. Proposed-UI mockups

Read the spec's design references and their context before drawing. When an
accepted detailed design covers the selected screens, reuse that exact version:

1. Verify the accepted scope and version from the spec or supplied acceptance
   evidence. An explicit pending, unaccepted or superseded status takes precedence
   over a legacy `Prototype:` marker. Neither a generated artifact nor a passing
   browser check proves acceptance.
2. Open the accepted design using its own launch record and existing runtime.
   Capture its relevant screens into `${SPECS_DIR}/assets/${SLUG}/` and record
   the source version and routes with the images. Keep the design's source,
   components, comment identity and feedback unchanged; do not generate competing
   HTML for the same accepted scope or copy its runtime into the assets folder.
3. Retain its exact `Prototype:` reference and accepted scope in the spec. If the
   accepted design cannot be reached, keep the reference, report the capture gap
   and continue with available evidence. Do not replace it with invented visuals.

For **new or materially changed** screens without an accepted detailed design,
first honor the spec's mockup decision. When its UI/UX section says
`Mockups: skipped — opted out` or `Mockups: skipped — declined in the request`,
draw no proposed-UI visuals at all — no static fallback — and carry the line
into the PR body. When the authoring step reused supplied material, reference
it in the evidence table. This applies to design links, prose and supplied
local HTML. Generate no competing mockup.

Use a generated prototype only when the authoring step returned its revision
as built by this run. Confirm that its canonical `index.html` path stays within
the configured spec prototype root and that the revision manifest identifies
the current spec. If the spec marks the prototype as predating the current
UI/UX, report that gap and omit proposed-UI screenshots.

1. Reuse the screenshots in the prototype revision's `evidence/` when they cover
   the screens. Otherwise open its `index.html` with the browser provider
   (`open file://…` → walk the flow → screenshot) into
   `${SPECS_DIR}/assets/${SLUG}/proposed-NN-<screen>.png`. Never write into the
   prototype revision itself — `om-mockup-prototype` owns it and its manifest
   hashes.
2. Do not author static HTML for screens the prototype covers. State its
   `Verification:` status with the images; `incomplete` or `not-run` is a
   disclosed limit, not a blocker.

Otherwise use existing supplied proposal visuals when they cover the requested
scope and remain identified as proposals. Only when neither exists and the
spec's line reads `Mockups: skipped — om-mockup-prototype not installed …` or
`Mockups: skipped — om-mockup-prototype stopped: …`, create illustrative mockups:

1. Author a minimal **static HTML file** in `${SPECS_DIR}/assets/${SLUG}/mockup-NN-<screen>.html` — self-contained (inline CSS, no build step, no app code, no external requests). Match the app's rough look (reuse its visible palette/typography from the current-state screenshots) but keep it obviously illustrative; realistic placeholder data, never real user data.
2. Render it with the browser provider (`open file://…` → screenshot) into `mockup-NN-<screen>.png`.
3. Reference each mockup from the spec's UI/UX section by relative path as a
   proposal so the document shows the visuals. Only owner acceptance of a specific
   version and authorization to update the spec permit promoting that proposal
   to its `Prototype:` reference.

Keep it cheap: mockups exist to communicate layout and flow, not pixel-perfect design. 2–4 mockups is the normal ceiling; skip mockups for standard CRUD the spec explicitly calls standard.

An accepted neutral discovery prototype supplies only its declared flow and
states, not a visual-fidelity target. Preserve those boundaries when illustrating
the proposed UI. `om-ux-design` is an optional interactive task for detailed
screens; do not invoke it automatically or block this autonomous spec workflow
on a new design session.

## 3. Publish

Commit the `assets/${SLUG}/` folder with the spec, then (after the PR exists) post one evidence comment via **attach-image-evidence**: `{prNumber}`, a short table mapping each image to its screen + current/proposed role, slug `spec-${SLUG}`, and the PNG paths. The tracker descriptor owns making images render inline; when it cannot, it posts links — surface the limitation and move on.
