# Report templates

The user-facing shapes `om-gap-analysis` produces at each phase end and in single-capability mode. Lead with what the run established and the next action; the tree, summary, and backlog files hold the detail — link them instead of replaying them. Numbers are N/M, never bare percentages.

## Phase 1 end (after `bin/gap-checklist-gate` returns 0)

```markdown
📋 `om-gap-analysis`: scoped `<project>` — <E> epics, <S> stories, every epic covers all <C> coverage categories (gate exit 0).
{Material scoping assumption the client should confirm, when one remains.}
Saved: <full path of the tree MD>
Next: run `/clear`, then re-invoke `om-gap-analysis` with `Run gap-analysis phase 2 on <full path>`.
```

## Phase 2 progress

One line per batch, no narration: `🧪 <done>/<total> stories verified, <n> needs-review.`

## Phase 3 end

```markdown
🎯 `om-gap-analysis`: `<project>` — <covered criteria>/<total criteria> acceptance criteria already covered on `<platform.branch>`; <sum> atomic commits close the rest.
✅ <n>/<total> implemented (<n> core, <n> licensed/companion) · 🟡 <n>/<total> partial · ❌ <n>/<total> missing · ⚠️ <n> unclear · <n> needs-review
{The biggest risk or adopt-vs-build fork, in one sentence.}
{Profile facts not from config, or a missing tier boundary, when they limit the result.}
Files: <tree> · <summary> · <backlog>
```

## Single-capability answer

The verdict line is parsed by `om-app-spec-writing`'s gap matrix — keep its shape exact:

```markdown
grounded: <✅ Implemented | 🟡 Partial | ❌ Missing | ⚠️ Unclear> (<covered>/<total>, <tier>) — `<grounding query>` in <core | companion> @ <branch>
Evidence: `<repo-relative path>` — <role it plays>
Gaps: <specific missing piece, or none> · Effort: <0–5>
Upstream pipeline: <none | PR #<n> (open) | companion PR #<n> (open) | spec: <path> (planned, unbuilt)>
```

A `❌ Missing` carries no tier: write `(<covered>/<total>)`. When the gate fails twice, answer `not grounded — <gate reason>` instead of a verdict, so the caller keeps its row `docs-only`.
