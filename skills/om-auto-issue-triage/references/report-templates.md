# Issue-triage reports

Steps 4–7 use these shapes. Keep outcome, evidence, confirmation and exact
machine fields; omit optional empty sections and neutralize title markdown.

## Proposal

```markdown
🎯 `om-auto-issue-triage` — {k} issues proposed for `{AUTOFIX_LABEL}`.
Window {n}: {from} → {to}, anchored at {asOf}; {a} analyzed, {s} shortlisted.
{Listing cap, missing evidence, out-of-window or analyze/shortlist omissions.}

| Issue | Why this is ready for autofix | Priority / risk | Remaining work |
|---|---|---|---|
| #<id> <title> | <useful problem still present; evidence links> | <labels> | <bounded work and validation> |

{Already queued: <ids>.}
{Rejected: <ids, decisive gates/judgments>; collapse a long list.}

⚠ NEEDS HUMAN CONFIRMATION — labeling may start the repository's autofix worker. Reply with the displayed IDs, "all", or "next":
- Label all displayed: `/om-auto-issue-triage <same flags and --as-of> --apply <explicit displayed IDs>`
- Label selected: `/om-auto-issue-triage <same flags and --as-of> --apply <id,id>`
- Next window: `/om-auto-issue-triage <same anchor/limits and --window n+1>`
```

Do not print an apply command for an empty proposal. Keep the next-window
command when an intermediate empty window precedes older/newer fetched issues;
stop at the real fetched boundary and disclose a truncated list.

## Label rationale

Find this marker with **list-issue-comments**, accepting its backticked and
legacy bare form. Use **update-comment** in place or **comment-issue** once.

```markdown
🤖 `om-auto-issue-triage` — label rationale

🏷️ `{AUTOFIX_LABEL}` — A human confirmed this issue for autofix on {date}. {Current useful problem, evidence links, bounded work and validation still required.}

Queued after a current-state recheck and label read-back. Implementation and its normal review, QA and CI gates remain separate.
```

## Apply result

```markdown
✅ `om-auto-issue-triage` — queued {l} of {c} confirmed issues with `{AUTOFIX_LABEL}`.
- #<id>: {labeled | skipped — concrete reason}.
{Next action needed for label-provisioning, permission or evidence gaps.}
```

Emit one line only for each successfully labeled issue, preserving native IDs:

```text
Issue: #<id> (link: <full issue URL>)
```
