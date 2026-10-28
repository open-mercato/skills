# Report templates

Use the tree for confirmation in step 4 and the final report in step 6. Follow
`references/rules.md`: explain the proposed outcomes and decisions in complete
sentences, omit empty optional sections, and keep every criterion the user must
approve. The final handoff links the approved detail instead of repeating it.
End with the skill body's exact, undecorated Output contract lines.

## The tree, for confirmation

```markdown
## 📋 `om-backlog`: proposed tree from {source}

{What users can do after these epics and why the proposed boundaries fit those outcomes.}

**Readiness**: {met: every ticket-level item is present on tiers 1–5, blocking questions are answered, and decisions are owned | skipped: SDLC.md has no Definition of Ready; `om-setup-discovery-pipeline` adds the gate | not met: sections … rest on synthetic or assumed claims; the research variant is offered | not met: blocking questions {ids} are open or decisions {ids} remain proposals; answer them and run `om-discover --refresh`}
**Size**: {n} epics, {m} stories, {k} tasks; {a} existing issues proposed for adoption (or "tracker access and dedupe skipped; adoptions unknown" on a dry run)
**Labels**: {enabled: `om-prepare-issue` applies them | disabled in config: shown for the record only}
**Identity**: {Source path; existing ids retained; new ids allocated after used ids, or provisional on a dry run; external references and legacy adoptions requiring confirmation.}
**Held back**: {Stories whose only role rests on an assumption, with the A0n id. Omit when empty.}

### E01: {title} ({priority}, {risk}, the highest risk of its stories)
- E01-S01: {outcome}; {priority}, {risk}; {n} criteria; depends on {ids, if any}; decisions D03, R01.
- E01-S02: {outcome}; {priority}, {risk}; adopt #45 because {coverage and additions}.
### E02: …
### E{nn}: Later (parked, not filed as stories)
- {Deferred item and why it is outside the current slice.}

Reply with edits, or "yes" to file. Nothing has been written.

## Issue bodies for `om-prepare-issue`

{One block per epic, story, and task: all body sections and acceptance criteria in full. Explain each epic split and proposed adoption where it belongs. The confirmation covers the actual issue bodies, not just their counts.}
```

On `--dry-run`, use the header `Dry run — nothing was written.` and replace the
confirmation question with `Re-run without --dry-run to file this tree.` End with
`Next: om-backlog <source>` and no `Backlog:` or `Issues:` line. Keep every issue
body, criterion, identity warning, and readiness limitation in the dry run.

## Final report

Aim for 3–6 lines of prose before the output fields. Include more when blockers,
adoptions, or risks need explanation. Keep created/adopted totals in one place;
do not recount the tree or the filing steps.

```markdown
🎯 `om-backlog`: {The backlog enables these user outcomes; {n} issues were created and {a} adopted.}
📋 {Link this source's section in backlog.md for the approved epic boundaries and criteria; state any change from the confirmed tree and its reason.}
🔍 {Explain which existing issues were adopted into which epic, how their coverage fits, and link the adoption comment; qualify dedupe by what was searched. Omit when no adoption or search limitation affects the result.}
🏷️ {State that `om-prepare-issue` applied category, priority, and risk with rationale comments, or that labels were disabled; explain any high-risk story once.}
⚠️ {Name remaining blocking questions and who can answer, stories awaiting owned decisions, held-back assumptions, and Later items; link longer lists. Omit when empty.}
📝 {Confirm source/id pairs are recorded on the issues and in backlog.md, with other sources and retired mappings preserved; name any gap.}

Backlog: {…}
Issues: {…}
Next: {…}
```

## Readiness stop

Lead with why the backlog cannot be filed and what would make it ready. Include
the `Readiness` field above, every missing item, and who can supply it. For the
research variant, show the offered Discovery tree with its allocated or existing
id and the full task bodies before asking for confirmation.

End with `Next: om-discover --refresh` for unanswered questions or unowned
decisions, or `Next: none` when the research backlog is offered and declined or
another readiness gap prevents proceeding. Emit no `Backlog:` or `Issues:` line.
