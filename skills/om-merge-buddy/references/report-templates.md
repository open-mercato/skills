# Merge queue report

Use after classifying the queue. Follow `references/rules.md`. This is read-only
and emits no chaining fields. Lead with the counts and the next useful action.

```markdown
🚀 `om-merge-buddy` — {ready} ready, {almost} almost ready, {blocked} blocked.
{Scope/date; disclose disabled label gates or missing check data when relevant.}

| PR and change | State | Next action and reason |
|---|---|---|
| [#{number}: {title}]({url}) | Ready | All required gates pass; ready for a merge decision. |
| [#{number}: {title}]({url}) | Almost ready | Wait for {check}; it is the only remaining gate. |
| [#{number}: {title}]({url}) | Blocked | Resolve {conflict/finding} and obtain {missing approval}. |
```

Use one row per included PR; keep all remaining blockers in that row. Do not
repeat labels, authors, or every passed gate. Retain the skill's sorting and
skip rules. When nothing is ready, say so and lead with the closest candidates.
A queue scan establishes gate status, not product fit or a fresh code review;
never infer those from green checks. `om-approve-merge-pr` rechecks gates when
asked to merge.
