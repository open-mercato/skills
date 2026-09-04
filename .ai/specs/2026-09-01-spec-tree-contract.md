# A spec tree contract: parent/child links, stable ids, and a resolver that fails

## 📝 TLDR

Specs in this collection are flat files with no relation between them, while the skill that writes them mandates splitting a bundle into several specs. The split therefore destroys the root at the moment it creates the children. The upstream Open Mercato monorepo re-invented the missing half by hand under five different field spellings, and it has already decayed: ten of the eleven `SPEC-041` children point at a parent path that no longer exists. This spec defines the relation as a contract — `Parent spec:` and `## 📝 Sub-specs` in the spec header, a stable id per node in the coordinate space `PLAN.md` already uses, and a shipped resolver that fails a dangling link instead of describing one.

## 📝 Resolved assumptions (autonomous defaults)

This spec was written by `om-spec-writing --autonomous`; every question below was resolved by the most reversible option and is listed for override before merge.

- **Q1 — Where does the gate execute?** Resolved: the resolver ships as an executable under `skills/om-spec-writing/references/` and `om-spec-writing` invokes it from its own resolved installation directory during every spec review. This repository's `scripts/lint.sh` additionally invokes that source-tree copy against `.ai/specs` as dogfooding. Rationale: a consuming repository's committed `validation.commands` must run in a clean CI checkout, while an installed skill may live under an agent-specific global directory that CI does not have. This spec therefore makes no generic CI-portability claim: a separate design is required before consumer repositories can provision a repo-owned copy or launcher safely. The `om-pipeline-retro` precedent still supports keeping deterministic logic in a shipped executable instead of prose.

- **Q2 — What shape is the id?** Resolved: derived, not registered. A root spec's id is its own slug; a child's id is `<parent-id>.<n>`, assigned once and never renumbered. Rationale: the alternatives both add surface. A `SPEC-NNN` counter needs a registry file that two branches will increment to the same number, and the upstream letter suffix (`SPEC-041a`) encodes the relation in the filename, which is what this spec is deliberately keeping out of the filename. A derived id needs no central state and no allocation step.

- **Q3 — Does the filename change?** Resolved: no. `{YYYY-MM-DD}-{kebab-case-title}.md` is unchanged, so spec discovery, the `Spec: <path>` chaining line, and `om-followup-issue-from-pr`'s filename recognition all keep working untouched.

- **Q4 — Scope cohesion (the mandatory split check).** Resolved: **split**, and the split has landed. Issue #99 also asked to restore the bundle-detection signals lost when `om-spec-writing` migrated into this collection. That independently deployable change left this spec and is now issue #102. A fresh-context review then found that the tree-aware issue lookup and leaf-targeting consumers were also independently deployable integrations. They are now out of scope here and require their own follow-up specs; this document owns only the format, authoring behavior, resolver, and collection-local gate. The check that produced the original verdict is the one PR #3785 added; applying it to the spec that cites it seemed the least this document could do.

## 📝 Problem Statement

