# Final report

Use this shape for `om-mockup-prototype` step 5. Lead with the result in 3–6
short lines, excluding machine fields. Keep artifact paths, verification status,
material assumptions, preservation limits and the next action. Link the full
context/checklist instead of repeating it. Omit optional lines that add nothing.

```markdown
{✅ or 🔁 or ⛔} `om-mockup-prototype`: {the flow made clickable; revision created, incomplete or blocked, and the concrete reason}.
🧪 {Browser result, evidence link, and required checks that failed or did not run. State when only static review was possible.}
⚠️ {Material assumptions or unresolved choices and their practical effect; the prototype and synthetic findings do not establish research evidence. Link the context record.}
{Refresh only: previous revision link and material manual changes preserved there; what changed in this revision.}
{Return to the discovery hand-off, or the exact next step the user chose. Do not imply an unaccepted panel, refresh or backlog filing will run.}

Prototype: {repo-relative path to revision/index.html}
Prototype context: {repo-relative path to revision/README.md}
Verification: {passed|incomplete|not-run}
Next: {none|om-<skill> <exact user-approved arguments>}
```

Use `passed` only for a complete static and browser gate. An unresolved static
failure always means `incomplete`, even without a browser walk. Use `not-run`
only when static review passed and no browser checks ran. An incomplete artifact
still receives its actual paths and status, with the blocker stated above them.
Do not emit `passed` because the user approved the simulation or the HTML exists.

When no artifact was written, name the missing input, decision or unsafe path and
the concrete action needed to proceed. Emit no `Prototype:`, `Prototype context:`
or `Verification:` line. End with `Next: none` unless the user explicitly chose
an exact unexecuted companion invocation. Never copy a child's routing line or
present a completed or declined action as outstanding work.
