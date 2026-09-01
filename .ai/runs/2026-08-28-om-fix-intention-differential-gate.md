# Execution plan: om-fix intention-learning differential regression gate

Source doc: .ai/specs/2026-08-28-om-fix-intention-differential-gate.md (from PR #93, not yet merged to main)

## 🎯 Goal
Reorder `om-fix`'s workflow into a test-first Intention-Learning + Red/Green differential regression gate, so a regression test is proven to fail on the unmodified (buggy) code before the fix is applied and proven to pass after, closing the "misguidance effect" where a test written against already-patched code cements the bug into its own assertions.

## Scope
- `skills/om-fix/SKILL.md` — reorder Steps 2–5 per the spec's table.
- `skills/om-fix/references/regression-gate.md` — new file: Intention-Learning discipline, test-first Red/Green protocol, flaky-test/can't-reproduce failure paths, judgment-bounded `Status: blocked` escape hatch.
- `UPGRADE_NOTES.md` — new entry documenting the behavior change.

## Non-goals
- SBST/CodaMosa coverage expansion — covered by the sibling spec `.ai/specs/2026-08-28-om-fix-sbst-coverage-expansion.md`, implemented in a separate follow-up run.
- Any change to `om-setup-agent-pipeline`.
- Any change to the `om-fix` output contract's shape (Status/Files changed/Summary/Tests/Breaking changes lines stay the same; only the `Tests:` line's content gains a note).

## Risks
- `skills/om-fix/SKILL.md` step reordering could break something that cross-references a specific step number — verified during spec review that no other installed skill references `om-fix`'s internal step numbers.
- `scripts/lint.sh`'s body-length budget (~20,000 chars) and product-agnostic grep gate apply to `SKILL.md` — mechanics are kept in the new reference file to stay well under budget.

## Implementation Plan

### Phase 1: Differential regression gate

- 1.1 Write `skills/om-fix/references/regression-gate.md`
- 1.2 Reorder `skills/om-fix/SKILL.md` Steps 2–5 into the Intention-Learning + Red/Green gate
- 1.3 Re-read the full `SKILL.md` end to end for numbering/prose consistency
- 1.4 Add an `UPGRADE_NOTES.md` entry for the behavior change
- 1.5 Full validation gate (`bash scripts/lint.sh`)

## Progress

PR: #94

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Differential regression gate

- [x] 1.1 Write `skills/om-fix/references/regression-gate.md` — 3de39f2
- [x] 1.2 Reorder `skills/om-fix/SKILL.md` Steps 2–5 into the Intention-Learning + Red/Green gate — d4d9f5b
- [x] 1.3 Re-read the full `SKILL.md` end to end for numbering/prose consistency — d4d9f5b (no separate diff; verified as part of the step 1.2 edit — no dangling step-number references, output contract unchanged except the `Tests:` line)
- [x] 1.4 Add an `UPGRADE_NOTES.md` entry for the behavior change — 6b1e0ba
- [x] 1.5 Full validation gate (`bash scripts/lint.sh`) — PASS (Lint OK.)
- [x] 1.6-review-fix Apply `om-auto-review-pr` findings: drop stale "and the regression test to add" from Step 2 (test is now authored in Step 3 from the Semantic Oracle, not identified in Step 2), retitle Step 2 to imperative style — 61e48d2
