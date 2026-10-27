# Readiness gate and completeness (step 4)

What `om-pre-implement-spec` checks before judging design quality: is this document an implementable plan at all? An incomplete or draft spec is **not** an implementation plan — the gaps are reported and routed back to spec revision, never filled in during implementation or inside generated agent prompts.

## Readiness gate — every failed item is Critical (verdict no-go)

| # | Item | Passes when |
|---|------|-------------|
| R1 | **Declared status** | The spec's status (front matter `status:` or a `Status:` line) is a value the repo's template or `SDLC.md` defines as ready for implementation (typical: `Ready`, `Approved`, `Accepted`). `Draft`, `Proposed`, `WIP`, `In review` fail. No status field → fails only when the resolved template requires one; otherwise record it as an Important gap. |
| R2 | **No blocking open questions** | No unanswered item remains in an `Open Questions` block, and every `⚠ NEEDS HUMAN CONFIRMATION` entry under `Resolved assumptions (autonomous defaults)` has a recorded human confirmation (in the spec, its PR, or its issue). An unconfirmed `⚠` entry is reported as needing a human, with the question and the default that was taken. |
| R3 | **Traceability** | Every requirement maps to an acceptance criterion, the phase/step that delivers it, and a self-contained test oracle — a test, command, or observable behavior someone other than the author can check. A requirement with no oracle fails. |
| R4 | **Contracts defined** | Every API, command, event, or message the spec adds or changes has its shape, validation, permission/auth rule, and error behavior. Every affected UI surface is described (see UI contract below). "Standard CRUD" is acceptable only when the repo's instructions define what standard means. |
| R5 | **Phases are deliverable** | An `Implementation Plan` or `Phasing` section exists; every phase declares its dependencies (what must land first) and an observable exit gate; every step is testable and leaves the application working. Phases that can only be proven together, or a step that is "hope, not a step", fail. |
| R6 | **Grounded in the codebase** | The modules, contracts, and primitives the spec says exist actually exist (workflow step 3). A mis-description fails — implementation built on it inherits the error. |

### UI contract (R4, when the spec changes a rendered surface)

The UI description passes when it:

- cites a concrete **reference** — an existing screen or component in the repo, or an accepted prototype (the spec's `Prototype:` line);
- names the **canonical primitives** the repo prescribes (the shell, form, table, feedback, and HTTP-client components its agent instructions, routed guides, or `.uxproof/` design contract name) instead of hand-rolled substitutes;
- covers the **states** — loading, empty, error, permission-denied — and, when the repo supports them, the theme and responsive variants its design contract declares;
- plans user-visible copy through the repo's localization mechanism when it has one.

## Completeness — required sections

Resolve the template, first hit wins:

1. `paths.specTemplate` from the config.
2. A spec template the repo's agent instructions or the repo-local extension of this skill names.
3. Exactly one file in `$SPECS_DIR` whose name contains `template` (case-insensitive). Several → the one the agent instructions name; still ambiguous → fall through.
4. The built-in section set below (the `om-spec-writing` skill's structure).

Built-in set — required unless marked "when applicable":

- TLDR · Problem Statement · Proposed Solution · Architecture
- Data Model (when the spec touches stored data) · API Contracts (when it adds or changes an interface) · UI/UX (when it changes a rendered surface)
- Edge Cases & Failure Scenarios · Risks & Impact Review
- Migration & Backward Compatibility (when any protected surface is touched — see `references/bc-audit.md`)
- Test coverage / acceptance scenarios for every changed API and UI path
- Phasing · Implementation Plan

A template that demands more (a compliance report, a changelog, an implementation-status ledger) makes those required too. For each **missing** section say what breaks without it and what to add; for each **incomplete** one, name the specific gap. A missing section that a readiness item depends on (for example no Implementation Plan → R5) is reported once, under the readiness item.

## Scope cohesion (direction question, not a defect)

When the spec bundles more than one independently deployable capability (would each function without the other?), record a **decision for the spec owner** recommending a split, as an Important gap — never as a Critical finding on its own.
