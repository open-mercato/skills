# Issue bodies and final report

The issue holds the explanation. Cross-link comments and reports announce the
result without copying it. Keep a source request distinct from verified behavior.

## Tracking-issue body (design-doc mode, step 9)

Keep the title `Implement: <feature title>` so dedupe searches match.

```markdown
## 🎯 Change

{Who gains what behavior, what happens today, and why the document proposes
this change. Do not describe proposed behavior as implemented.}

## 📋 Scope and completion

{Affected area and observable outcomes needed to complete the work. Mention
durable contracts or explicit exclusions only when material.}

## 📝 Design doc

{Document path and design PR link. Use the document for implementation detail.}

Begin implementation after the design PR merges into the configured base
branch (`$BASE_BRANCH`), using the document as the brief for `om-auto-create-pr`.

Related: #<num>
```

## Follow-up body (comment mode, step 7)

Keep `## Follow-up from #<num>`, the linked actionable excerpt (redacted when
necessary), the acceptance checklist, and `Related:` footer. Explain the user's
remaining problem in one short paragraph, then the smallest requested change.
Do not paste the source PR summary or invent implementation details.

## Cross-link comment

Use the stable marker `` 🤖 `om-followup-issue-from-pr` — tracking implementation ``
and link the issue with one sentence naming what it tracks. Update the matching
comment on reruns instead of posting it again; recognize a legacy `Tracking
implementation in #<issue>` cross-link as the same comment. Do not repeat the issue body.

## Final report (step 10)

One compact entry per issue created or reused:

```markdown
✅ `om-followup-issue-from-pr` {created/reused} {linked issue title} to {remaining outcome}.
Assigned to @{owner}. {Explain only when assignment failed or ownership was ambiguous.}
{When needed: design-merge prerequisite or another next action.}
```

Omit routine labels and extraction history. Distinguish follow-up requests from
implementation-tracking issues when both were filed. End with one exact line
for each created issue:

```text
Issue: #<number> (link: <full issue URL>)
```
