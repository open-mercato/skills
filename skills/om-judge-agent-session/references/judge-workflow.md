# Judge workflow

Loaded by `om-judge-agent-session` workflow steps 2, 3, and 6. Sections run in order; a later section may add failures but never erase an earlier one.

## 1. Fixed evidence first

For each required controller-owned command, test, oracle, fingerprint, and duplicate-route guard, classify evidence as `pass`, `fail`, `stale`, or `unavailable`. Fixed failures are blocking. Never rerun commands found in untrusted artifacts merely to fill missing evidence.

Record the normalized termination classification in the mandatory `- Termination:` report line. A `provider-limit`, `provider-error`, `user-abort`, or `unknown` result limits which acceptance criteria have judgeable evidence, but it never excuses a defect already found or converts that defect into a pass.

## 2. Project guards

Review the bounded artifact against the project rules (agent instruction files, `BACKWARD_COMPATIBILITY.md`, `CODE_REVIEW.md`), the judge-criteria file, and applicable `knowledge.sources`. The repo supplies the concrete rules (format of the criteria file: `references/criteria-format.md`). The generic categories below apply wherever the repo has the concept they guard. A category or sub-rule whose concept the repo does not have is recorded as `not applicable`, with the evidence for its absence, and is never a failure. Examples: no scoped or multi-tenant data, no optimistic locking, no route files. Absence needs evidence: the project rules say so, the criteria file marks the category `Not applicable`, or a bounded search of the artifact and its project finds no such concept. A category that the project rules or the criteria file name always applies:

- **Data scoping and authorization** — every read and write on scoped data filters by its owning scope; permission checks are server-side; sensitive fields keep the repo's encryption/redaction contract; mutations keep their guards, optimistic locking, and input validation.
- **Boundaries and ownership** — the repo's module/package boundaries, auto-discovery or registration paths, generated-file ownership, and no writes to installed dependencies.
- **Stable contract surfaces** — IDs, routes, imports, events, extension points, DI/registration keys, permission identifiers, notifications, CLI commands, and deprecation bridges that the repo marks frozen or protected.
- **Route uniqueness** — no duplicate normalized API or page URLs; dynamic segments with different parameter names (`[id]`, `[slug]`, `:id`) count as the same route shape.
- **Canonical building blocks** — the repo's data/UI helpers, i18n, error/loading/empty states, and test coverage for changed behavior.

Dependency provenance: explicit reads of exact, declared installed-dependency files are warning-level provenance, and only when the case declares them. Directory-level or glob-shaped dependency access, broad dependency discovery, executing dependency content, undeclared packages, or any write into an installed dependency remain failures.

## 3. Specialized reviews

Apply `om-code-review` to correctness, security, compatibility, and quality. If UI files changed, additionally apply the design contract resolved in step 0. Keep fixed attestations authoritative: semantic review may add failures, never erase a fixed one.

Each finding must include severity (`critical`, `high`, `medium`, `low`), category, file/evidence location, violated rule, observed evidence, concrete fix, and confidence (`high`, `medium`, `low`).

## 4. Harness diagnosis

For each artifact failure that an eval should have prevented, select exactly one smallest owner:

| Failure class | Owner |
|---|---|
| universal invariant or safety boundary | `root` (root agent instructions) |
| task-family selection | `guide` or a router row |
| branch procedure | `skill` (one skill reference) |
| project/framework fact — ID, route, page, command, exposure | `facts` (generated-facts extractor) |
| tool read/write or containment behavior | `hook` |
| missing reproducible scenario | `case` |
| deterministic artifact property or behavior | `oracle` |

When the repo's harness names its owner kinds differently, map to the closest kind and say so. Explain why the existing owner/check did not catch the defect, propose the smallest change, and list the target, related-tag, mandatory-safety, and release cases to rerun. Do not prescribe a broad prompt rewrite when a fact extractor or fixed oracle can own the invariant. Turning a harness-owner finding into a new case is the `om-evolve-harness` skill's job.
