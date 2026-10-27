# Repo-rule compliance, risk assessment, gap analysis (step 6)

The three design-quality lenses `om-pre-implement-spec` applies after the readiness gate and the BC audit. The rules come from the repository — this file supplies only the lenses and the classification.

## 1. Repo-rule compliance

The law is whatever the repo wrote down: its agent instruction files, every guide the `AGENTS.md` Task Router routes to for the areas the spec touches, `knowledge.sources` entries, the `reviewChecklist` file, `CODE_REVIEW.md`, and the `.uxproof/` design contract for UI. Check the spec's **proposed implementation** against them, lens by lens. Cite the exact rule (file + section) for every violation — a preference without a written rule is a suggestion, not a violation.

| Lens | Ask of the proposed implementation |
|------|------------------------------------|
| Placement and structure | Does new code land where the repo's layout rules put it? Does it follow the repo's file/registration conventions, and declare what new permissions or features need (default grants, setup hooks)? |
| Canonical mechanisms | Does it use the primitives the repo prescribes — its CRUD/route factories, mutation guards, form and table components, HTTP client helpers, cache service, job queue — or hand-roll substitutes? An invention needs a stated reason. |
| Input and access | Is every new input validated at the trust boundary with the repo's schema mechanism? Does every new endpoint or handler declare its auth/permission metadata the way the repo requires? Is data scoped to its owner (tenant, account, workspace) on every read and write? |
| Sensitive data | Every new field holding personal data, credentials, secrets, or free text about people — does it follow the repo's data-protection convention (field-level encryption maps, hashed lookup columns, decrypting read helpers, retention)? Hand-rolled crypto or "encrypt later" stubs are violations. |
| Side effects and coupling | Are cross-module effects routed through the repo's decoupling mechanism (declared events, interfaces) rather than direct imports? Are consumers idempotent? Is cache invalidation declared per write path? |
| Reversibility | Are writes undoable the way the repo requires (command pattern, undo payloads, soft delete)? Is the rollback path described as carefully as the execute path? |
| UI system | Semantic design tokens instead of raw palette values, the repo's type scale instead of arbitrary sizes, shared primitives, the repo's icon set, accessible labels, keyboard shortcuts the repo standardizes for dialogs, localized copy — per the design contract and UI guides. |
| Product decisions | When `${SPECS_DIR}/product-brief.md` exists: does the spec build what a Non-goal excludes or contradict an active Business rule or Decision without proposing a superseding entry named and owner-approved? That is Critical; quote the entry id. |

Each violation: rule (cited) · spec location (section/step) · fix. A violation of a rule marked mandatory in the repo's instructions is Critical when implementing it as written would ship the violation; otherwise Important.

## 2. Risk assessment

Assess, and assign **High / Medium / Low** with a mitigation for each:

- **Technical** — new cross-module coupling; performance (N+1 queries, unbounded lists, large payloads); migration complexity (backfills, locking, long-running schema changes); concurrency (races between events, workers, retries).
- **Integration** — existing tests that will break; existing UI flows and API consumers affected; search indexes, caches, or generated artifacts that need rebuilding.
- **Dependency** — changes spread across several packages or services; reliance on features not yet built; circular-dependency potential.

A High risk the spec already mitigates stays High with its mitigation noted. A High risk the spec does not mention or mitigate makes the verdict at least conditional.

## 3. Gap analysis

List what implementation would have to invent because the spec does not say it. Typical gaps: unclear data model or entity definitions; missing endpoint specs; undefined error handling and user-visible failure behavior; undo/redo behavior; event declarations for side effects; search/indexing configuration; cache invalidation strategy; background job or queue definitions; permission definitions; localization plan; test scenarios.

- **Critical** — implementation cannot start without an answer (it would force a design decision the spec owner has not made). Verdict no-go.
- **Important** — should be answered before or during the first phase; a reasonable default exists. Verdict conditional.
- **Nice-to-have** — improves the spec, does not block.

Every gap names what is needed and where in the spec it belongs.
