# Knowledge-change contract

Loaded by `om-evolve-harness` workflow step 1, before any harness edit. The class is machine-derived from the diff, never from intent.

## Classification

`knowledge-contract` — the change touches emitted/root agent instructions, authoritative skill/reference files, a source-link inventory or parity ledger, discovery/generator contracts, evaluator or oracle code, routing/context data in the case catalog, a canonical example inventory, generated-fact provenance/rendering, or any exact source mapped by an affected case. Its changed contracts are drawn from:

| Contract | Covers |
|---|---|
| `routing` | router rows, skill descriptions, case routing expectations |
| `skill-link` | links from knowledge owners to skills |
| `source-link` | visible exact-file links from knowledge owners to authoritative source |
| `example-source` | the repo's canonical teaching/example code that owners link to, and any byte-identical mirror of it |
| `installed-source` | a linked dependency package, package-relative target, version, published file set, or preset applicability |
| `discovery` | generators/extractors that emit facts or inventories |
| `context-read` | read policy — what the agent may or must load |
| `evaluator` | harness evaluator/validator code |
| `oracle` | deterministic artifact checks |

`asset-sync` — every changed path is a generated/materialized copy or a count/docs snapshot, every authoritative source hash is unchanged from the base, and regenerated hashes match exactly. It still runs synchronization validation (`harness.commands.syncCheck`) but needs no new behavior test.

Unknown paths fail closed to `knowledge-contract`. A declared class that differs from the derived class fails. Test/QA-only paths under an example tree are QA evidence, never readable source a case may reference.

## The nine mandatory steps

Every `knowledge-contract` change must complete all nine, in order:

1. Name the changed knowledge contract and the affected case IDs/ranges.
2. Inventory every emitted knowledge owner affected by the topic and classify it `source-required`, `self-authoritative`, `generated-fact`, or `retained-normative-snippet`; when replacing prior examples, update the finite parity ledger.
3. Render visible exact-file links in each `source-required` owner and update the source-link inventory. An evaluator allowance, directory hint, wildcard, or manifest-only entry is not delivery.
4. Add a focused evaluator/oracle/read-policy test that fails for the old behavior; retain sanitized fail-before evidence.
5. Update the authoritative case/context policy and the evaluator implementation together.
6. Synchronize every mode-dependent surface: catalog, validators, writable oracles, release matrix, focused tests, catalog counts, harness documentation, source-link/example inventories, generated facts, and emitted/generated copies.
7. Generate fresh applicable presets from a coherent build, install packed artifacts, resolve every local/installed link, and run every integration test declared by each added or materially changed example surface.
8. Prove the focused test passes and run the affected certified lane; reject completion when any authoritative/generated/packed hash, link, owner, baseline disposition, or count is stale.
9. Generate and pass the machine validation manifest; attach its sanitized result to the affected-lane evidence.

When the change adds a missing surface to the canonical example, add it to the one canonical example tree (never a second teaching example), materialize any mirror with the repo's sync command, update the surface/source-link inventories and exact case links, add a self-contained integration test, and run the sync check. Never satisfy the case through an installed-source fallback.

## Step 9 — the machine manifest

When `harness.commands.validateKnowledgeChange` is configured, author the run manifest against the harness's knowledge-change schema and run it with `{manifest}` and `{base}`. Authored input omits controller-owned output (resolved base SHA, head SHA, focused executions) — author-supplied evidence for those fails validation. The validator resolves the base, requires the authored base ref to resolve to the same SHA, derives class and contracts from the diff, and rejects stale hashes, a missing focused test, unknown case IDs/ranges, wrong counts, an absent release lane, unresolvable documentation paths, and — for `example-source` — a moved/deleted linked file, a missing mirror, or mirror drift.

A contract whose required inventory is absent in this environment (for example a maintainer-only asset not published to scaffolded apps) derives its class normally and then fails closed with an explicit "not present" reason. Do not work around that by re-declaring the class. Never hand-write numbers the validator re-derives from assets; read them off the assets.

## Controller-owned base/head execution

For a `knowledge-contract` change the regression is proven by the controller, not by the author. When the configured validator does this, attach its record. When no validator is configured, follow the same procedure by hand and attach the evidence to step 8:

1. Derive the test command from the focused test file and the owning package's own test runner — never a weaker command supplied by the author. If the runner cannot be driven this way, say so and run the focused test manually.
2. Require a real test-only diff — a focused test whose base and head contents are identical proves nothing.
3. Build one throwaway worktree at the base commit carrying **only** the focused test's head content, and a second throwaway worktree at head carrying the whole working-tree diff. Neither run touches the checkout.
4. Run the command **exactly once per side** — no retry, no shell — with runner-injected environment (coverage, concurrency, nested-runner variables) stripped; record exit code and stdout/stderr hashes per side.
5. Require base-plus-test-only to exit **non-zero** and head to exit **zero**. A test that already passes at base fails the run, as does an execution record for a test the manifest never declared.

The validator is a hand-run step unless the repository has put it in `validation.commands` or CI; do not add it there from this skill.
