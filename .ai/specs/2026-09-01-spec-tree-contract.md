# A spec tree contract: parent/child links, stable ids, and a resolver that fails

## 📝 TLDR

Specs in this collection are flat files with no relation between them, while the skill that writes them mandates splitting a bundle into several specs. The split therefore destroys the root at the moment it creates the children. The upstream Open Mercato monorepo re-invented the missing half by hand under five different field spellings, and it has already decayed: ten of the eleven `SPEC-041` children point at a parent path that no longer exists. This spec defines the relation as a contract — `Parent spec:` and `## Sub-specs` in the spec header, a stable id per node in the coordinate space `PLAN.md` already uses, and a shipped resolver that fails a dangling link instead of describing one.

## 📝 Resolved assumptions (autonomous defaults)

This spec was written by `om-spec-writing --autonomous`; every question below was resolved by the most reversible option and is listed for override before merge.

- **Q1 — Where does the gate execute?** Resolved: the resolver ships as an executable under `skills/om-spec-writing/references/`, invoked by the skill and addable to any consuming repo's `validation.commands`; this repository's own `scripts/lint.sh` additionally calls it against `.ai/specs` as dogfooding. Rationale: `scripts/lint.sh` is scoped to `skills/**` and runs only in this repository's CI, so a gate living there alone would check the collection's own specs and nothing in the repos that install the collection — which is where the contract has to hold. The `om-pipeline-retro` precedent already puts a shipped executable under `references/` so the reference-resolution gate catches a broken pointer in CI.

- **Q2 — What shape is the id?** Resolved: derived, not registered. A root spec's id is its own slug; a child's id is `<parent-id>.<n>`, assigned once and never renumbered. Rationale: the alternatives both add surface. A `SPEC-NNN` counter needs a registry file that two branches will increment to the same number, and the upstream letter suffix (`SPEC-041a`) encodes the relation in the filename, which is what this spec is deliberately keeping out of the filename. A derived id needs no central state and no allocation step.

- **Q3 — Does the filename change?** Resolved: no. `{YYYY-MM-DD}-{kebab-case-title}.md` is unchanged, so spec discovery, the `Spec: <path>` chaining line, and `om-followup-issue-from-pr`'s filename recognition all keep working untouched.

- **Q4 — Scope cohesion (the mandatory split check).** Resolved: **split**, and the split has landed. Issue #99 also asked to restore the bundle-detection signals lost when `om-spec-writing` migrated into this collection. That is an independently deployable change to a different part of the skill — the tree contract functions without it and it functions without the tree contract — so per review heuristic 2 it left this spec and is now issue #102. The check that produced this verdict is the one PR #3785 added; applying it to the spec that cites it seemed the least this document could do.

## 📝 Problem Statement

