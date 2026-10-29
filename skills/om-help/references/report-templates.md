# Report templates

Answer shapes for `om-help` step 8. Lead with the recommendation, give the one reason that decided it, and stop. Usually 3–8 lines before the `Next:` line. Omit any line that has nothing to say.

## Prerequisite line

Whenever the recommended skill has an unmet prerequisite (`references/setup-state.md`), say which kind it is — never leave the user to find out by running it:

- **Will run setup itself** — most tracker-driven skills auto-run `om-setup-agent-pipeline` when the config is missing; say so in one clause ("`{skill}` will set up the pipeline on first run") rather than routing to setup first.
- **Needs X first** — a hard gate (`references/setup-state.md` §Hard config gates): name the missing piece and the one skill that provides it, and recommend that instead of the blocked skill.

## Interactive / autonomous marker

When the recommendation needs a person answering questions (anything in `references/context-signals.md`'s "discovery or shaping" delivery shape — `om-discover`, `om-brainstorm`, `om-ux-shape`, `om-app-spec-writing`, `om-gap-analysis`, `om-backlog`, `om-mockup-prototype`, `om-synthetic-users`), say so in the **Why** or **Next step** line ("interactive — walks you through it") so the user does not expect an unattended run. An `om-auto-*` recommendation needs no such note; autonomy is already in the name.

## Flags rule

Carry forward only the flag the user's intent actually calls for (skill body Rules, "Flags follow intent"): `--dry-run` when they are asking rather than asking for it to run, `--force` only when they named overriding a claim. State the flag's effect in one clause when it changes what happens ("`--dry-run` prints the plan, changes nothing").

## Navigation — "what now?", "which skill?"

```markdown
📋 **Where you are:** {one sentence — branch, active spec or PR, working-tree state}.
🎯 **Next step:** `{skill} {args}` — {what it will do for the user}.
**Why:** {the decisive signal, and the source that routes it — `AGENTS.md` Task Router row "{row}", `SDLC.md`'s "{stage}" row, `{help.data file}`, `references/flow-map.md`, or the installed description of `{skill}`}.
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

## Setup — "is the pipeline configured?", "what's missing?", "I upgraded the skills"

```markdown
{✅ fully configured | ⚠️ gaps found}: {one line naming what the probe checked}.
- `{gap}` — {context: "{skill} will set up the pipeline itself" | blocker: "blocks {skill}; resolve with {command}"}.
**Run:** `{command}` {only when one command resolves the gap directly}
Next: {none | skill args}
```

List every gap `references/setup-state.md` found; mark each context or
blocker per its rule, never both. "I upgraded the skills" always answers
`om-apply-upgrade-notes --dry-run` — never a staleness claim this skill
cannot verify.

## Nothing fits

```markdown
⛔ No installed skill covers {capability}. {What the repository data suggests, if anything, marked "not installed".}
{The smallest manual route that works without a skill.}
Next: none
```
