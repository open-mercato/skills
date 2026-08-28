# Optional SBST/CodaMosa Coverage Expansion for `om-fix`

## 📝 TLDR
Once a fix is verified green, `om-fix` today stops — coverage around the fixed code path is whatever the analyzer named plus whatever occurred to the fixing agent. This spec adds an entirely optional, config-gated step: if a target repo declares an `sbst` block in its own `.ai/agentic.config.json`, `om-fix` runs the repo's own configured search-based-testing command (Pynguin, EvoSuite, Stryker, or anything else) against the corrected module for extra coverage, exactly mirroring the existing `validation.commands` convention — `om-fix` never hardcodes a specific tool. `om-setup-agent-pipeline`'s setup interview is extended to *offer* this (never to install a new tool) when it detects one already in the repo. Source brief: `sbst-ai-integration-spec.md` (repo root). Sibling spec: `2026-08-28-om-fix-intention-differential-gate.md` (the mandatory Red/Green gate) — this spec does not depend on that one landing first; it only needs a fix that has already passed `om-fix`'s existing validation loop, a condition true today regardless of the sibling spec.

## 📝 Problem Statement
`om-fix` fixes exactly the bug named in the brief and adds exactly the test(s) the fixing agent thinks to write. Nothing sweeps the surrounding branches of the modified module for cheap additional coverage. Per Zhao et al. (2026), coverage/mutation-score expansion is most effective once the underlying code is already correct — which is precisely the state `om-fix` reaches right after its fix is verified — and per the CodaMosa line of work (Lemieux et al. 2023), a pure search-based approach plateaus on complex business logic (e.g. ERP billing/invoicing) unless seeded with semantically valid inputs, which an LLM can supply cheaply where a genetic algorithm alone cannot.

