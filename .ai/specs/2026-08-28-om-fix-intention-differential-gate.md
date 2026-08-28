# Intention-Learning & Differential Regression Gate for `om-fix`

## 📝 TLDR
`om-fix` writes its regression test *after* the fix, against code it (or the analyzer) has already read as buggy — nothing today proves the test would actually have caught the original bug. This spec reorders `om-fix`'s workflow into a test-first "Red/Green" differential gate: derive the expected behavior from the issue and root-cause brief (never from the current, possibly-wrong code), prove the resulting test fails on the unfixed code, apply the minimal fix, prove it passes. Source brief: `sbst-ai-integration-spec.md` (repo root); see the *Departures from the source brief* note below. A companion capability from the same source brief — optional SBST/CodaMosa coverage expansion — is deliberately **not** in this spec; see the sibling spec `2026-08-28-om-fix-sbst-coverage-expansion.md`.

## 📝 Problem Statement
`om-fix`'s current Step 4 ("Add regression tests") writes the test after Step 3 has already made the fix, using the same context that produced the fix. This is exactly the setup the misguidance-effect literature (Huang et al. 2024) warns about: an LLM asked to write a test against code it just wrote (or just read as the "already correct" version) tends to assert what the code *does*, not what it *should* do. A test written this way passes trivially and adds nothing to the regression suite — but `om-fix`'s own output contract reports it under `Tests:` as if it were real coverage, and every downstream consumer (`om-open-pr`, `om-auto-review-pr`, a human merging the PR) currently has no way to tell a rubber-stamp test from a real one without re-deriving the bug themselves.

## 📝 Proposed Solution
Reorder the workflow so the test is drafted from the issue/root-cause description (the "Semantic Oracle") *before* any production edit exists, is run once to confirm it **fails** on the untouched code, then the minimal fix is applied and the same test is run again to confirm it **passes**. Because the test is written before the fix, "fails without" is simply "run it now" — no stashing, no checkout tricks, no new git commands.

### Departures from the source brief
- **File path.** The brief names `skills/skills/om-fix/SKILL.md`; the actual path in this repo is `skills/om-fix/SKILL.md`.
- **No `git stash`.** The brief's example script isolates the "fails without" run by stashing production edits (`git stash --keep-index -- include-untracked`, itself invalid flag syntax) and popping them back. Test-first ordering makes this unnecessary: at the point the test first runs, no production edit exists yet, so there's nothing to stash. This also resolves a self-contradiction in the source brief, whose own review checklist forbids adding git commands to the workflow while its own example script uses `git stash`/`git stash pop`.
- **Mechanics live in a new reference file**, not inlined into `SKILL.md`'s numbered steps, to stay inside the collection's ~20,000-char body budget (`skills/om-fix/SKILL.md` is currently ~7.6K chars).
- **Scope narrowed to the differential gate only.** The source brief also proposes SBST/CodaMosa tool orchestration (Pynguin, EvoSuite). An earlier draft of this spec bundled that in as a config-gated "Phase 2," reasoned as depending on this gate landing first. A fresh-context scope-cohesion review found that dependency doesn't actually hold — SBST only needs *a green fix*, a condition today's unmodified `om-fix` already satisfies via its existing validation loop, independent of this spec's changes. Per the project's own rule ("one independently deployable capability per spec"), that capability now lives in its own spec: `2026-08-28-om-fix-sbst-coverage-expansion.md`.

## 📝 Architecture

**Touched surface:** `skills/om-fix/SKILL.md` (step reordering + pointers) and a new `skills/om-fix/references/regression-gate.md` (the differential-gate mechanics — same pattern as the existing `references/claim-pr.md`). Nothing else in the collection changes.

