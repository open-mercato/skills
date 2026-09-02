# Filing the tree (step 5)

Every issue is created by `om-prepare-issue`; this skill adds the tree on top through **update-issue** and **comment-issue**. Order: epics, then stories, then tasks, then the epic checklists. Every write is idempotent.

## Epic

Invoke `om-prepare-issue` verbatim with a brief of this shape (the skill embeds it in its Summary / Out of scope / Open questions sections and applies labels):

```
{prefix}{nn} — {epic title}
Problem: {from the brief's Problems, with its tag and source}
Who has it: {roles from the Target group}
Expected outcome: {from Goals — what is true afterwards and how it is checked}
Out of scope: {the N0n non-goals that bound this epic, quoted}
Open questions: {Q0n entries that touch this epic, blocking or not}
Decisions in play: {D0n, R0n ids, one line each}
```

Pass `--priority` / `--risk` from the draft and `--assignee` when given. Parse the `Issue: #<n>` line from its report. Then **update-issue** to append:

```markdown
## 📋 Stories
<!-- om-backlog: checklist, rewritten on every run -->
- [ ] {filled after the stories exist}
```

## Story

Same invocation, with the story's outcome as the title after its id, the epic's problem and role, the story's own expected outcome, and its acceptance criteria in the brief. After creation, **update-issue** to prepend the tree line and append the criteria section when `om-prepare-issue` did not carry them verbatim:

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

## Task

As a story, with `Story: #{storyNumber}` instead of `Epic:` and no acceptance criteria beyond a done-when line.

## Epic checklist

After the children exist, **update-issue** on the epic replaces the block between the checklist marker and the end of the section with one line per story: `- [ ] #{n} {title}`. Adopted issues appear the same way. On re-runs the block is rewritten, never appended to.

## Adopted issues

An existing issue adopted in step 3 is not recreated: **update-issue** adds the `Epic: #{n}` line (and the id prefix in the title only with the user's yes, since a title is the owner's), and one **comment-issue** with the marker `` 🤖 `om-backlog` — adopted into {epic id} `` explains why. An issue another actor is actively working on (three-signal check) gets the comment only; the body is left alone.

## Idempotency

Before creating anything, **search-issues** by the id prefix in the title. Found → update; not found → create. The checklist marker comment and the adopted marker are found via **list-issue-comments** and updated in place. Running the skill twice on the same source changes nothing the second time.

## `backlog.md`

```markdown
# Backlog — {source}, filed {date}

| Id | Issue | Title | Epic | Depends on | Adopted |
|---|---|---|---|---|---|
| E01 | #12 | … | — | — | no |
| E01-S01 | #13 | … | #12 | — | no |
```

The tracker is the authority; this file is the map from ids to numbers for humans and for the next run.
