# Prototype quality gate

Run this gate for `om-mockup-prototype` step 4 and record the results in the
revision's `README.md`. Passing proves the local simulation works, not that its
product assumptions are true.

## Static review

- Every required screen/action in the confirmed flow has a destination and expected state; included edge/recovery states match the brief. No rule, non-goal or owned decision changed without its stated change path.
- Context records identify sources, assumptions, synthetic suggestions and unsupported policy choices. The UI itself contains no persona-coaching text or expected research conclusions.
- HTML/CSS/JavaScript references are local to the revision. Inspect all destinations, form actions, scripts, stylesheets and assets; reject external URLs, network APIs, dependency imports, storage and accidental application endpoints. Form handlers prevent real submission.
- Check semantic headings, labels, buttons/links, useful validation text, focus visibility, appropriate contrast, and responsive layout. All records are fictitious. Do not infer successful keyboard use from markup alone.
- The output path and refresh history satisfy the ownership rules. Older revisions, manual files, `.uxproof/`, the brief and production code remain unchanged.

A failing static check requires a fix within the new revision or an explicit
incomplete result. Do not open a prototype containing out-of-scope scripts or
destinations until the unsafe content is removed.

## Browser procedure

Use the descriptor selected by step 0. Never invent its CLI syntax or reach for
another browser tool when the named capability is unavailable.

1. Call **open** with the verified local `file://` URL for this revision's `index.html`, in an isolated session.
2. Call **snapshot** to observe the accessible structure. Locate controls from that result, never from guessed selectors.
3. Follow the chosen journey with **interact**. After each required transition use **snapshot** and **assert** for the expected heading, status or data. Capture **screenshot** at the entry, meaningful transition outcomes, error/recovery states and completion. Save evidence only inside this revision's `evidence/`.
4. Exercise each relevant edge state, including an invalid submission followed by correction where a form exists. Check that recovery reaches the intended state and that a completed action changes the displayed simulated data.
5. Exercise in-artifact back navigation, browser back/forward for fragment navigation, an unknown fragment's recovery, and Reset. Confirm Reset restores the start and removes the old simulated outcome. Check keyboard traversal, visible focus, heading focus after navigation, useful announced errors/statuses and a narrow viewport when the provider supports those operations.
6. Record the action, expected result, observed result and evidence path for each required check. Fix failed prototype behavior inside the new revision and recheck affected paths. A policy ambiguity goes back to the human and remains an assumption; never invent a policy to make a check pass.
7. Always call **close** in cleanup, including after errors, refusal or a blocked check. Record a cleanup failure rather than claiming closure.

When the descriptor, browser, `file://` support or required operation is missing,
stop browser work and report the exact missing capability. Do not install
software, start the application, create a hosting server, upload the artifact,
invent screenshots or claim to have exercised a flow from static inspection.
An unresolved static failure takes precedence: record `incomplete`, even if
no browser checks ran. Otherwise, when static review passed and no browser
checks ran, record `not-run`; if the walk started but required checks remain,
record `incomplete`. Describe static review separately from the browser walk.
Browser `passed` requires every required check above that applies to
the chosen flow; unsupported required keyboard/viewport checks remain explicit
limitations and prevent that status.

Browser evidence is a record of observed prototype behavior. A later synthetic
panel uses its own isolation and evidence rules; this gate neither runs that
panel nor promotes synthetic observations into research evidence.
