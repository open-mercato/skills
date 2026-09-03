# Filing the tree (step 5)

Every issue is created by `om-prepare-issue`, invoked verbatim with `--title "<id> — <title>"`, `--no-spec`, `--skip-dedupe`, the inferred `--priority` / `--risk`, and `--assignee` when given. The brief handed over already carries the body sections, which `om-prepare-issue` embeds verbatim under matching headings; this skill adds only the epic checklists afterwards through **update-issue**, and comments through **comment-issue**. Order: epics, then stories, then tasks, then the epic checklists. Every write is idempotent. Parse `Issue: #<n> (link: <url>)` from each report; the link goes into `backlog.md`.

## Epic

Brief handed to `om-prepare-issue`:

```
Problem: {from the brief's Problems, with its tag, the role and date of any quote, and the source file}
Who has it: {roles from the Target group}
Expected outcome: {from Goals — what is true afterwards and how it is checked}
Out of scope: {the N0n non-goals that bound this epic, quoted}
Open questions: {Q0n entries that touch this epic, blocking or not}
Decisions in play: {D0n, R0n ids, one line each, with the owner}
Design authority: {SPECS_DIR}/product-brief.md   (or the spec path)
```

Then **update-issue** to append:

```markdown
## 📋 Stories
<!-- om-backlog: checklist, rewritten on every run -->
- [ ] {filled after the stories exist}
```

## Story

Same invocation, `--title "{id} — {outcome}"`. The brief carries the epic's problem and role, the story's own expected outcome, and these sections verbatim, which `om-prepare-issue` embeds as they are:

```markdown
Epic: #{epicNumber}
Depends on: {ids and numbers, or none}

## ✅ Acceptance criteria
- Given … When … Then …
- Given … When … Then … (negative case)

## 📋 Decisions in play
- D03 — {decision in one line} (owner: {name})
- R01 — {rule in one line}
```

No post-creation edit is needed for a story; the ids cited inline in Summary and Out of scope by `om-prepare-issue`'s own rule and the *Decisions in play* section list the same ids, and that is intended.

## Task

As a story, with `Story: #{storyNumber}` instead of `Epic:` and no acceptance criteria beyond a done-when line.

## Epic checklist

After the children exist, **update-issue** on the epic replaces the block between the checklist marker and the end of the section with one line per story: `- [ ] #{n} {title}`. Adopted issues appear the same way. On re-runs the block is rewritten, never appended to.

## Adopted issues

An existing issue adopted in step 3 is not recreated: **update-issue** adds the `Epic: #{n}` line (and the id prefix in the title only with the user's yes, since a title is the owner's), and one **comment-issue** with the marker `` 🤖 `om-backlog` — adopted into {epic id} `` explains why. An issue another actor is actively working on (three-signal check) gets the comment only; the body is left alone. An adopted issue without the id in its title is found on re-runs through `backlog.md`, which is why the file records it.

## Idempotency

Before creating anything, **search-issues** by the id prefix in the title (and `backlog.md` for adopted issues without one). Found → **update-issue** with the regenerated body sections; not found → create through `om-prepare-issue`. The checklist block is rewritten between its markers; the adopted marker comment is found via **list-issue-comments** and updated in place. Running the skill twice on the same source changes nothing the second time.

## `backlog.md`

```markdown
# Backlog — {source}, filed {date}

| Id | Issue | Title | Epic | Depends on | Adopted |
|---|---|---|---|---|---|
| E01 | #12 | … | — | — | no |
| E01-S01 | #13 | … | #12 | — | no |
```

The tracker is the authority; this file is the map from ids to numbers for humans and for the next run.