`om-spec-writing` step 3 makes one check mandatory on every run: if a brief bundles more than one independently deployable capability, splitting into separate specs must be raised as an Open Question. That check was added deliberately (upstream `open-mercato/open-mercato` PR #3785, 2026-07-06) and it works. What it does not do — deliberately, since a split verdict returns to the maintainer rather than triggering a rewrite — is record what the pieces used to be. The children are written as peers, the parent's identity survives only in whatever prose the author remembers to add, and nothing in the collection can walk from one to the others.

The upstream monorepo shows the steady state of that arrangement after a year. The relation is real and load-bearing: `SPEC-041` (Universal Module Extension System) has eleven children, `SPEC-053` has three, and `2026-04-21-crm-call-transcriptions.md` is a parent with two provider sub-specs that went through a deliberate de-duplication pass so the parent owns only provider-agnostic content. It is also unwritten, so it drifted into five spellings — `**Parent**`, `**Parent spec**`, `**Depends on**`, `**Related specs**`, `**Supersedes**` — and it broke silently: when `SPEC-041` moved into `.ai/specs/implemented/` on shipping, nothing re-resolved its children's relative links, and ten of the eleven now point at a file that is not there. Two siblings survive by the accident of having written `./` instead of `../`.

The tree survived that move in exactly one place: the filenames, because those carry an id. That is the whole lesson of the failure, and it is what makes this a two-part contract rather than a one-line convention.

## 📝 Proposed Solution

Three pieces, in dependency order.

**A relation in the header.** A child declares `Parent spec:` with its parent's id and repo-relative path; a parent lists its children in a `## 📝 Sub-specs` section. Legacy specs may use neither and continue to parse exactly as they do today. Once a spec opts into the contract, its applicable fields follow the required combinations below.

**An id per node.** The root's id is its slug; a child's is `<parent-id>.<n>`, assigned at split time and never reassigned. This is the same two-level coordinate the execution layer already runs on — `PLAN.md`'s `## Tasks` table is keyed `Phase | Step` and `om-auto-create-pr-loop` addresses steps as `X.Y`, including its derived `X.Y-review-fix` and `X.Y-ds-fix` steps — so a capability and the steps that implement it can share one coordinate instead of two unrelated naming schemes.

**A resolver that fails.** A shipped script walks the specs directory, resolves every link in both directions, and exits non-zero on a dangling reference, a one-way link, a duplicate id, or an id that resolves to nothing. Advisory conventions decay; this is the same reasoning that put `om-pipeline-retro`'s classifier in a script rather than in prose, and the ten broken upstream links are what it buys.

Alternatives considered. **Filename-encoded ids** (`SPEC-041a`, the upstream scheme) are self-evidently more durable — they survived the move that broke the links — but they collide with the date-slug filename this collection uses everywhere and would force a rename of every existing spec. The id-in-header plus a resolver recovers the durability without the rename. **A separate index file** listing the tree was rejected as a second source of truth: the specs already know their own parents, and an index drifts from them the moment someone edits a spec without editing the index.

## 📝 Architecture

Two components, one of them new.

`skills/om-spec-writing` owns the contract: the header fields in its output format, the id-assignment rule at split time, and the invocation of the resolver during its review step. It gains one `references/` file for the contract detail and one shipped executable.

`skills/om-spec-writing/references/check-spec-tree.sh` is the resolver. It takes a specs directory as its argument, reads every `*.md` below it, and prints one diagnostic per violation before exiting non-zero. It contacts nothing, matching the constraints already met by `references/classify-runs.sh`: POSIX-ish bash, no network, portable between macOS and CI ubuntu, and placed under `references/` so the lint gate's reference-resolution pass proves the skill's pointer to it resolves. `om-spec-writing` resolves the executable relative to its own installed directory; it never assumes a fixed `~/.claude`, `~/.codex`, or repository-local skill path.

This repository's `scripts/lint.sh` calls the resolver against `.ai/specs`. That makes the collection the first consumer of its own contract, and it is the first thing in that script to look outside `skills/**`, which is stated here because a reviewer will notice the scope comment at the top of the file and should see that the widening was intended.

## 📝 Data Model

The spec header gains three contract fields, written immediately below the title, before `## 📝 TLDR`:

```markdown
# {Title}

Spec id: {id}
Parent spec: {parent-id} — {repo-relative path}
Depends on: {id} — {repo-relative path}   <!-- repeatable; a spec that must ship first -->
```

A parent additionally carries:

```markdown
## 📝 Sub-specs

- `{child-id}` — `{repo-relative path}` — {one-line scope}
```

Activation and field semantics. Header fields are recognized only as unformatted, line-start fields in the contiguous metadata block between the document's first level-one title and its first level-two heading. `## 📝 Sub-specs` is recognized only as an actual line-start heading. The parser ignores fenced code blocks, inline code, quoted examples, and prose that merely names an anchor.

A document opts into this contract only when its header block contains `Spec id:`. It MUST then declare exactly one valid `Spec id:`. A document without `Spec id:` remains a legacy document and is ignored even if it uses a pre-contract `Parent spec:`, `Depends on:`, or `## 📝 Sub-specs` spelling. This single activation marker preserves existing bare-line and table-based conventions without making a partial migration ambiguous; their presence beside opted-in specs is valid.

`Spec id` is unique across the specs directory. A root id is `[a-z0-9-]+`; at creation it defaults to the filename slug after removing the leading `{YYYY-MM-DD}-`, then is stored in the header and never recomputed after a file rename or move. A child id is `<parent-id>.<n>` and requires exactly one `Parent spec`; a root must not declare `Parent spec`. `Parent spec` and `Depends on` targets MUST be opted-in documents whose declared ids and repo-relative paths match the reference. A `## 📝 Sub-specs` entry likewise targets an opted-in child, and the child must carry the reciprocal `Parent spec`. An unrecognized legacy table row such as `| **Parent spec** | path |` does not activate the contract, but an opted-in document cannot point at that legacy document until it gains a `Spec id`.

`Depends on` expresses ordering between specs that are not parent and child. Dependency edges must be acyclic, including no self-dependency, because every target is required to ship first. Both link fields carry the id and the path: the id is the stable identity, while the repo-relative path is what a reader follows and what the resolver checks.

The `Supersedes` relation upstream also uses is deliberately not modeled. It describes a spec's lifecycle rather than the tree, and adding it here would invite the resolver to reason about archived documents.

## 📝 API Contracts

The resolver is the only new interface.

```text
sh {resolved-om-spec-writing-dir}/references/check-spec-tree.sh <specs-dir>
```

The executing skill resolves `{resolved-om-spec-writing-dir}` from its own installation and runs the command from the repository root; this collection's lint uses the source path `skills/om-spec-writing/references/check-spec-tree.sh`. Exit `0` when every relation resolves, `1` on any violation, and `2` on a usage error such as a missing directory. Each violation prints one line of the form `<file>: <what is wrong>`, so a caller can surface the list without parsing structure. The checks:

- a `Parent spec` path that does not exist, or whose id does not match the id declared at that path;
- a `Parent spec` with no matching `## 📝 Sub-specs` entry in the parent, and the reverse;
- a `Depends on` pointing at a missing file or an unknown id;
- a direct or transitive `Depends on` cycle;
- two specs declaring the same `Spec id`;
- a child id that is not `<parent-id>.<n>`;
- an opted-in document with more than one `Spec id` or an invalid field combination.

A specs directory with no `Spec id:` activation markers is not a violation. Unrelated legacy documents may coexist with opted-in documents, but a contract relation may target only another opted-in document. This per-document activation rule makes migration explicit and keeps the change additive.

## 📝 UI/UX

None. The deliverable is a markdown contract, a shell script, and edits to skill documents.

## 📝 Edge Cases & Failure Scenarios

**A spec moves into `implemented/` or `archived/`.** This is the failure that motivated the spec, so the resolver must survive it: it walks the specs directory recursively, resolves paths repo-relative rather than relative to the referring file, and reports the stale path with the id that still identifies the moved document — so the fix is a one-line path edit rather than an archaeology session.

**A child is written before its parent exists.** The resolver reports an unresolvable parent. This is correct: `om-spec-writing` assigns the id at split time, when the parent is in hand by construction.

**Two branches split the same parent concurrently** and both assign `<parent-id>.3`. Git merges both files cleanly because they are different files, and the duplicate-id check catches it at the gate. Derived ids trade an allocation conflict for a detectable collision, which is the trade this spec accepts (Q2).

**A repo has no specs directory, or the config names a different path.** The resolver exits `2` and the caller reports the misconfiguration; it never treats an absent directory as a clean tree, which would make the gate pass vacuously — the failure mode issue #63 is separately filed about for `validation.commands`.

**A consuming repo runs CI without installed agent skills.** No generic CI gate is promised by this spec. `om-spec-writing` runs the resolver from its own installed directory during authoring and review, while this collection's source repository runs its copy from `scripts/lint.sh`. A repo-owned distribution mechanism for other consumers is a separate capability; until that exists, specs written by hand outside `om-spec-writing` do not receive automatic CI enforcement.

**Legacy and contract documents coexist.** A legacy document without `Spec id:` is ignored even when it contains an older relationship spelling. Adding one valid `Spec id` opts the whole document in, after which every relation from it must resolve to another opted-in document. This makes migration deliberate while preserving old specs byte-for-byte.

## 📝 Risks & Impact Review

The blast radius is small and the format change is additive under `BACKWARD_COMPATIBILITY.md` §5: legacy documents without `Spec id:` are ignored, no existing marker text changes, and the `Spec: <path>` chaining line is untouched. A spec written before this contract remains valid unchanged; it gains enforcement only after it opts in with a `Spec id`.

The real risk is a false gate. A resolver that rejects a legitimate document teaches its users to bypass the gate, and a gate that is routinely bypassed is worse than none. Two design choices bound that: the checks are structural rather than semantic — path resolves, ids agree, links are symmetric — and a specs directory with no `Spec id:` activation marker passes. Nothing in the resolver judges content.

Adopting upstream's field spellings rather than inventing new ones bounds the second risk. Existing table-based spellings are deliberately not parsed as the new exact anchors, so the repo-local `.ai/skills/om-spec-writing` override and its existing documents keep working without migration. Migrating one of those documents is explicit: add `Spec id` and convert all of its participating relations together.

Rollback is a revert. The skill edits are text, the resolver is one file, and the `scripts/lint.sh` call site is one line; removing them leaves any authored metadata as harmless prose.

## 📋 Phasing

**Phase 1 — the contract and its gate.** The header fields, activation rule, id rule, authoring behavior, resolver, and this repository's own gate wiring. This is the complete delivery owned by this spec: afterward, `om-spec-writing` can author and verify trees, and the collection's CI proves its own declarations resolve.

## 📋 Implementation Plan

1. Write `skills/om-spec-writing/references/spec-tree.md`: the field definitions, the id rule, the split procedure, and the resolver's contract. Verify: `bash scripts/lint.sh` resolves the new pointer.
2. Add the fields to the spec output format in `skills/om-spec-writing/SKILL.md` and the id-assignment rule to step 3's split branch, keeping the body within its 20000-char budget by holding detail in the reference. Verify: lint passes, including the body-size check.
3. Ship `skills/om-spec-writing/references/check-spec-tree.sh` implementing the contract checks. Verify: it exits `0` on this repository's `.ai/specs` and non-zero on each failing fixture below.
4. Add fixtures under the skill's references and assert each failure mode: a dangling parent path, a one-way link, a duplicate id, a malformed child id, a direct dependency cycle, a transitive dependency cycle, a contract document pointing at a legacy document, and a child whose parent moved to a subdirectory. Add passing fixtures for an all-legacy directory (including legacy relation spellings) and unrelated legacy/contract documents coexisting. Verify: each failing fixture emits its own diagnostic line and both compatibility fixtures exit `0`.
5. Call the resolver from `scripts/lint.sh` against `.ai/specs`, and update the script's scope comment to record that the gate now covers the specs directory. Verify: `bash scripts/lint.sh` prints `Lint OK` on this branch.
6. Record the field names and the id rule in `BACKWARD_COMPATIBILITY.md` §5 as a protected cross-skill format. Verify: the section names the fields and the additive-only rule.

## 📝 Out of Scope

The following consumers are independently deployable and require separate follow-up specs after the core contract exists:

- tree-aware covering-spec discovery in `om-prepare-issue`;
- leaf-targeted `Implement:` issue creation in `om-followup-issue-from-pr`;
- leaf-specific `Source doc:` guidance across PR body templates, including the standard-file sync audit required by Cross-skill contract §5;
- a repo-owned resolver provisioning or launcher mechanism that makes the gate portable to arbitrary consuming-repository CI checkouts.

## 📋 Acceptance Criteria

- An all-legacy specs directory exits `0`, including documents with pre-contract relationship spellings, and unrelated legacy documents can coexist with an opted-in tree.
- Adding exactly one valid `Spec id` in the header opts a document in; the same text in prose or a fenced example does not. Duplicate or malformed activation fields exit `1` with a file-specific diagnostic.
- Every parent/child relation resolves by both id and repo-relative path in both directions; dangling, one-way, duplicate, and malformed relations exit `1`.
- Every dependency resolves by id and path, and direct or transitive dependency cycles exit `1`.
- Moving a parent within the specs directory produces a diagnostic that identifies the stable id and stale path; updating only the stored path restores a clean result without changing the id.
- `om-spec-writing` resolves and runs the shipped executable from its own installed directory without assuming an agent-specific global path.
- This collection's `bash scripts/lint.sh` invokes the source-tree resolver against `.ai/specs` and still prints `Lint OK` on a clean tree.