A second, smaller problem this spec now also addresses (folded in after a prior implementation attempt, PR #92, closed in favor of the spec-driven process — see *Revision note* below): even once `om-fix` can run a configured `sbst` command, nothing ever *offers* a repo the option — an operator has to know the feature exists and hand-write the config block. A repo that already has a coverage-expansion tool installed (Stryker, Pynguin, EvoSuite, or an equivalent) is exactly the population this feature is for, and `om-setup-agent-pipeline` already runs a detection pass over the repo at setup time.

## 📝 Proposed Solution
After a fix is confirmed green, if `.ai/agentic.config.json` declares an `sbst` block, run the operator's own configured command(s) against the corrected module — exactly mirroring how `validation.commands` already works: `om-fix` never names Pynguin, EvoSuite, or any other tool itself; the operator's repo does, in its own committed config. When useful, the agent may write LLM-authored semantic seed fixtures to a documented path for the tool to pick up (CodaMosa's plateau-escape idea). This step is always best-effort and never fails the run — a missing tool, a non-zero exit, or the field being absent all degrade to a logged skip, the same non-fatal-degrade pattern `om-fix` already uses for label mutations.

`om-setup-agent-pipeline` gains one more interview question, asked only when its existing dependency/lockfile scan finds a coverage-expansion or mutation-testing tool already installed (or the user names one): offer to record its run command as `sbst.enabled`/`sbst.commands` and turn the feature on. It never proposes installing a new tool — this only wires up one the repo already chose for itself.

### Revision note
A prior session implemented this same idea directly as PR #92 (`feat(om-fix): differential red/green regression gate + optional SBST coverage pass`), bundling the differential gate and the setup-wizard wiring into one PR. That PR was closed in favor of doing this through `om-spec-writing`'s process (skeleton, Open Questions gate, scope-cohesion review) instead. Its design for the wizard wiring was sound and is reused here (detection heuristic, interview question, a dedicated `references/sbst.md` contract file) — this spec keeps `commands` as an array (this spec's existing convention, exactly mirroring `validation.commands`) rather than PR #92's singular `command`, and keeps the seed-fixture path a fixed convention (`.ai/qa/sbst-seeds/<module>/`) rather than introducing a separate `seedsDir` config key, so the schema stays as small as it can.

### Departures from the source brief
- **No hardcoded tool or package-manager names.** `scripts/lint.sh`'s grep gate forbids hard-coding a package manager or product-specific tooling into any `SKILL.md` in this collection (`om-fix` ships into arbitrary target repos, of arbitrary languages). The brief's example script assumes `npm test` and names Pynguin/EvoSuite directly in the workflow prose; this spec instead reuses the `validation.commands` pattern — the target repo's own config says what to run and how.
- **Mechanics live in the same `references/regression-gate.md` file the sibling spec introduces**, in a new section, rather than inlined into `SKILL.md`'s numbered steps (body-length budget, per the sibling spec's rationale). The setup-wizard side of this feature gets its own new reference file, `skills/om-setup-agent-pipeline/references/sbst.md`, for the same reason (see Architecture — that skill's body budget is especially tight).

## 📝 Architecture

**Touched surface:**
- `skills/om-fix/SKILL.md` (one new optional step + step-0 this-skill-uses line)
- `skills/om-fix/references/regression-gate.md` (new "SBST expansion" section, added by this spec regardless of whether the sibling spec's version of the file exists yet — see Implementation Plan step 1)
- `skills/om-fix/references/agentic-setup.md` (this-skill-uses list gains the two new optional config keys)
- `skills/om-setup-agent-pipeline/SKILL.md` (config-schema example gains `"sbst": null`, the field-reference table gains one bullet, the toolchain-detection step gains one clause pointing at the new reference file — kept to the smallest possible diff, see the body-budget note below)
- `skills/om-setup-agent-pipeline/references/interview-questions.md` (one new numbered question, conditional on detection)
- `skills/om-setup-agent-pipeline/references/sbst.md` (new — the full `sbst` contract: shape, why post-fix-only, setup-time detection, failure handling)
- `.ai/agentic.config.json`'s documented schema (README.md's config section, next to `validation.commands`)

**⚠️ Body-budget risk:** `skills/om-setup-agent-pipeline/SKILL.md`'s body is already ~19,630 of the ~20,000-char lint-enforced budget — about 370 chars of headroom. Every addition to that file's *body* (not its `references/`) in this spec must be a bare pointer, on the order of what PR #92 achieved (roughly three short additions: one JSON line, one field-reference bullet, one clause on the detection step — well under 370 chars combined, verified by that PR's actual diff). If `bash scripts/lint.sh` still fails the budget after the minimal addition, the fix is to trim existing prose elsewhere in that same file in this PR (compressing, not cutting content) rather than skipping the addition or inlining detail that belongs in `references/`.

**New `om-fix` step**, inserted after the existing full validation-gate loop and before the report-back step: if `sbst.enabled` is true and `sbst.commands` is non-empty, run those commands against the corrected module(s). Any newly generated test file that itself passes the validation gate is added to the fix's `Files changed`; anything flaky or failing is discarded, not committed.

**New `om-setup-agent-pipeline` detection + question:** the skill's existing toolchain-detection step (which already inspects the repo to suggest `validation.commands`) additionally checks for an installed coverage-expansion/mutation-testing dependency — a `stryker`/`@stryker-mutator/*` package, `pynguin` in `pyproject.toml`/`requirements*.txt`, an EvoSuite jar/plugin, or an equivalent for the detected stack. The interview then asks the `sbst` question **only** when something was detected, or the user names a tool unprompted; otherwise `sbst` is left unset entirely (no question asked, no default row added to a fresh config). This mirrors the shape of the existing `closeKeywords` question (optional, off by default, asked conditionally) rather than inventing a new interview pattern.

## 📝 Data Model
Additive-only optional block in `.ai/agentic.config.json`, sibling to `validation`:

```json
"sbst": {
  "enabled": true,
  "commands": ["pynguin --project-path . --module-name app.billing --output-path .ai/qa/sbst"]
}
```

- `enabled` (bool, default `false`) — gate; absent or `false` skips the step entirely. `om-setup-agent-pipeline` writes `"sbst": null` into a fresh config's example/default shape (matching how other optional sections are represented), never a populated block, unless the interview question was actually answered yes.
- `commands` (string array) — run as-is, in order, same convention as `validation.commands`. `om-fix` does not validate or know the tool; a non-zero exit is logged and skipped, never a gate failure.
- Seed fixtures the agent authors (CodaMosa-style) are written to a documented, fixed path — `.ai/qa/sbst-seeds/<module>/` — that the operator's own `commands` can reference if their tool supports seeding. No new hook/callback contract is introduced; this is a path convention only, matching how `.ai/qa/test-env.json` is already a documented convention other skills attach to. (No separate `seedsDir` config key — kept out to hold the schema to two fields.)

No production data model changes; no PII.

## 📝 API Contracts
None beyond `om-fix`'s existing plain-text output contract, which gains an optional note in `Tests:` naming which `sbst` commands ran and what they added — the field's shape and downstream parsing are otherwise untouched (confirmed no downstream skill strictly parses `Tests:` wording).

## 📝 UI/UX
Not applicable — both touched skills are headless workflow skills; `om-setup-agent-pipeline`'s "UI" is its terminal interview, and the new question follows the exact yes/no + free-text-command shape every other conditional interview question already uses (e.g. `closeKeywords`).

## 📝 Edge Cases & Failure Scenarios
- **`sbst` configured but the named tool isn't installed in this environment** → logged skip, run continues; never blocks the fix.
- **`sbst` command produces a test file that fails the validation gate** → discard that file, keep the manually-authored regression test from the fix step; don't let exploratory output regress the gate.
- **`sbst` command hangs or runs long** → treat like any other configured command with no bespoke timeout handling beyond what the environment already imposes; out of scope to design a new timeout mechanism here since `validation.commands` has none either.
- **Repo sets `sbst.enabled: true` but leaves `commands` empty** → treat as effectively disabled; log and skip, don't error.
- **Generated seed fixtures accumulate across runs** → `.ai/qa/sbst-seeds/<module>/` is overwritten per run, not appended; stale seeds from a previous fix are not a correctness concern for the *next* fix since each run's seeds are scoped to that run's module.
- **Setup-time detection finds a tool but the user declines the question** → `sbst` stays unset; re-running `om-setup-agent-pipeline` later re-asks (same behavior as every other conditional interview question).
- **`--defaults` (unattended) setup run** → the `sbst` question is skipped like every other interactive-only question; `sbst` stays unset regardless of detection. Detection driving an unattended default-enable would be a scope change (running a repo's own tool without explicit consent) and is explicitly not proposed here.

## 📝 Risks & Impact Review
- **Blast radius:** two skill packages (`om-fix`, `om-setup-agent-pipeline`), one new reference file in each, and documentation (README config section, `UPGRADE_NOTES.md`).
- **Compatibility:** additive-only change to `.ai/agentic.config.json`; existing configs remain valid with `sbst` simply absent (skip). A repo that re-runs `om-setup-agent-pipeline` and declines the new question ends up with the same config it had before (`sbst` unset).
- **New execution surface:** this is the first place `om-fix` runs operator-configured commands whose failure is explicitly *not* gated — worth flagging in review, since it's a deliberate deviation from the "any non-zero exit fails the gate" rule that governs `validation.commands`. The rationale (exploratory coverage expansion, not correctness) should be stated plainly in the `SKILL.md` prose so it isn't mistaken for a gap.
- **Tight body budget on `om-setup-agent-pipeline/SKILL.md`** (see Architecture) — the real risk in this spec is landing a change that fails `bash scripts/lint.sh` on char count, not a logic risk.
- **Downstream propagation:** `skills-lock.json`'s `computedHash` for both `om-fix` and `om-setup-agent-pipeline` changes; consumer repos pick this up on their next skill-update run. The `sbst` field itself requires no migration — it's simply inert until an operator opts in (by hand, or by answering yes to the new question on a fresh/re-run setup).
- **Rollback:** revert the diff on both skills; the `sbst` config key becomes inert if a repo rolls back to older skill versions.

## 📋 Phasing
Single phase, fully inert for any repo that never sets `sbst.enabled: true` and never answers yes to the new setup question.

## 📋 Implementation Plan
1. If `skills/om-fix/references/regression-gate.md` doesn't yet exist (sibling spec not yet implemented), create it with just enough structure to host this spec's section; if it does exist, add to it. Either way, add an "SBST expansion" section: read `sbst.enabled`/`sbst.commands`, skip if absent, run as best-effort/non-blocking, write agent-authored seeds to `.ai/qa/sbst-seeds/<module>/`, fold any newly-passing generated tests into `Files changed`. *Test:* file reads coherently; the non-blocking nature is stated explicitly and unambiguously.
2. Add the new step to `skills/om-fix/SKILL.md` (a short pointer into the reference section above), positioned after the existing full validation-gate loop and before report-back; add `sbst.enabled`/`sbst.commands` to the step-0 this-skill-uses line. *Test:* `bash scripts/lint.sh` passes.
3. Update `skills/om-fix/references/agentic-setup.md`'s "this-skill-uses" config-var list to mention `sbst.enabled` / `sbst.commands` as optionally consumed. *Test:* lint green.
4. Write `skills/om-setup-agent-pipeline/references/sbst.md`: the full contract (shape, the "why after the fix, never before" rationale, setup-time detection, failure handling) — this is where the bulk of the explanation lives, kept out of the body-budget-constrained `SKILL.md`.
5. Add one new conditional question to `skills/om-setup-agent-pipeline/references/interview-questions.md`, matching the shape of the existing `closeKeywords` question: asked only when detection (step 6) finds a tool or the user names one; records `sbst.enabled`/`sbst.commands` when answered yes; skipped entirely under `--defaults`.
6. Make the minimal `skills/om-setup-agent-pipeline/SKILL.md` body edits: `"sbst": null` in the example config JSON, one field-reference bullet pointing to `references/sbst.md`, one clause appended to the existing toolchain-detection step pointing at the same file. *Test:* `bash scripts/lint.sh` passes, specifically the body-length budget check — if it fails, compress existing prose elsewhere in the file rather than cutting this addition (see the Architecture risk note).
7. Document the optional `sbst` block in README.md's config section (next to where `validation.commands` is already documented), matching the Data Model shape above. *Test:* doc renders; matches this spec's schema.
8. Add an `UPGRADE_NOTES.md` entry for the new opt-in `sbst` schema and setup question, following the file's existing Symptom/Fix format (Symptom: none for existing repos, this is purely additive; Fix: re-run `om-setup-agent-pipeline` to be asked the new question, or hand-edit the config).
9. Full gate: `bash scripts/lint.sh` green across the whole collection.

Every step leaves the collection in a shippable state; this capability layers onto `om-fix` and `om-setup-agent-pipeline` without changing behavior for any repo that doesn't opt in.
