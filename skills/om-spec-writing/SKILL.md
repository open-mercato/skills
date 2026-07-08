---
name: om-spec-writing
description: Write and review feature specifications to staff-engineer standards. Skeleton-first drafting with a hard Open Questions gate, research against market leaders, an implementation breakdown into phases and steps that feeds om-auto-create-pr, and a severity-ranked architectural review format. Use when starting a new spec or reviewing one.
---

# Spec Writing & Review

Design and review feature specifications against the project's architecture, naming, and quality rules. Adopt a **staff-engineer reviewer persona** — rigorous about architectural purity, but open to innovation. The project's own rules always come first: this skill supplies the process and the generic lens; the repository's agent instructions supply the laws.

## Step 0 — Context

Check for a repo-local skill of the same name at `.ai/skills/om-spec-writing/SKILL.md`; when present, follow it instead of these instructions — a local skill that only extends this one can `@`-import or reference it and add its own rules on top. Local rules win, but a repo-local skill can never relax this skill's quality gates. Read the repository's agent instruction files (`AGENTS.md`, `CLAUDE.md`, or equivalents) — the architecture rules, canonical primitives, and naming conventions they define are mandatory review criteria, not suggestions. Load `.ai/agentic.config.json` when present for paths and validation context; this skill performs no tracker operations and does not require the pipeline config.

## Where specs live

Specs go in the repository's design-doc area: `docs/specs/`, `specs/`, `rfcs/`, `design/`, `proposals/`, or wherever this repo already keeps design documents — check the layout before creating anything. When no such area exists, propose `docs/specs/` and confirm with the user.

Naming: `{YYYY-MM-DD}-{kebab-case-title}.md`. This is the filename shape `om-followup-issue-from-pr` recognizes when it files `Implement:` tracking issues for merged spec PRs.

## Workflow

1. **Load context** — the agent instructions above, plus the code, docs, and existing specs covering the affected area. Stop reading as soon as you can name the modules and contracts involved.
2. **Initialize** — create the empty spec file with the naming convention above.
3. **Start minimal** — write a **skeleton spec** first (TLDR + 2–3 key sections). Do NOT write the full spec in one pass.
   - Before writing the skeleton, scan the brief for **critical unknowns** — decisions that block architecture, data model, or scope; questions where a wrong assumption would force rewriting large parts of the spec.
   - One unknown is always checked: if the brief bundles more than one independently deployable capability (test: would each function without the other?), splitting into separate specs MUST be raised as an Open Question.
   - If critical unknowns exist, add a numbered **Open Questions** block (`Q1`, `Q2`, …) directly in the skeleton, immediately after the TLDR. One question per line; keep each short and answerable (binary or multiple-choice where possible).
   - **STOP after presenting the skeleton.** Do not proceed to research or design until the user has answered all questions. This is a hard gate.
4. **Iterate** — apply the answers, fill in the skeleton, remove the Open Questions block once all are resolved. If new unknowns surface later, repeat the gate for those questions only.
5. **Research** — challenge the requirements against open-source market leaders in the domain. What do they get right that this spec ignores? What complexity do they carry that this spec can skip?
6. **Design** — the architecture: components, data model, contracts, failure modes.
7. **Implementation breakdown** — split delivery into **Phases** (stories) and **Steps** (testable tasks). Each step must leave the application working. This structure maps directly onto `om-auto-create-pr`'s execution plan: a well-broken-down spec can be handed to it phase by phase, with the spec referenced as `Source doc:`.
8. **Review** — apply the review checklist below. Delegate the scope-cohesion item to a fresh-context subagent that receives only the spec file path — an author cannot adversarially re-read their own spec.
9. **Output** — finalize the file. When the spec ships as a PR, `om-followup-issue-from-pr` can file the `Implement:` tracking issue once it merges.

## Output formats

### 1. New specification

Core sections (adapt when the feature genuinely needs a different structure, but address every concern):

```markdown
# {Title}

## TLDR
{2-4 sentences: what, why, for whom}

## Problem Statement
{What are we solving? Evidence it matters.}

## Proposed Solution
{High-level approach; alternatives considered and why they lost}

## Architecture
{Components, boundaries, data flow; what changes vs. what is reused}

## Data Model
{Entities, fields, relations, migrations; sensitive-data handling}

## API Contracts
{Endpoints/commands with request/response shapes and validation}

## UI/UX
{Flows, states, accessibility; only what is unique — not standard CRUD}

## Edge Cases & Failure Scenarios
{What breaks, and what the user sees when it does}

## Risks & Impact Review
{Blast radius, migration/compatibility concerns, rollback story}

## Phasing
{Phase 1: … / Phase 2: … — each independently shippable}

## Implementation Plan
{Phases → numbered Steps; each step testable and leaves the app working}
```

### 2. Architectural review

When asked to review or audit a spec, produce:

```markdown
# Architectural Review: {Spec Title}

## Summary
{1-3 sentences: what the spec proposes and its overall architectural health}

## Findings

### Critical
{Violations of the project's hard rules: naming laws, boundary/coupling violations, data-isolation or security leaks}

### High
{Missing phasing strategy, missing rollback/undo story, wrong component placement}

### Medium
{Missing failure scenarios, inconsistent terminology, spec bloat}

### Low
{Stylistic suggestions, diagram improvements, nits}

## Checklist
{Each checklist item below with pass/fail and a one-line justification}
```

## Review heuristics (the staff-engineer lens)

1. **The architectural diff** — is the spec wasting space documenting standard CRUD and boilerplate? Cut the noise; a spec earns its length only with what is unique to this feature.
2. **Scope cohesion** — one independently deployable capability per spec. Bundles get split.
3. **Canonical mechanisms** — does the spec reach for the project's established primitives (its CRUD factories, form/table components, HTTP clients, cache, event bus — whatever the agent instructions name) or invent parallel substitutes? Inventions need a stated reason.
4. **Contracts and compatibility** — which public surfaces change (APIs, events, schemas, config formats)? Is every breaking change flagged with a migration or deprecation path?
5. **Reversibility** — how is each state change undone? The rollback/undo logic deserves the same detail as the execute path.
6. **Boundaries and coupling** — are cross-module effects routed through the project's decoupling mechanism (events, interfaces) or through direct imports? Are optional integrations degraded gracefully when the peer is absent?
7. **Sensitive data** — for every PII / credential / free-text-about-people field the spec proposes: does it follow the project's data-protection conventions (encryption, scoping, access rules)? No hand-rolled crypto, no "TODO encrypt later".
8. **Failure scenarios** — every external call, migration, and long-running job needs a documented failure mode and user-visible behavior.
9. **Testability** — can each implementation Step be verified by a test? Steps that cannot be tested are not steps; they are hope.

## Rules

- The project's agent instructions are the source of architectural law; these heuristics are the floor, not the ceiling.
- Skeleton first, always. The Open Questions gate is a hard stop — never answer your own gate questions to keep moving.
- Specs describe the unique; they do not re-document the framework.
- Every spec ends with a phased, step-level implementation plan where each step leaves the app working.
- Reviews rank findings by severity (Critical/High/Medium/Low) and justify each checklist verdict.
- Never edit code while writing or reviewing a spec — the deliverable is the document.
