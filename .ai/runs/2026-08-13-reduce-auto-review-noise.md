# Execution plan — land the review-noise-reduction spec by resolving @pkarw's blockers and majors (adopted from PR #80)

**Origin:** adopted — reconstructed by `om-auto-continue-pr` on 2026-08-13 because PR #80 carried no execution plan (it was opened by `om-auto-write-spec`, which lands a spec rather than a tracking plan).
**PR:** #80 · **Branch:** `cez/ae26ac11` · **Base:** `main`
**Author:** @wojciechszyjka — this plan interprets their intent; correct it by editing this file or commenting on the PR.

## 🎯 Goal

Merge `.ai/specs/2026-08-12-review-noise-reduction.md` as a spec that is safe to implement: the quiet-mode allowlist must not suppress executable or dependency changes, the re-review fingerprint must not go silent on a whitespace-semantic change, the claim protocol must stay intact, and every contract the document claims must be one the repository actually has.

The PR is a design deliverable that stays design-only. Its merge blocker is not missing work but three safety findings and three design findings from @pkarw's `CHANGES_REQUESTED` review of 2026-08-13T07:36:19Z, plus one decision (**A3**) that was the stated reason the PR was opened as a draft and that the repository owner has now made.

## Scope

- `.ai/specs/2026-08-12-review-noise-reduction.md` — the spec under review.
- `DECISIONS.md` — the 2026-07-23 reporting decision that assumption **A3** amends.
- The PR description and the review conversation on #80.
- A follow-up issue carrying Phase 3 (incremental re-review) out of this document.

## Non-goals

- **No implementation.** Not one skill file changes on this PR; the spec's own phases ship as their own PRs (`AGENTS.md` atomic-spec-PR rule, `DECISIONS.md` 2026-07-23).
- **No edits to the parsed anchors** (`# 🔍 Code Review`, `## Verdict`, severity headings, the `PR:` / `Issue:` chaining lines) — this run only corrects what the spec *claims* about them.
- **No `rules.md` sweep.** The 30 unsynced copies stay untouched (assumption **A1**, still open for the reviewer).
- **Phase 3 leaves this document** and becomes a follow-up spec; it is not designed here.

## Evidence

| Conclusion | Drawn from | Confidence |
|---|---|---|
| The goal is to clear the six review findings, not to add spec scope | @pkarw review 2026-08-13T07:36:19Z — "three blockers and three majors must be resolved before this design can safely drive implementation" | high |
| **A3** is approved and the 2026-07-23 decision may be superseded | Wojciech Szyjka's decision of 2026-08-13, relayed in the run brief; the PR body names A3 as the sole reason for draft state | high |
| `git patch-id --stable` really does collide on a semantic whitespace change | Reproduced locally on git 2.50.1: moving `audit_log()` out of an `if user.is_admin:` guard yields an identical `--stable` id (`4e2b2d7f…`) and distinct `--verbatim` ids (`9b1a2cbd…` / `37d86fee…`) | high |
| `--verbatim` keeps the rebase invariance the gate depends on | Same harness: rebasing across an unrelated commit and across a line-shifting commit in the same file leaves the `--verbatim` id unchanged (`cf241a5d…`); `git-patch-id(1)` — "line numbers ignored" is inherent to patch-id, `--verbatim` only stops whitespace stripping | high |
| `BACKWARD_COMPATIBILITY.md` §5 does **not** list the review headings | `BACKWARD_COMPATIBILITY.md:42–56` — it lists the Progress section, the `Tracking plan:`/`Status:` lines, `test-env.json`, launcher scripts, the chaining reference lines, and the `om-brainstorm` routing lines | high |
| No skill parses a review **body**; the verdict travels as tracker state or in-session report | `om-approve-merge-pr/SKILL.md:21` reads `reviewDecision`; `om-auto-fix-pr/SKILL.md:53` consumes `om-auto-review-pr`'s report; `om-review-prs/SKILL.md:63` only renders a `Verdict` column in its own table | high |
| The full-report requirement lives in six places, not the three the spec names | `om-code-review/SKILL.md:26`, `om-code-review/references/output-format.md:12`, `om-auto-review-pr/SKILL.md:44` and `:64`, `om-auto-review-pr/references/verdict-and-labels.md:9`, `CODE_REVIEW.md` priority 8 + severity guidance | high |

