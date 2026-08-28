# Optional SBST/CodaMosa Coverage Expansion for `om-fix`

## 📝 TLDR
Once a fix is verified green, `om-fix` today stops — coverage around the fixed code path is whatever the analyzer named plus whatever occurred to the fixing agent. This spec adds an entirely optional, config-gated step: if a target repo declares an `sbst` block in its own `.ai/agentic.config.json`, `om-fix` runs the repo's own configured search-based-testing command (Pynguin, EvoSuite, or anything else) against the corrected module for extra coverage, exactly mirroring the existing `validation.commands` convention — `om-fix` never hardcodes a specific tool. Source brief: `sbst-ai-integration-spec.md` (repo root). Sibling spec: `2026-08-28-om-fix-intention-differential-gate.md` (the mandatory Red/Green gate) — this spec does not depend on that one landing first; it only needs a fix that has already passed `om-fix`'s existing validation loop, a condition true today regardless of the sibling spec.

## 📝 Problem Statement
`om-fix` fixes exactly the bug named in the brief and adds exactly the test(s) the fixing agent thinks to write. Nothing sweeps the surrounding branches of the modified module for cheap additional coverage. Per Zhao et al. (2026), coverage/mutation-score expansion is most effective once the underlying code is already correct — which is precisely the state `om-fix` reaches right after its fix is verified — and per the CodaMosa line of work (Lemieux et al. 2023), a pure search-based approach plateaus on complex business logic (e.g. ERP billing/invoicing) unless seeded with semantically valid inputs, which an LLM can supply cheaply where a genetic algorithm alone cannot.

## 📝 Proposed Solution
After a fix is confirmed green, if `.ai/agentic.config.json` declares an `sbst` block, run the operator's own configured command(s) against the corrected module — exactly mirroring how `validation.commands` already works: `om-fix` never names Pynguin, EvoSuite, or any other tool itself; the operator's repo does, in its own committed config. When useful, the agent may write LLM-authored semantic seed fixtures to a documented path for the tool to pick up (CodaMosa's plateau-escape idea). This step is always best-effort and never fails the run — a missing tool, a non-zero exit, or the field being absent all degrade to a logged skip, the same non-fatal-degrade pattern `om-fix` already uses for label mutations.

### Departures from the source brief
- **No hardcoded tool or package-manager names.** `scripts/lint.sh`'s grep gate forbids hard-coding a package manager or product-specific tooling into any `SKILL.md` in this collection (`om-fix` ships into arbitrary target repos, of arbitrary languages). The brief's example script assumes `npm test` and names Pynguin/EvoSuite directly in the workflow prose; this spec instead reuses the `validation.commands` pattern — the target repo's own config says what to run and how.
- **Mechanics live in the same `references/regression-gate.md` file the sibling spec introduces**, in a new section, rather than inlined into `SKILL.md`'s numbered steps (body-length budget, per the sibling spec's rationale).

## 📝 Architecture

