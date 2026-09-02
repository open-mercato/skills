# Report templates

The tree shown for confirmation (step 4) and the final report (step 6). Fill them exactly and expand with detail. End the final report with the Output contract lines from the skill body, one per line, exact and undecorated.

## The tree, for confirmation

```markdown
## 📋 om-backlog — proposed tree from {source}

**Readiness**: {met — every ticket-level item present on tiers 1–5, blocking questions answered, decisions owned | not met: sections … rest on synthetic or assumed claims → research variant offered | not met: blocking questions {ids} open, decisions {ids} still proposals → answer them and re-run om-discover --refresh}
**Size**: {n} epics, {m} stories, {k} tasks; {a} existing issues adopted (or "dedupe skipped — no tracker")
**Labels**: {enabled — applied by om-prepare-issue | disabled in config — shown for the record only}
**Held back**: {stories whose only role rests on an assumption, with the A0n id; or none}

### E01 — {title} · {priority}, {risk} (highest of its stories)
- E01-S01 — {outcome} · {priority}, {risk} · {n} criteria · depends on — · decisions D03, R01
- E01-S02 — {outcome} · {priority}, {risk} · adopted: #45 (covers it; adds …)
### E02 — …
### E{nn} — Later (parked, not filed as stories)
- {item} · {item}

Reply with edits, or "yes" to file. Nothing has been written.
```

On `--dry-run` the header line is `Dry run — nothing was written.`, the closing line is replaced by `Re-run without --dry-run to file this tree.`, and the report ends with `Next: om-backlog <source>` and no `Backlog:` or `Issues:` line.

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

## Readiness stop

When step 1 stops the run, the report is the readiness block above with the missing items, who can supply each, and — for the research variant — the E00 tree offered; it ends with `Next: om-discover --refresh` (questions or owners missing) or `Next: none` (research backlog offered and declined). No `Backlog:` or `Issues:` line.