**Reordered workflow** (replaces current Steps 3–5; Step 6's report format is unchanged):

| Step | Today | Proposed |
|---|---|---|
| 2 | Read analyzer's brief | Read analyzer's brief **+ Intention Learning**: state the expected business behavior from the issue/root-cause text alone, before treating the current code's actual behavior as ground truth |
| 3 | Make minimal change | **Draft the Red test** from the Semantic Oracle; run it now (code is still unmodified) — it **must fail**. If it passes, it's invalid (misguidance effect or a trivial assertion); rewrite and re-run. No fixed attempt cap — the agent uses judgment, same as the existing `Status: blocked` pattern for a missing/contradictory brief; if it genuinely cannot produce a test that fails on the described bug, it ends `Status: blocked` with that reason rather than looping forever |
| 4 | Add regression tests | **Make the minimal change** (today's Step 3, unchanged in substance) |
| 5 | Validation loop | **Verify Green**: rerun the same test — it must now pass. A failure here means the *fix* is incomplete, not the test (the test was already proven to target the bug in Step 3). The existing full validation-gate loop (today's Step 5 body) then runs as before |
| 6 | Report back | *(unchanged)* |

## 📝 Data Model
None. No config schema changes, no production data model changes, no PII.

## 📝 API Contracts
None. `om-fix`'s only "contract" is its plain-text output message to `om-open-pr` (`Status:`, `Files changed:`, `Summary:`, `Tests:`, `Breaking changes:`) — **unchanged** by this spec, beyond the `Tests:` line noting the fail-then-pass verification. Confirmed no downstream skill strictly parses that field's exact wording.

## 📝 UI/UX
Not applicable — `om-fix` is a headless workflow skill with no UI surface.

## 📝 Edge Cases & Failure Scenarios
- **Test never fails on the buggy code, no matter how it's rewritten** (bug isn't reproducible in this environment, or the brief's root-cause is itself wrong) → `Status: blocked` with that reason, same as today's missing/contradictory-brief case. No numeric retry cap is enforced; the agent's judgment governs when to give up.
- **Test is flaky** (fails/passes nondeterministically on the same unmodified code) → treat as "did not reliably fail"; do not proceed to the fix on an unreliable oracle — same blocked path as above.
- **Fix applied but the previously-red test still fails** → the fix is incomplete, not the test; iterate on the fix (existing validation-loop behavior), never rewrite the test to make it pass.
- **Analyzer's brief already includes a proposed test snippet** → treat it as a first draft input to Intention Learning, not as the Semantic Oracle itself; still cross-check it against the issue description and still run the fail-first verification on it.
- **Repo has no test runner configured at all** (`validation.commands` empty) → unchanged from today; this failure mode already exists in today's Step 4 and isn't newly introduced.

## 📝 Risks & Impact Review
- **Blast radius:** one skill package (`om-fix`) plus its own new reference file plus `UPGRADE_NOTES.md`. Verified no other installed skill references `om-fix`'s internal step numbers, so the reorder is safe.
- **Compatibility:** no config schema changes. The workflow-behavior change (test-first, fail-then-pass gate) is a behavior change to an existing, already-installed skill — worth surfacing in `UPGRADE_NOTES.md` because `om-fix` runs will now take one extra validation cycle per fix and may end `Status: blocked` in a case that previously would have (weakly) proceeded with an untested-against-the-bug test.
- **Downstream propagation:** `skills-lock.json`'s `computedHash` for `om-fix` changes with the `SKILL.md` edit; consumer repos pick this up on their next skill-update run, per the existing distribution mechanism.
- **Rollback:** revert the `SKILL.md` / reference-file diff; no data or config migration in either direction.

## 📋 Phasing
Single phase — this capability is independently shippable and valuable with zero configuration. The sibling spec (`2026-08-28-om-fix-sbst-coverage-expansion.md`) can land before, after, or independent of this one; it only requires a green fix, which today's `om-fix` already produces.

## 📋 Implementation Plan
1. Write `skills/om-fix/references/regression-gate.md`: Intention-Learning discipline (derive expected behavior from the issue/brief text, not from reading the current code's output as correct), the test-first Red/Green protocol, the flaky-test and can't-reproduce failure paths, and the uncapped-but-judgment-bounded `Status: blocked` escape hatch. *Test:* file exists and reads coherently against `skills/om-fix/references/claim-pr.md`'s existing style/level of detail.
2. Reorder `skills/om-fix/SKILL.md` Steps 2–5 per the table above; each step's prose becomes a short pointer into `references/regression-gate.md` for the mechanics, matching how Step 0 already points to `references/agentic-setup.md`. Update any step-number cross-references elsewhere in the file (e.g. the Rules section). *Test:* `bash scripts/lint.sh` passes (frontmatter, body-length budget, product-agnostic grep gate).
3. Re-read the full `SKILL.md` end to end for numbering/prose consistency. *Test:* no dangling references to the old step numbering; the output contract section (today's Step 6) is unchanged except for the `Tests:` line's note about fail-then-pass verification.
4. Add an `UPGRADE_NOTES.md` entry ("### 2026-08 — `om-fix` differential regression gate") describing the behavior change and that no operator action is required to adopt it, following the file's existing Symptom/Fix format.
5. Full gate: `bash scripts/lint.sh` green across the whole collection.

Every step leaves the collection in a shippable state.