**Touched surface:** `skills/om-fix/SKILL.md` (one new optional step), `skills/om-fix/references/regression-gate.md` (new "SBST expansion" section, added by this spec regardless of whether the sibling spec's version of the file exists yet — see Implementation Plan step 1), `skills/om-fix/references/agentic-setup.md` (this-skill-uses list gains the two new optional config keys), and `.ai/agentic.config.json`'s documented schema (README.md's config section, next to `validation.commands`). `om-setup-agent-pipeline` is **not** modified — see Phasing.

**New step**, inserted after the existing full validation-gate loop and before the report-back step: if `sbst.enabled` is true and `sbst.commands` is non-empty, run those commands against the corrected module(s). Any newly generated test file that itself passes the validation gate is added to the fix's `Files changed`; anything flaky or failing is discarded, not committed.

## 📝 Data Model
Additive-only optional block in `.ai/agentic.config.json`, sibling to `validation`:

```json
"sbst": {
  "enabled": true,
  "commands": ["pynguin --project-path . --module-name app.billing --output-path .ai/qa/sbst"]
}
```

- `enabled` (bool, default `false`) — gate; absent or `false` skips the step entirely.
- `commands` (string array) — run as-is, in order, same convention as `validation.commands`. `om-fix` does not validate or know the tool; a non-zero exit is logged and skipped, never a gate failure.
- Seed fixtures the agent authors (CodaMosa-style) are written to a documented, fixed path — `.ai/qa/sbst-seeds/<module>/` — that the operator's own `commands` can reference if their tool supports seeding. No new hook/callback contract is introduced; this is a path convention only, matching how `.ai/qa/test-env.json` is already a documented convention other skills attach to.

No production data model changes; no PII.

## 📝 API Contracts
None beyond `om-fix`'s existing plain-text output contract, which gains an optional note in `Tests:` naming which `sbst` commands ran and what they added — the field's shape and downstream parsing are otherwise untouched (confirmed no downstream skill strictly parses `Tests:` wording).

## 📝 UI/UX
Not applicable — `om-fix` is a headless workflow skill with no UI surface.

## 📝 Edge Cases & Failure Scenarios
- **`sbst` configured but the named tool isn't installed in this environment** → logged skip, run continues; never blocks the fix.
- **`sbst` command produces a test file that fails the validation gate** → discard that file, keep the manually-authored regression test from the fix step; don't let exploratory output regress the gate.
- **`sbst` command hangs or runs long** → treat like any other configured command with no bespoke timeout handling beyond what the environment already imposes; out of scope to design a new timeout mechanism here since `validation.commands` has none either.
- **Repo sets `sbst.enabled: true` but leaves `commands` empty** → treat as effectively disabled; log and skip, don't error.
- **Generated seed fixtures accumulate across runs** → `.ai/qa/sbst-seeds/<module>/` is overwritten per run, not appended; stale seeds from a previous fix are not a correctness concern for the *next* fix since each run's seeds are scoped to that run's module.

## 📝 Risks & Impact Review
- **Blast radius:** one skill package (`om-fix`), its reference file, its `agentic-setup.md`, and documentation (README config section, `UPGRADE_NOTES.md`). `om-setup-agent-pipeline` is explicitly untouched.
- **Compatibility:** additive-only change to `.ai/agentic.config.json`; existing configs remain valid with `sbst` simply absent (skip).
- **New execution surface:** this is the first place `om-fix` runs operator-configured commands whose failure is explicitly *not* gated — worth flagging in review, since it's a deliberate deviation from the "any non-zero exit fails the gate" rule that governs `validation.commands`. The rationale (exploratory coverage expansion, not correctness) should be stated plainly in the `SKILL.md` prose so it isn't mistaken for a gap.
- **Downstream propagation:** `skills-lock.json`'s `computedHash` for `om-fix` changes; consumer repos pick this up on their next skill-update run. The `sbst` field itself requires no migration — it's simply inert until an operator opts in.
- **Rollback:** revert the `SKILL.md` / reference-file diff; the `sbst` config key becomes inert if a repo rolls back to an older `om-fix` version.

## 📋 Phasing
Single phase, fully inert for any repo that never sets `sbst.enabled: true`. **Explicitly out of scope:** teaching `om-setup-agent-pipeline` to ask about SBST tooling during initial setup — its `SKILL.md` is already close to the collection's body-length budget, and prompting the large majority of repos with no SBST tooling installed for a niche, advanced feature isn't worth the added setup-flow complexity yet. Left as a natural future follow-up once `sbst` adoption data exists.

## 📋 Implementation Plan
1. If `skills/om-fix/references/regression-gate.md` doesn't yet exist (sibling spec not yet implemented), create it with just enough structure to host this spec's section; if it does exist, add to it. Either way, add an "SBST expansion" section: read `sbst.enabled`/`sbst.commands`, skip if absent, run as best-effort/non-blocking, write agent-authored seeds to `.ai/qa/sbst-seeds/<module>/`, fold any newly-passing generated tests into `Files changed`. *Test:* file reads coherently; the non-blocking nature is stated explicitly and unambiguously.
2. Add the new step to `skills/om-fix/SKILL.md` (a short pointer into the reference section above), positioned after the existing full validation-gate loop and before report-back. *Test:* `bash scripts/lint.sh` passes.
3. Document the optional `sbst` block in README.md's config section (next to where `validation.commands` is already documented), matching the Data Model shape above. *Test:* doc renders; matches this spec's schema.
4. Update `skills/om-fix/references/agentic-setup.md`'s "this-skill-uses" config-var list to mention `sbst.enabled` / `sbst.commands` as optionally consumed. *Test:* lint green.
5. Add an `UPGRADE_NOTES.md` entry for the new opt-in `sbst` schema, following the file's existing Symptom/Fix format (Symptom: none for existing repos, this is purely additive; Fix: how to opt in).
6. Full gate: `bash scripts/lint.sh` green across the whole collection.

Every step leaves the collection in a shippable state; this capability layers onto `om-fix` without changing behavior for any repo that doesn't opt in.
