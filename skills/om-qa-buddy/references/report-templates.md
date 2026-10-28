# Verdict report template

Detailed template for step 7 of `om-qa-buddy`. This skill never posts to
the tracker itself — the file below is written to
`$ARTIFACTS_DIR/report.md` and handed to the user to paste as a PR/issue
comment.

## Pre-write checklist

- Every case in `test-plan.md` has a final status (Pass/Fail/Blocked).
- Every Fail has `Actual` filled in and a screenshot.
- Every bug in `bugs/` follows the template, reproduces reliably (or states
  its reproduction rate), and has a screenshot.
- Pass + Fail + Blocked counts equal the total executed.

## `report.md` — the single source of truth for this format

Start directly with the verdict — no title header, no metadata block above
it (date/branch/tester/environment go in a line below the summary, not
above it).

```markdown
**QA verdict: ✅ READY TO MERGE** / **⚠️ CONDITIONAL GO** / **❌ NO-GO**

[1-3 sentences, first-person tester voice, describing what was clicked and
verified as an end user — zero explanation of how the fix works internally,
zero file/function/component names.]

## What was tested and results
| # | Scenario | Result |
|---|---|---|
| 1 | Short one-line scenario title | ✅ Pass |
| 2 | Another scenario | ❌ Failed |

## Bugs
<!-- ALWAYS present, even when empty: "No bugs found. Nothing blocking, nothing to report separately." -->
<!-- Blocking bug (in scope, breaks the feature under test): describe directly here, reflected as ❌ Failed above. -->
<!-- Non-blocking / out-of-scope bug: one line pointing at its bugs/*.md file for the user to file separately. -->

## Environment
{branch/commit}, `{baseUrl}`, role `{role}`, browser `{provider}`.
```

**Hard rules — check the draft against every one of these before saving:**

1. Line 1 is always prefixed **"QA verdict"** — never bare "Verdict".
2. Summary is 1-3 sentences, first person, tester narration only ("I
   created X, then clicked Y and watched Z") — never dev-voice. This
   register comes straight from step 2's plain-language brief; if it drifts
   dev-voice here, re-check that brief, not just this line.
3. `## What was tested and results` is a **numbered table**, never a bullet
   list. Sequential numbers, never case IDs.
4. `## Bugs` is **always present**, never omitted, never renamed.
5. No extra prose sections (no "Key observations", no raw evidence dumps) —
   fold anything notable into the 1-3 sentence summary or the table row.
6. Human-verification items that a case genuinely needs (keyboard-only
   input, visual judgment, an external credential) get their own line under
   `## What was tested and results` with result "⚠️ Needs human check", not
   a silently dropped row.
7. Screenshot filenames referenced anywhere are short (`step-1.png`, not a
   timestamped name).

A bug-fix session closing a linked issue with nothing else found can skip
the full table and write a 1-2 sentence closing note instead ("Tested as
part of this change — X now correctly does Y.").

## Final run report (handed back to the user, step 9)

Aim for 3-6 lines. Give the outcome, where the evidence lives, and the next
action.

```markdown
🧪 `om-qa-buddy`: {READY TO MERGE | CONDITIONAL GO | NO-GO} — {behavior
verified and result or blocker}.
Runbook: {$ARTIFACTS_DIR}/runbook.html (open directly in a browser).
Verdict to paste: {$ARTIFACTS_DIR}/report.md.
{Any bugs filed, or "No bugs found."}
{Knowledge-base updated: module-history always; risk-hotspots if a new
gotcha was found.}
```
