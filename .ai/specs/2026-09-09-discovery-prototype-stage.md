# Discovery prototype before backlog

## Problem and goal

PR #107 introduces product discovery and an unreleased `om-ux-style` skill that
authors a design contract. The agreed workflow needs a neutral clickable
prototype between the first synthetic panel and the brief refresh. The separate
PR #106 will provide the detailed design stage as `om-ux-design`.

## Non-goals

- Publishing or merging either PR in this local preparation.
- Implementing PR #106, its comment engine, or its upstream dependency.
- Creating a brand, moodboard, production components, or design tokens during
  discovery. Existing `.uxproof/` contracts remain unchanged.
- Treating a synthetic panel or prototype approval as research evidence.

## Approach

Rebase #107 onto the current base while retaining the upstream reporting rules,
QA tools, readiness opt-in, protected decisions, and backlog identity contracts.
Rename the unreleased skill to `om-mockup-prototype` and replace its design-system
authoring workflow with neutral local HTML prototypes of selected brief flows.
Use existing configured paths and default `paths.prototypes` to `.ai/prototypes`
without setup questions. Write under `discovery/<slug>/`, retain context and
assumption labels, and verify navigation and relevant states in a browser.

Discovery offers the prototype after the first synthetic panel, optionally walks
it, then refreshes the brief once and offers a backlog only when its readiness
conditions allow. Each interactive choice remains explicit; a resumed refresh
does not recursively reoffer the same steps. The later detailed design stage
stays separate and no unshipped skill is invoked.

Sync the writing rules introduced by #110 into `om-backlog`,
`om-synthetic-users`, `om-mockup-prototype`, and `om-setup-discovery-pipeline`.
Update their report templates while preserving output markers and limitations.
Keep the initial panel and later screen-walk evidence in distinct immutable
session directories, so same-day runs of one flow cannot overwrite provenance.
Keep the delivery Designer outside discovery-owned markers while adding optional
discovery design responsibilities. Removing the layer restores delivery rows.
UX review can cite accepted behavior without an extracted visual contract, but
cannot treat neutral styling or assumptions as product rules. Update affected
current documentation, roster, setup references and discovery tests. Preserve existing immutable specs and the independent #106 rollout plan.

## Acceptance criteria

- The resulting branch includes the current base and preserves the original
  #107 behavior except for the agreed prototype and reporting changes.
- No installed skill, roster or current usage document routes to `om-ux-style`.
- The prototype workflow generates clickable neutral screens, documents the
  chosen flow and its assumptions, and has a reproducible browser verification
  procedure; it does not write `.uxproof/` or application code.
- Prototype refresh preserves manual work and prior decisions. Output markers
  are line-anchored and `Next:` names only a chosen outstanding action.
- Discovery order, declined choices, refresh loop prevention and evidence labels
  are consistent across the body, references and documentation.
- Setup adds no new prototype or token questions; the optional path has a default.
- All four skill reports follow the current shared writing rules and retain
  their artifact, status, readiness and limitation fields.
- The configured validation commands and focused discovery regressions pass.
- An independent review checks the rebase, scope and consuming instructions.

## Source

User-approved plan from the 2026-09-09 conversation and
https://github.com/open-mercato/skills/pull/107#issuecomment-5599996953.
