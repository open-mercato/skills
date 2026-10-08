# Backward-compatibility audit (step 5)

How `om-pre-implement-spec` checks a spec against the repository's protected contract surfaces before any code exists — the cheapest moment to add a deprecation bridge.

## The authority

`BACKWARD_COMPATIBILITY.md` at the repo root lists the protected surfaces, what counts as breaking for each, and the required path (deprecation window, bridge, migration note, version bump). It is the authority: audit **every** surface it lists, in its own words and categories — no shortcuts, no sampling. When a repo-local extension or a routed guide adds surfaces, audit those too.

**No BC doc** → audit the fallback list below, and put a Warning at the top of the BC section: the repository has no `BACKWARD_COMPATIBILITY.md`, so this audit used a generic surface list (the `om-setup-agent-pipeline` skill generates the doc from the repo's real surfaces).

### Fallback surface list (only when the repo has no BC doc)

| # | Surface | Breaking when the spec… |
|---|---------|-------------------------|
| 1 | File and registration conventions (auto-discovered files, required exports, plugin/module manifests) | renames or removes a convention file or a required export |
| 2 | Public types and interfaces | removes or narrows a field, or makes an optional one required |
| 3 | Function and method signatures | changes required parameters or the return type |
| 4 | Import paths / module layout | moves a public module without a re-export bridge |
| 5 | Event / message ids and payloads | renames or removes an id, or removes/retypes a payload field |
| 6 | Extension points (slot, hook, or injection ids) | renames or removes an id consumers target |
| 7 | HTTP/RPC routes and response shapes | renames or removes an endpoint, or removes/retypes a response field |
| 8 | Database schema | renames or removes a column or table, or narrows a type, without a migration |
| 9 | Service/dependency-injection registration keys | renames a key consumers resolve |
| 10 | Permission / feature ids stored in data | renames an id that is persisted in user or role data |
| 11 | Notification / message type ids | renames a type string that is persisted or routed on |
| 12 | CLI commands and flags | renames or removes a command or flag |
| 13 | Config file formats and keys | removes or renames a key, or changes its meaning |
| 14 | Generated-file contracts | changes generated export names or shapes other code imports |

## Procedure

1. From workflow step 3's inventory, list the **real** surfaces each phase/step touches — actual ids, routes, types, and columns found in the code, not the spec's paraphrase.
2. For every phase/step × every protected surface, decide: untouched · additive (safe — new optional field, new endpoint, new id) · changed. For each change, compare it with the doc's "breaking" definition for that surface.
3. For every breaking change, check whether the spec names the doc's required path for that surface.

## Classification

- **Critical** — the spec breaks a protected surface and names no compliant path, or its path contradicts the doc (for example removes without the required deprecation window). Blocks implementation (verdict no-go).
- **Warning** — the change is compatible only with a bridge the spec does not describe yet (re-export, alias, dual-emit, redirect, backfill migration), or the spec touches a protected surface without saying so. Implementation may start once the bridge is added to the plan (verdict conditional).

Every entry names the surface (as the BC doc names it), the phase/step, the concrete change, the severity, and the proposed migration path — re-export bridge, dual-emit window, alias key, redirect, additive column plus backfill, versioned route, whatever the doc prescribes for that surface.

## Migration section

When any protected surface is touched and the spec has no migration / backward-compatibility section, report it: Critical when a Critical violation exists (the section is where its fix belongs), otherwise Warning. When the spec touches no protected surface, say so in one line — the section is then not required.
