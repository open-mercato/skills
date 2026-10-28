# Bug and feature-request report template

Detailed template and tone standard for step 6 of `om-qa-buddy`. One `.md`
file per defect or feature request, saved to `$ARTIFACTS_DIR/bugs/` — only
create that folder when there is actually something to file.

## Bug report template

```markdown
**Title:** [Module] — [What is wrong] — [Impact]

## Summary

Clear description of the bug.

## Page / screen

Where in the app it occurs.

## Steps to reproduce

1. …
2. …
3. …

## Expected result

What you expected to happen.

## Actual result

What actually happened.

## Environment

- Branch/commit: `{branch or short SHA}`
- Module or area:
- Browser/runtime: [the tester's actual browser, e.g. a real browser name —
  never the name of the automation tool that drove it]

## Additional context

Anything else that helps diagnose it.
```

## Feature request template

Use instead of the bug template when the finding is a non-blocking
improvement — no data corruption, no functional breakage. Save as
`FR-NNN-<slug>.md`.

```markdown
**Title:** [Short description of the desired improvement]

## Proposed solution

The change you'd like to see, including UI or API impact.

## Specification

Does a spec already exist for this? Yes / No / Not sure — if yes, its path.

## Additional context

Links, mockups, technical notes.
```

## Severity guide

| Severity | When to use |
|---|---|
| Critical | Crash, data loss, security breach, login broken |
| High | Core business function broken, no workaround |
| Medium | Feature partially broken, workaround exists |
| Low | Cosmetic, typo, non-blocking UX glitch |

## Language and tone standard — check every report against all of these

1. **Fact, not speculation.** Never write "might be because…" — state only
   what was directly observed. If the cause is unknown, say so plainly.
2. **No dev-voice.** Describe what a tester clicked and saw, not which
   function/file/query is involved. "Status stays PENDING after the
   callback fires" — not "the handler doesn't update the aggregate."
3. **No invented witnesses.** Never attribute an observation to "another
   tester" — if reproduced yourself, or reproduced twice, say exactly that.
4. **Gender-neutral language** for any test user or recipient — "the
   user"/"they", never an assumed gender.
5. **Real environment, not tooling.** Name the tester's actual browser,
   never the automation tool used to drive it.
6. **Verify current state before finalizing.** Re-check the defect is still
   reproducible in its current form right before saving — earlier actions
   in the same session (creating test data, retrying) can make an earlier
   observation stale.
7. **Evidence over adjectives:**
   ```
   ❌ "doesn't work" / "looks wrong" / "probably bugged"
   ✅ "status remains PENDING after a successful payment callback"
   ✅ "the dashboard total differs from the source export by 12 records"
   ```

## Findings outside the current scope

File as a separate `.md` under the same `bugs/` folder, same template.
Mention it briefly in the verdict report's Bugs section as an out-of-scope
finding — don't block the current verdict on it unless it is Critical.

## Output

`$ARTIFACTS_DIR/bugs/BUG-NNN-<slug>.md` and/or `FR-NNN-<slug>.md`. Feeds
step 7's verdict report (which summarizes/links each one) and step 8's
knowledge-base update (which may lift a recurring theme into
`risk-hotspots.md`).
