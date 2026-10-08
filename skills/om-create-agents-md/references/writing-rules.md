# Writing rules for AGENTS.md content

How `om-create-agents-md` step 4 phrases every section. These are the built-in
defaults; a repo template's `## House rules`, `## Table columns`,
`## Checklist rules`, and `## Sizing` add to or replace the matching part
(`references/template-contract.md`). Examples below are illustrative — the
real rules always come from the target's code.

## Prescriptive tone

Every sentence either tells the agent what to do ("Use X when…"), constrains
it ("MUST NOT…"), or gives a procedure ("1. Create… 2. Add… 3. Run…").

- Never open a section with "The module provides…", "This package is…",
  "This document describes…", or "X is a Y that…".
- Open sections with imperative verbs (Use, Add, Create, Configure, Declare,
  Follow, Resolve), a conditional directive ("When you need X, do Y"), or a
  MUST / MUST NOT constraint.

| Descriptive (reject) | Prescriptive (write) |
|---|---|
| "The cache layer provides multi-strategy caching" | "Use the cache service for all caching. MUST NOT talk to the cache backend directly." |
| "Orders are core entities with line items" | "**Orders** — core entity. MUST have at least one line item" |
| "Events support local and async dispatch" | "When async dispatch is configured, persistent events go through the queue worker" |
| "Pricing uses layered overrides" | "Price layers compose in order: base → channel → customer → promotion" |
| a "Description" column | a "When to use" or "When to modify" column |

## Boundary sections

**`Always`** — numbered; pattern `**MUST [verb]** — [rationale or consequence]`.

- Good: `**MUST resolve services through the container** — never instantiate them directly`; `**MUST export the worker metadata** from every worker file`; `**MUST follow the document flow** Quote → Order → Invoice — no skipped steps`.
- Reject: `**MUST** follow best practices`, `**MUST** be careful with…`, `**MUST** use the correct approach` — vague, not actionable.

**`Ask First`** — pattern `Ask before {scope-changing action}.` Each item names
a concrete decision a maintainer should approve.

- Good: `Ask before adding a new cache backend, changing the default strategy, or caching data whose sensitivity is unclear.`; `Ask before applying database migrations to a shared environment.`
- Reject: `Ask if unsure`, `Ask before doing anything dangerous`.

**`Never`** — pattern `Never {prohibited action}.` No "MUST NOT" prefix; the
heading carries the force.

- Good: `Never skip tenant or permission scoping in a query.`; `Never edit generated files by hand.`; `Never bypass the API client with raw HTTP calls in UI code.`
- Reject: `Avoid X`, `Try not to Y` — too soft for `Never`.

**`Validation Commands`** — the smallest set of real commands that prove the
path. Prefer scoped commands (the package's own script, a test-path filter)
over repo-wide ones in scoped files. Reject prose ("Run the tests") and
invented or impractical commands. Every command must resolve in step 6.

Keep each force in its own section: MUST NOT rules belong in `Always`,
"Never …" bullets in `Never` — mixing them is an anti-pattern.

## Sizing

| Tier | Lines | Min `Always` rules | `Ask First` | `Never` | `Validation Commands` |
|---|---|---|---|---|---|
| Small | < 80 | 3 | 1+ | 2+ | 1+ |
| Medium | 80–150 | 5 | 2+ | 3+ | 2+ |
| Large | 150+ | 8+ | 2+ | 4+ | 2+ |

- Small packages usually land at 40–80 lines, modules at 60–100, large
  packages at 80–150. A very large existing file under a tone rewrite keeps its
  length — reframe tone, keep all technical content.
- Do not pad small files with sections the code does not need; do not skip a
  required heading because the file is small — tighten its content instead.
- The minimums are floors for real rules, never a reason to invent one: when
  the code does not support enough rules, write what it supports plus
  `TODO(team):` markers and raise them in step 5.

## Tables

- Never use the column headers "Description", "Details", or a standalone
  "Purpose" (write "Purpose / MUST rules" if needed).

| Table kind | Column headers |
|---|---|
| Features / strategies | "When to use", "Configuration" |
| Directory listing | "When to modify" |
| Reference files | "When you need", "Copy from" |
| API / endpoints | "When to use", "MUST rules" |
| Environment variables | "When to configure" |
| Injected services / imports | "When to use", "Import path" |

## Checklists

Include a numbered checklist for each task agents repeat ("Adding a New
Worker", "Checklist: Add an Endpoint"). Every checklist:

1. Uses numbered steps, each starting with an imperative verb.
2. Includes the repo's code-generation or registration step when adding files
   requires one (discovered from the manifest or build files — never assumed).
3. Ends with a testing or verification step.

## Data model sections

Write entities as constraint-framed bullets:
`**Entity** — brief description. MUST [constraint]` — e.g.
`**Categories** — hierarchical. MUST NOT form a cycle`.

## Code examples

- Include snippets only for **contracts** (an export shape, a registration
  call, a handler signature), 3–5 lines each.
- Show the interface or pattern, never implementation detail; point to the
  source file or spec for the full example.

## Cross-references

1. Pick one authoritative file per topic; never duplicate its content.
2. Put a condensed quick reference in the non-authoritative file only when an
   agent needs it inline.
3. Link related guides in a `Cross-Reference` section at the bottom:
   ``- **{Topic}**: `{path}/AGENTS.md` → {Section}``.
4. Keep the root Task Router accurate whenever a file is added or moved.

## Anti-patterns

1. Explaining how things work instead of telling agents what to do.
2. Listing features instead of constraints.
3. Duplicating content across `AGENTS.md` files.
4. Paragraphs where a checklist would be clearer.
5. Changelog sections in small or medium files.
6. Over-documenting internals — `AGENTS.md` guides usage, not implementation.
7. Missing the "when" framing on a table or section.
8. Skipping a required heading because the file is small.
9. Keeping legacy rule headings (`## MUST Rules`, `## Critical Rules`,
   `## Key Rules`, `MANDATORY:` as an H2) next to the boundary sections.
10. Mixing forces — `MUST NOT` under `Never`, "Never …" bullets under `Always`.