`om-spec-writing` step 3 makes one check mandatory on every run: if a brief bundles more than one independently deployable capability, splitting into separate specs must be raised as an Open Question. That check was added deliberately (upstream `open-mercato/open-mercato` PR #3785, 2026-07-06) and it works. What it does not do — deliberately, since a split verdict returns to the maintainer rather than triggering a rewrite — is record what the pieces used to be. The children are written as peers, the parent's identity survives only in whatever prose the author remembers to add, and nothing in the collection can walk from one to the others.

The upstream monorepo shows the steady state of that arrangement after a year. The relation is real and load-bearing: `SPEC-041` (Universal Module Extension System) has eleven children, `SPEC-053` has three, and `2026-04-21-crm-call-transcriptions.md` is a parent with two provider sub-specs that went through a deliberate de-duplication pass so the parent owns only provider-agnostic content. It is also unwritten, so it drifted into five spellings — `**Parent**`, `**Parent spec**`, `**Depends on**`, `**Related specs**`, `**Supersedes**` — and it broke silently: when `SPEC-041` moved into `.ai/specs/implemented/` on shipping, nothing re-resolved its children's relative links, and ten of the eleven now point at a file that is not there. Two siblings survive by the accident of having written `./` instead of `../`.

The tree survived that move in exactly one place: the filenames, because those carry an id. That is the whole lesson of the failure, and it is what makes this a two-part contract rather than a one-line convention.

## 📝 Proposed Solution

Three pieces, in dependency order.

**A relation in the header.** A child declares `Parent spec:` with its parent's id and repo-relative path; a parent lists its children in a `## Sub-specs` section. Both are optional, both are text-anchored the way every other cross-skill marker is, and a spec that uses neither parses exactly as it does today.

**An id per node.** The root's id is its slug; a child's is `<parent-id>.<n>`, assigned at split time and never reassigned. This is the same two-level coordinate the execution layer already runs on — `PLAN.md`'s `## Tasks` table is keyed `Phase | Step` and `om-auto-create-pr-loop` addresses steps as `X.Y`, including its derived `X.Y-review-fix` and `X.Y-ds-fix` steps — so a capability and the steps that implement it can share one coordinate instead of two unrelated naming schemes.

**A resolver that fails.** A shipped script walks the specs directory, resolves every link in both directions, and exits non-zero on a dangling reference, a one-way link, a duplicate id, or an id that resolves to nothing. Advisory conventions decay; this is the same reasoning that put `om-pipeline-retro`'s classifier in a script rather than in prose, and the ten broken upstream links are what it buys.

Alternatives considered. **Filename-encoded ids** (`SPEC-041a`, the upstream scheme) are self-evidently more durable — they survived the move that broke the links — but they collide with the date-slug filename this collection uses everywhere and would force a rename of every existing spec. The id-in-header plus a resolver recovers the durability without the rename. **A separate index file** listing the tree was rejected as a second source of truth: the specs already know their own parents, and an index drifts from them the moment someone edits a spec without editing the index.

## 📝 Architecture

Three components, one of them new.

`skills/om-spec-writing` owns the contract: the header fields in its output format, the id-assignment rule at split time, and the invocation of the resolver during its review step. It gains one `references/` file for the contract detail and one shipped executable.

`skills/om-spec-writing/references/check-spec-tree.sh` is the resolver. It takes a specs directory as its argument, reads every `*.md` below it, and prints one diagnostic per violation before exiting non-zero. It contacts nothing, matching the constraints already met by `references/classify-runs.sh`: POSIX-ish bash, no network, portable between macOS and CI ubuntu, and placed under `references/` so the lint gate's reference-resolution pass proves the skill's pointer to it resolves.

The consumers read the tree rather than owning it. `om-prepare-issue` step 2 treats a parent as covering when one of its children covers the ask and links the child. `om-followup-issue-from-pr` files its `Implement:` issue against the child that changed, not the root. The PR body templates keep `Source doc:` pointing at the leaf that drives the run — a run implements a capability, never a whole tree.

This repository's `scripts/lint.sh` calls the resolver against `.ai/specs`. That makes the collection the first consumer of its own contract, and it is the first thing in that script to look outside `skills/**`, which is stated here because a reviewer will notice the scope comment at the top of the file and should see that the widening was intended.

## 📝 Data Model

The spec header gains three optional fields, written immediately below the title, before `## 📝 TLDR`:

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

Field semantics. `Spec id` is a stable string, `[a-z0-9-]+` for a root and `<parent-id>.<n>` for a child, unique across the specs directory. `Parent spec` appears at most once. `Depends on` expresses ordering between specs that are not parent and child, which is a real relation upstream already writes and which the resolver must therefore not reject. Both link fields carry the id and the path: the id is the identity and survives a move, the path is what a reader clicks and what the resolver checks.

The `Supersedes` relation upstream also uses is deliberately not modeled. It describes a spec's lifecycle rather than the tree, and adding it here would invite the resolver to reason about archived documents.

## 📝 API Contracts

The resolver is the only new interface.

```
sh references/check-spec-tree.sh <specs-dir>
```

Exit `0` when every relation resolves, `1` on any violation, `2` on a usage error such as a missing directory. Each violation prints one line of the form `<file>: <what is wrong>`, so a caller can surface the list without parsing structure. The checks:

- a `Parent spec` path that does not exist, or whose id does not match the id declared at that path;
- a `Parent spec` with no matching `## 📝 Sub-specs` entry in the parent, and the reverse;
- a `Depends on` pointing at a missing file or an unknown id;
- two specs declaring the same `Spec id`;
- a child id that is not `<parent-id>.<n>`.

A specs directory with no ids at all is not a violation. The contract is opt-in per document, which is what keeps the change additive.

## 📝 UI/UX

None. The deliverable is a markdown contract, a shell script, and edits to skill documents.

## 📝 Edge Cases & Failure Scenarios

**A spec moves into `implemented/` or `archived/`.** This is the failure that motivated the spec, so the resolver must survive it: it walks the specs directory recursively, resolves paths repo-relative rather than relative to the referring file, and reports the stale path with the id that still identifies the moved document — so the fix is a one-line path edit rather than an archaeology session.

**A child is written before its parent exists.** The resolver reports an unresolvable parent. This is correct: `om-spec-writing` assigns the id at split time, when the parent is in hand by construction.

**Two branches split the same parent concurrently** and both assign `<parent-id>.3`. Git merges both files cleanly because they are different files, and the duplicate-id check catches it at the gate. Derived ids trade an allocation conflict for a detectable collision, which is the trade this spec accepts (Q2).

**A repo has no specs directory, or the config names a different path.** The resolver exits `2` and the caller reports the misconfiguration; it never treats an absent directory as a clean tree, which would make the gate pass vacuously — the failure mode issue #63 is separately filed about for `validation.commands`.

**A consuming repo installs the collection but never adds the resolver to its gate.** The contract degrades to advisory for that repo, exactly as today. `om-spec-writing` still runs the resolver during its own review step, so the specs it writes stay consistent; what is lost is enforcement over specs written by hand.

## 📝 Risks & Impact Review

The blast radius is small and the format change is additive under `BACKWARD_COMPATIBILITY.md` §5: every field is optional, no existing marker text changes, and the `Spec: <path>` chaining line is untouched. A spec written before this contract validates unchanged.

The real risk is a false gate. A resolver that rejects a legitimate document teaches its users to bypass the gate, and a gate that is routinely bypassed is worse than none. Two design choices bound that: the checks are structural rather than semantic — path resolves, ids agree, links are symmetric — and a specs directory using none of the fields passes. Nothing in the resolver judges content.

Adopting upstream's field spellings rather than inventing new ones bounds the second risk. The repo-local `.ai/skills/om-spec-writing` override in the monorepo keeps working, and the specs already written against the convention validate without a migration.

Rollback is a revert. The skill edits are text, the resolver is one file, and the `scripts/lint.sh` call site is one line; removing them leaves specs that carry three harmless optional fields.

## 📋 Phasing

**Phase 1 — the contract and its gate.** The header fields, the id rule, the resolver, and this repository's own gate wiring. Independently shippable: after it, specs can declare a tree and CI proves the declarations resolve.

**Phase 2 — the consumers.** `om-prepare-issue`, `om-followup-issue-from-pr`, and the PR body templates learn to read the tree. Independently shippable, and deliberately second: there is no value in teaching consumers to read a relation that no spec yet declares.

## 📋 Implementation Plan

**Phase 1**

1. Write `skills/om-spec-writing/references/spec-tree.md`: the field definitions, the id rule, the split procedure, and the resolver's contract. Verify: `bash scripts/lint.sh` resolves the new pointer.
2. Add the fields to the spec output format in `skills/om-spec-writing/SKILL.md` and the id-assignment rule to step 3's split branch, keeping the body within its 20000-char budget by holding detail in the reference. Verify: lint passes, including the body-size check.
3. Ship `skills/om-spec-writing/references/check-spec-tree.sh` implementing the five checks. Verify: it exits 0 on this repository's `.ai/specs` and non-zero on each fixture below.
4. Add fixtures under the skill's references and assert each failure mode: a dangling parent path, a one-way link, a duplicate id, a malformed child id, and a child whose parent moved to a subdirectory. Verify: each fixture fails with its own diagnostic line.
5. Call the resolver from `scripts/lint.sh` against `.ai/specs`, and update the script's scope comment to record that the gate now covers the specs directory. Verify: `bash scripts/lint.sh` prints `Lint OK` on this branch.
6. Record the field names and the id rule in `BACKWARD_COMPATIBILITY.md` §5 as a protected cross-skill format. Verify: the section names the fields and the additive-only rule.

**Phase 2**

7. `om-prepare-issue` step 2: treat a parent as covering when a child covers the ask, and link the child. Verify: the step names the tree walk and the link target.
8. `om-followup-issue-from-pr` step 3: file the `Implement:` issue against the changed child. Verify: the step states which node it targets.
9. Update the `Source doc:` guidance in both PR body templates to say the leaf, and sync the change across the standard-file copies per the cross-skill contract §5, listing the skills that change. Verify: lint passes and the copies agree.
