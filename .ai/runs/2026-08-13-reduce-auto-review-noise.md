# Execution plan — make PR #80 safe to implement

**Origin:** adopted by `om-auto-continue-pr` on 2026-08-13, then reconciled by
`om-auto-review-pr` after an explicitly authorized force takeover.
**PR:** #80 · **Branch:** `cez/ae26ac11` · **Base:** `main`
**Author:** @wojciechszyjka

## 🎯 Goal

Land two cohesive, design-only specifications:

1. suppress a review only when the exact whitespace-preserving patch was
   already reviewed and merge/CI health is currently clean;
2. project the exhaustive agent review into a bounded PR body without omitting
   mandatory safety content.

The design must resolve every blocker/major from @pkarw's 2026-08-13 review,
preserve the shared claim protocol, ground compatibility claims in actual
consumers, and record the maintainer's reporting-policy decisions.

## Scope

- `.ai/specs/2026-08-12-review-noise-reduction.md` — content-identical no-op
  detection only.
- `.ai/specs/2026-08-13-review-comment-budget.md` — human-facing review
  projection only.
- `DECISIONS.md` — the approved amendment to the 2026-07-23 reporting rule.
- This execution plan, PR metadata/review conversation, and the concurrently
  opened follow-ups #82 and #83.

## Decisions

- **D1 approved:** use a bounded PR projection while retaining the full
  agent/chain report.
- **D2 approved:** the implementation PR synchronizes all 34 shared
  `references/rules.md` copies and affected template preambles; there is no
  review-only exception or deferred sweep.
- The standard claim/take-over/completion markers remain unchanged.
- CI/workflow, dependency, lockfile, whitespace, binary, mode, conflict, and
  failing-check changes never enter a quiet path.
- Incremental/delta-only review and a conflict/status-comment state machine are
  separate future designs.

## Evidence

| Conclusion | Evidence |
|---|---|
| `git patch-id --stable` can hide semantic whitespace changes | Local harness reproduced an identical stable ID for a semantic re-indent; `--verbatim` produced distinct IDs. |
| `--verbatim` keeps the required rebase behavior | Local harness kept the ID across unrelated and line-shifting rebases; unsupported Git versions fail open to the current review path. |
| Review headings are not currently protected/parsing contracts | `BACKWARD_COMPATIBILITY.md` §5 omits them; checked-in consumers use tracker review state or the delegated skill result. |
| The full-report rule has a broader instruction surface | It appears in both review skill bodies/references plus `AGENTS.md`, `CODE_REVIEW.md`, `DECISIONS.md`, and shared rule/template copies. |
| Reporting-policy choices are settled | The user answered `Approve budget` and `Sync all 34` during this review run. |
| The concurrent continuation created follow-up tracking | #82 correctly isolates incremental re-review; #83 must point to both final specs and the approved all-34 sync. |

## Non-goals

- No skill implementation lands on this PR; implementation ships separately
  from the design PR.
- No tracker operation, config schema, label semantics, claim marker, QA gate,
  chaining line, or CEZ marker changes.
- No additional follow-up issue is created by this review run; #82 and #83 are
  retained and reconciled with the final design.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a
> step lands. Do not rename step titles.

### Phase 1: Existing PR history

- [x] 1.1 Author and open the original design for review — cb13679
- [x] 1.2 Adopt PR #80 and commit this tracking plan — 29fd683

### Phase 2: Resolve review findings and decisions

- [x] 2.1 Split suppression and comment budgeting into cohesive specs — 46ebe52
- [x] 2.2 Make fingerprinting whitespace-preserving and fail-open — 46ebe52
- [x] 2.3 Keep executable/dependency/health changes on the normal review path — 46ebe52
- [x] 2.4 Preserve claim markers and ground the compatibility inventory — 46ebe52
- [x] 2.5 Define real budget overflow and complete acceptance fixtures — 46ebe52
- [x] 2.6 Record D1/D2 in the budget spec and `DECISIONS.md` — 46ebe52

### Phase 3: Validate and hand back to review

- [x] 3.1 Run `bash scripts/lint.sh`, commit, and push normally — eafb75b
- [x] 3.2 Re-review the final diff, submit the verdict, normalize labels, and release the lock — dbfed86
