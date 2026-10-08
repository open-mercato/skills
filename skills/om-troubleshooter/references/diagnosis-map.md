# Diagnosis map

Load the matching row only. The row names where to look first; the
repository's `AGENTS.md` Task Router names which guide covers that area in this
codebase, and `knowledge.sources` supplies the framework's own failure knowledge
at the installed version.

| Failure class | First trace |
|---|---|
| Scope / auth / 401 or redirect loop | Where the tenant, organization, or user scope is derived; "all scopes" or wildcard modes; permission metadata on alternate routes. |
| Lost or partial write | Validator → command/handler → transaction boundary or atomic flush → optimistic lock → post-commit side effects. |
| Field round trip (value lost, wrong, or not clearable) | Form field id and initial value → request payload validator → mapping into the domain → storage nullability → response transform. |
| Generated code / registry / import failure | Discovery conventions (file names, exports), the registry or module list, generator warnings, the dependency's package exports and installed build output. |
| Behaves differently per runtime (browser, server, CLI, worker, queue) | Each runtime's bootstrap: registry and dependency-injection init, generated imports, module-global identity across bundles. |
| Stale cache or search result | Cache keys and tags, invalidation on every write path (including undo and sub-resources), reindex or convergence path. |
| Hydration / navigation UI mismatch | First-render inputs (locale, timezone, environment), page metadata, stable ids, auth versus visibility checks. |
| Integration / provider sync | Idempotency keys, signature checks, retry classification, cursor commit order, mapping, webhook-versus-poll races, reconciliation. |

Trace from the public call site to the first broken invariant. Avoid broad
refactors until the oracle proves the location.

## Extra guides before editing

- **Persisted-data defect** (create / update / clear / reload loses or corrupts
  data): also load the repository's data-model or persistence guide and its API
  contract guide (Task Router), and the framework's data guidance through
  `knowledge.sources` when the persistence layer is a dependency.
- **Multi-seam fix with concurrency** (an API plus a command or job touching the
  same record): also load the repository's integrity, locking, or concurrency
  guidance and its verification checklist before the first edit. No such guide →
  say so and apply the Locking oracle in `references/regression-oracles.md`.
- **Public or seeded surface** (exported contract, seeded data, event, public
  id): read the repository's compatibility contract (`BACKWARD_COMPATIBILITY.md`
  or equivalent) and preserve it.

## Known-good comparison points

When a row's invariant is unclear, diff the broken call site against a
known-good one of the same kind, in this order:

1. A reference or example implementation the repository points to — a Task
   Router row, a repo-owned `knowledge.sources` entry (surface map, blueprint),
   or an example module the `AGENTS.md` names.
2. The nearest working sibling in the same codebase (another route, command, or
   form that handles the same invariant correctly).
3. The dependency's own implementation at the installed version, resolved
   through the `om-framework-context` skill — the only option for rows the
   repository has no example of (typically cache/search and provider sync).

Name the comparison point in the report; "matches the local pattern" is evidence
only when you cite which pattern.
