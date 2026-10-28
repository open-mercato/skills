# QA knowledge base — write format

Detailed format for step 8 of `om-qa-buddy`, the only step that writes to
`$KB_DIR` (`<paths.qa>/knowledge-base/`) — every other step only reads it
(step 2).

## After every session, unconditionally

Append one row to `$KB_DIR/module-history.md`:

```markdown
| [PR/Issue link or branch] | Module(s) | Date | Verdict | Defect count | Why it matters (one line) |
```

Do this **even when zero bugs were found** — a clean run on a given module
is itself a data point: it lowers, not raises, that module's risk signal
for the next session's step 2 lookup.

## When the session found a genuinely new gotcha

Only if it is not already covered by an existing entry in
`$KB_DIR/risk-hotspots.md`, add a bullet under the matching theme heading
(or a new heading if none fits):

```markdown
- **[One-line gotcha title]** — [what breaks, why, and the fix/workaround if
  known]. *Seen while testing [link] — [one clause of context].*
```

Keep the same terse, evidence-based style as existing entries — this file
is read at the start of every future session touching the same area, so
verbosity has a real ongoing cost.

## What NOT to do here

- Don't rewrite or "clean up" existing entries unless they're factually
  wrong — this is a historical log, not a living style guide.
- Don't duplicate an existing hotspot with slightly different wording —
  check first.
- Don't write session-specific noise (screenshot filenames, exact click
  sequences) — that belongs in `$ARTIFACTS_DIR`, not the knowledge base.

## First session in a fresh repository

`$KB_DIR/module-history.md` and `$KB_DIR/risk-hotspots.md` may not exist
yet — create them with a one-line header when writing the first entry;
step 2 already treats their absence as "no prior history."
