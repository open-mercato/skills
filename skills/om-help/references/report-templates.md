# Report templates

Answer shapes for `om-help` step 7. Lead with the recommendation, give the one reason that decided it, and stop. Usually 3–8 lines before the `Next:` line. Omit any line that has nothing to say.

## Navigation — "what now?", "which skill?"

```markdown
📋 **Where you are:** {one sentence — branch, active spec or PR, working-tree state}.
🎯 **Next step:** `{skill} {args}` — {what it will do for the user}.
**Why:** {the decisive signal, and the source that routes it — `AGENTS.md` Task Router row "{row}", `{help.data file}`, or the installed description of `{skill}`}.
**After that:** `{skill}` → `{skill}` {only when a sequence in the repository data or the skills' own chaining supports it}
**Alternative:** `{skill} {args}` — {when it is the better choice}. {at most one}
⚠️ {drift finding from routing-sources, one per line — only when found}
Next: {skill} {args}
```

Use the client's own invocation syntax when showing the command (for example a leading `/` or `$`); the `Next:` line always carries the bare skill name.

## Knowledge — "how do I…?", "where does…?"

```markdown
🎯 {the direct answer in one or two sentences}.
- **Where:** `{file path, import, or command}` — from `{source file}`.
- **Rule:** {the MUST/NEVER rule that applies} — `{source file}` › {section}.
- **Pattern:** {a minimal checklist or a short snippet copied from the source}.
**Read:** `{file}`, `{file}` {the files the answer is grounded in}
**Route:** `{skill} {args}` {only when a skill should do the work}
⚠️ {gap — a knowledge source skipped or not installed; the question not covered by any file read}
Next: {none | skill args}
```

No file covers the question → say where you looked, answer only what the files support, and label anything else as ungrounded.

## Inventory — "what skills do I have?"

```markdown
{count} skills installed ({roots scanned}).

**Repository-local:** `{name}` — {description, first sentence} (repo-local | repo overlay)
**Installed:** `{name}` — {description, first sentence}
⚠️ Skipped: `{dir}` — {why: name/directory mismatch, missing description}
Next: none
```

Group by source root; within a group, keep the order of the directory listing. Do not rewrite or embellish descriptions — quote their first sentence.

## Nothing fits

```markdown
⛔ No installed skill covers {capability}. {What the repository data suggests, if anything, marked "not installed".}
{The smallest manual route that works without a skill.}
Next: none
```
