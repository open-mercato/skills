# Context gathering and plain-language translation

Detailed procedure for step 2 of `om-qa-buddy`: turning a raw PR, issue, or
branch into a briefing the test plan (step 3) can build on, in language a
non-technical reader can follow.

## Read everything, not just the top post

- PR/issue title, description, acceptance criteria, linked issue/spec.
- **The full comment thread**, via **get-pr**/**get-issue** (comments
  field) — repro steps, edge cases, scope changes, and prior QA verdicts
  routinely live in comments, not the description. Skipping them means
  re-finding already-known problems.
- The actual diff, via **get-pr-diff** (PR mode). Skim every changed file —
  even a one-line config edit can hint at a risk area.
- Any spec the PR/issue links to, wherever this repository keeps design
  docs.
- **Issue mode** (no diff exists yet): read the issue itself plus a quick
  look at the affected area of the running app to understand current
  behavior before planning what to check.

## Check the local knowledge base

Grep `$KB_DIR/module-history.md` for the module(s) this session touches. If
prior sessions exist for the same module, note their verdicts and any
repeated defect theme — three or more entries with the same theme is a
signal to add a standing regression case in step 3, not just an ad-hoc
probe. Also read `$KB_DIR/risk-hotspots.md` for hotspot themes matching this
diff (e.g. a change to a data-ownership field matches a prior
cross-tenant-isolation hotspot). Missing knowledge-base files are normal on
a fresh repo — treat as "no prior history" and continue.

## Translate to plain language

For each change, ask: **"What does a person clicking through the UI actually
experience differently?"** — not which code path executes.

```
❌ Dev-voice: "The aggregate view's item mapping now includes updatedAt,
   closing a gap that caused the edit form to lack optimistic-lock headers."
✅ Plain: "When two people edit the same record, the system now detects
   the conflict and shows a warning instead of silently overwriting one of
   the changes."
```

Write 2-4 sentences that pass this test: would someone with no engineering
background understand it? Also name the affected module(s) in plain terms
(e.g. "customer records", not the internal module path) — the test plan's
scope section and the knowledge-base module lookup both key on this name.

This plain-language register is the one every later artifact (test plan
scope, bug reports, the final verdict) builds on — if a later step drifts
back into dev-voice, that is the signal to re-check this brief, not just
reword the symptom.

## Output

A short intake-and-translation brief (kept in the working context, no need
to write it to a file on its own): what changed in plain terms, which
module(s) it touches, any linked issue it closes, anything surprising found
in the comments, and whatever prior knowledge-base history applies. Feeds
step 3 (`references/test-plan-template.md`) directly.
