# Report templates

The tree shown for confirmation (step 4) and the final report (step 6). Fill them exactly and expand with detail. End the final report with the Output contract lines from the skill body, one per line, exact and undecorated.

## The tree, for confirmation

```markdown
## 📋 om-backlog — proposed tree from {source}

**Readiness**: {the ticket-level tier is met on tiers 1–5 | not met: sections … rest on synthetic or assumed claims → research variant}
**Size**: {n} epics, {m} stories, {k} tasks; {a} existing issues adopted

### E01 — {title} · {priority}, {risk}
- E01-S01 — {outcome} · {n} criteria · depends on — · decisions D03, R01
- E01-S02 — {outcome} · adopted: #45 (covers it; adds …)
### E02 — …
### E{nn} — Later (parked, not filed as stories)
- {item} · {item}

Reply with edits, or "yes" to file. Nothing has been written.
```

## Final report

```markdown
## 🎯 om-backlog — backlog filed from {source}

📋 **What was filed.** {epics and stories in full sentences: what each epic delivers and why the split is where it is; how many issues were created, how many adopted}

🏷️ **Labels.** {that `om-prepare-issue` applied category, priority, and risk per issue with its rationale comment; which stories are risk-high and why}

🔍 **Duplicates and adoptions.** {which existing issues were adopted into which epic, and what comment explains it; what was searched}

⚠️ **What is still open.** {blocking open questions carried into issue bodies with who can answer; stories that depend on decisions not yet owned; the Later epic's contents}

📝 **Record.** {where backlog.md is, and that ids in titles are the durable link on re-runs}

Backlog: {…}
Issues: {…}
Next: {…}
```

## Dry run

The tree shape above, with the header line `Dry run — nothing was written.` and no contract lines except `Next: none`.