## Assumptions

- **The reviewer keeps the final word on A3.** The decision is recorded in `DECISIONS.md` and answered on the PR; it is not treated as overriding the review. If @pkarw disagrees, the decision entry is the thing to revert, and reverting it is a one-commit documentation change.
- **`:200` is answered by keeping the claim protocol as it is** — the smaller blast radius the reviewer himself preferred — rather than by migrating every claim consumer. If a later run wants the consolidation, it needs its own spec.
- **The `:168` claim is corrected toward the repository, not defended.** The reviewer is right on the facts; the spec is wrong and gets fixed, and the compatibility policy gains the format explicitly rather than the spec asserting a protection that does not exist.
- **`--verbatim` hunk ordering is not made a load-bearing property.** `--stable`'s ordering guarantee is dropped with it; any ordering difference produces a *spurious review*, never silence, which is the direction the fail-open rule already permits.

## Risks

- The fingerprint change trades a small amount of suppression (a pure re-indent now re-reviews) for the removal of a silent-suppression class. That is the intended direction and is stated in the spec.
- Splitting Phase 3 out reduces this document's scope after a reviewer has already read it; the follow-up issue must carry enough context to stand alone.
- `CODE_REVIEW.md` priority 8 currently makes a terser report a review finding, so Phase 2 of the spec must amend it or the projection would be flagged by the very reviewer that posts it. Missing this would make the spec self-contradictory.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Already landed on this PR (reconstructed)

- [x] 1.1 The spec `.ai/specs/2026-08-12-review-noise-reduction.md` was authored and opened for review — cb13679

### Phase 2: Resolve A3 and the decision record

- [x] 2.1 Clear the A3 confirmation gate in the spec — drop `⚠ NEEDS HUMAN CONFIRMATION`, the "Phase 2 must not merge until the team confirms A3" gate, and every dependent hedge in Risks, Phasing, and Rollout  — a87bdae
- [x] 2.2 Record the 2026-08-13 decision in `DECISIONS.md`, superseding the 2026-07-23 reporting entry in place while leaving the original visible and annotated  — a87bdae

### Phase 3: Resolve the three blockers

- [x] 3.1 `:70` — restate the quiet-mode allowlist as a rule (non-executable, non-dependency prose only) instead of a path list, with executables, CI definitions, lockfiles, manifests, scripts, and mode changes named as never-quiet — 016e7cb
- [x] 3.2 `:57` — move the fingerprint to a whitespace-preserving identity (`git patch-id --verbatim`), cite the verification, and delete the `:216` acceptance of false silence — 016e7cb
- [x] 3.3 `:200` — keep the claim/take-over signal unchanged, and state why consolidating it needs its own spec — 016e7cb

### Phase 4: Resolve the three majors

- [x] 4.1 `:278` — reconcile mergeability and required-check state before the no-op gate, idempotently, so only the substantive review is suppressed — 016e7cb
- [x] 4.2 `:168` — ground the contract inventory in the repository's actual consumers and enumerate every instruction file Phase 2 must change — 016e7cb
- [x] 4.3 `:247` — move Phase 3 to a follow-up spec and give Phase 1 and Phase 2 their own executable acceptance criteria and separate implementation PRs — 016e7cb

### Phase 5: Expand the fixture matrix

- [x] 5.1 Add the reviewer's Test Coverage cases to the fixture plan — executable CI changes, dependency/lockfile changes, whitespace-semantic sources, CI red→green and green→red, conflict appearance and recovery on unchanged content, and old/new claim-comment interop — 016e7cb

### Phase 6: Land the PR

- [ ] 6.1 Run the validation gate (`bash scripts/lint.sh`) and push
- [ ] 6.2 Update the PR description — remove "Why this is a draft" and the A3 ask, keep the A1 and fail-open asks
- [x] 6.3 File the Phase 3 follow-up issue via `om-followup-issue-from-pr`, linked to #80 — issues #82 (Phase 3 spec) and #83 (implementation tracking)
- [ ] 6.4 Answer @pkarw on the PR with the A3 decision and the repository evidence behind the `:168` correction
- [ ] 6.5 Run `om-auto-review-pr 80 --autofix` to a clean verdict, then hand off to `om-approve-merge-pr 80`
