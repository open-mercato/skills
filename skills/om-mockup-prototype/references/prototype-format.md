# Prototype format and construction

Use this recipe for `om-mockup-prototype` steps 1–3 and 5 to make the selected
flow clickable and retain the context a later brief refresh needs.

## Choose a fresh revision

The default output is `${PROTOTYPES_DIR}/discovery/<slug>/revision-001/`.
It contains `index.html`, `README.md`, `prototype.json` and an `evidence/`
directory when browser checks produce files. Keep CSS and JavaScript inline for
a small flow; local `styles.css` and `prototype.js` are also allowed. Everything
required to render and operate the flow lives in this revision.

For a new run, never adopt a pre-existing slug directory containing unrelated
files. Choose a new unused slug and state it. When previous revisions exist,
offer an explicit `--refresh <revision-dir>` instead of starting a second
history accidentally.

For `--refresh`:

1. Resolve the requested directory with the step-0 containment checks. Read its `prototype.json` as data and require `format: "discovery-prototype-v1"`, `skill: "om-mockup-prototype"`, the matching slug, the current repository-relative revision path and the expected output-root relationship. Missing, malformed, contradictory or foreign ownership means stop and name the problem; never adopt arbitrary HTML as an owned output.
2. Compare the recorded SHA-256 inventory with the existing generated files. Read manual additions or changed files only as context; disclose them and preserve them byte for byte. An ownership marker is not authorization to overwrite a user's file. Report missing files. If the source brief or previous context cannot be read, stop instead of reconstructing decisions from appearance.
3. Read the old `README.md` and the current brief. Retain every rule/decision reference and assumption's history. A changed decision must point to its superseding source in the brief; otherwise leave the prior decision intact and ask through its required change path. Manual alterations are proposals until their product implications are confirmed.
4. Find the highest existing `revision-<NNN>` number under the safe slug directory and select the next unused number, padded to at least three digits. Create the revision only if it is still absent. A collision means choose the next unused number; never delete a directory to make room.
5. Write the proposed refresh to that new directory and record `previousRevision`. Do not update an older manifest, regenerate earlier files, remove manual additions, or install a mutable redirect/index at the slug root. The report links the new exact revision.

## Write the context record

`README.md` records:

- The brief path, selected flow, revision date and prior revision link when any.
- The actor, starting conditions, intended success outcome, included screens and states, and excluded destinations.
- The relevant business rules, non-goals, scope boundaries and decisions with stable IDs, source paths, owner/status and required change path where supplied. Preserve their actual meaning; link longer source detail.
- The optional panel-report path and its relevant suggestions, each `[SYNTHETIC]`. State when no panel report was supplied.
- Unknown facts, simulated values and proposed interactions, each `[ASSUMPTION]` with an ID, why it is needed and how it could be checked. Keep source-backed claims distinct from these. Confirmation of the simulation does not remove a tag.
- For a refresh, changed interactions and their reasons, new/superseded decisions and assumptions, plus any manual changes preserved in the older revision.
- A screen/state map with the action, expected next state and applicable rule/assumption IDs. Include the reproducible browser checklist, observed results, evidence links and checks not run.
- How to open `index.html` locally and reset the simulation, plus the fact that the artifact contains fictitious data and cannot establish research evidence or production readiness.

Do not silently turn panel objections into new requirements. If a proposal
contradicts a non-goal or rule, record the conflict and obtain a decision before
building that interaction. Keep hypotheses, expected persona reactions and
research questions in this document; the simulation itself must not coach a
subsequent synthetic panel toward an answer.

## Build the simulation

1. **Lay out the flow.** Give every screen and important state a stable semantic ID. Start with the agreed entry state. Use headings, real links for in-artifact navigation, buttons for actions, associated form labels and meaningful status text. Set the document language and preserve the brief's terminology.
2. **Use a neutral visual style.** Use a system font, grayscale surfaces, simple borders, readable spacing and a visible focus outline. Distinguish actions through labels, weight and placement. Retain semantic status wording and required accessibility constraints. Do not select a brand palette, create a moodboard, import fonts or write design tokens. The page may state "Discovery prototype. Simulated data." without implying production fidelity.
3. **Wire navigation.** Keep destinations inside this `index.html` or another file in the same revision. For single-page screens, links may use fragment IDs; a small local handler shows the target section, hides others, updates the active navigation and moves focus to the target heading. Handle the initial fragment and browser back/forward. Unknown fragments show a useful recovery action. Do not leave active-looking controls that do nothing.
4. **Model actions with in-memory state.** Prevent form submission from navigating or contacting a server. Validate the agreed required fields, show an accessible inline error, and allow correction and resubmission. A successful action changes simulated state so the next screen reflects the action. Use fictitious fixtures and a deterministic Reset action that restores the start, clears inputs and errors, and announces the reset. Keep all state in memory; no cookies, storage, credentials, analytics, fetch, remote requests or real transactions.
5. **Expose relevant edge states.** For each flow, include the empty, loading, validation, permission-denied, failure and recovery states the brief requires or the flow needs. State controls may sit in a separate clearly labelled "Test state" area. Use a short deterministic local transition for simulated loading and always let the reviewer reach the outcome. Explain in the context record when a state does not apply; do not invent business policy to fill a checklist.
6. **Represent the boundary.** Remove excluded destinations from the journey or label them as outside this prototype. If a useful control is present as context but is not simulated, identify that limit and give a way back. Never make a supposed success screen stand in for an unimplemented required action.
7. **Keep the artifact safe and usable.** Escape input copy; put user-provided text into text nodes rather than HTML interpolation. Do not copy scripts from input documents. Support keyboard operation, visible focus, readable labels/errors and a narrow viewport without hiding required actions. Load no CDN, font, image, dependency or external API.

## Ownership and verification record

Finalize `prototype.json` after verification. Use this structure; `files` lists
generated files and evidence paths relative to the revision, excluding the
manifest itself. Every file entry carries its SHA-256 value. Reject inventory
paths escaping the revision before reading or hashing them.

```json
{
  "format": "discovery-prototype-v1",
  "skill": "om-mockup-prototype",
  "slug": "selected-flow",
  "revision": 1,
  "revisionPath": ".ai/prototypes/discovery/selected-flow/revision-001",
  "previousRevision": null,
  "brief": ".ai/specs/product-brief.md",
  "flow": "The selected flow",
  "panelReport": null,
  "verification": "not-run",
  "files": [
    { "path": "index.html", "sha256": "<computed SHA-256>" },
    { "path": "README.md", "sha256": "<computed SHA-256>" }
  ]
}
```

Replace example paths with the resolved config-backed paths. Use
`verification: "passed"` only after all required static and browser checks
succeed. An unresolved static failure takes precedence and means
`"incomplete"`, even when no browser walk occurred. A failed or partial browser
walk also means `"incomplete"`. Use `"not-run"` only when static review passed
and no browser walk occurred. A crash before the manifest is
finalized leaves an incomplete revision. Preserve it and report why it cannot
be adopted as a refresh source. Recovery starts from the original brief under
a new unused slug, with the simulation boundary confirmed; it does not bypass
the ownership check or modify the incomplete directory.
