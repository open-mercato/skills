# Filing the tree (step 5)

Every new issue is created by `om-prepare-issue`, invoked verbatim with `--title "<id> — <title>"`, `--no-spec`, `--skip-dedupe`, the inferred `--priority` / `--risk`, and `--assignee` when given. Check source and full id per `references/identity.md` before creating or updating. The brief handed over already carries the body sections, which `om-prepare-issue` embeds verbatim under matching headings; this skill adds the epic checklists through **update-issue**, and comments through **comment-issue**. Order: epics, then stories, then tasks, then the epic checklists. Every write is idempotent. Parse `Issue: #<n> (link: <url>)` from each report, verify the returned issue's source/id pair with **get-issue**, and record the link in this source's `backlog.md` section; an unexpected reuse is a stop, never permission to overwrite it.

## Epic

Brief handed to `om-prepare-issue`:

```
Backlog source: {BACKLOG_SOURCE}
Backlog id: {full item id}
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

Same invocation, `--title "{id} — {outcome}"`. The brief carries the same `Backlog source:`, its own `Backlog id:`, the epic's problem and role, the story's own expected outcome, and these sections verbatim, which `om-prepare-issue` embeds as they are:

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

As a story, with its own source/id pair, `Story: #{storyNumber}` instead of `Epic:`, and no acceptance criteria beyond a done-when line. A research task has no parent story: use `Epic: #{epicNumber}` instead.

## Epic checklist

After the children exist, **update-issue** on the epic replaces the block between the checklist marker and the end of the section with one line per story (per task for a research epic). Preserve existing completion marks; initialize only new entries as `- [ ] #{n} {title}`. Adopted issues appear the same way. On re-runs the block is rewritten, never appended to; `--epic` or a partial run preserves children outside the selected work.

## Adopted issues

An adoption proposed in step 3 is performed only after step 4's confirmation: **update-issue** adds the `Backlog source:`, `Backlog id:`, and parent line (and the id prefix in the title only with the user's yes, since a title is the owner's). Preserve its existing body; regenerating an adopted issue's requirements requires an explicitly confirmed diff. One **comment-issue** with the marker `` 🤖 `om-backlog` — adopted into {epic id} `` explains why and includes the source/id pair. An issue another actor is actively working on (three-signal check) gets the comment only; the body is left alone. Recover it through this source's `backlog.md` section and the adoption comment on re-runs. An issue marked for another source is linked as an external dependency, never adopted or rewritten.

## Idempotency

Searches only find candidates: verify both `Backlog source:` and the complete `Backlog id:` per `references/identity.md` before updating. Reuse a verified mapping; create only for a confirmed new id; a different source or ambiguous legacy mapping stops that item's write. Preserve user-authored additions and all unselected items. The checklist block is rewritten between its markers; the source-qualified adoption comment is found via **list-issue-comments** and updated through **update-comment**. Skip unchanged bodies and comments. Running the skill twice on the same source changes nothing the second time.

## `backlog.md`

```markdown
# Backlogs

## {source}
Backlog source: {BACKLOG_SOURCE}
Last filed: {date}

| Id | Issue | Title | Epic | Depends on | Adopted |
|---|---|---|---|---|---|
| E01 | #12 | … | — | — | no |
| E01-S01 | #13 | … | #12 | — | no |
```

The tracker is the authority; this file keeps one section per source, including reserved ids for retired items. Update only the current source's rows, preserving all other sections and rows outside `--epic`; legacy single-source files are retained and wrapped per `references/identity.md`.
