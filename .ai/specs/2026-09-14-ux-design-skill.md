# Detailed design from a specification

## Problem and goal

The approved split assigns neutral discovery prototypes to `om-mockup-prototype`
in merged PR #107, and detailed design to `om-ux-design` in PR #106. The latter
still imports a desktop HTML flow generator that explicitly excludes design-system
fidelity. Update that capability to produce connected, visually reviewed screens
from a specification or selected backlog scope, using the repository's actual
design system and preserving existing review feedback.

## Non-goals

- Publishing, updating or merging remote PRs, or resolving the upstream #5832
  release prerequisite by assumption.
- Changing the discovery prototype's files, ownership format or behavior.
- Rebuilding a product backend, inventing product requirements, or treating
  prototype approval as demand validation.
- Installing a framework or imposing a design system on consuming repositories.
- Changing the collection's shared reporting rules.

## Approach

Port the relevant #106 skill, assets and tested helpers under `om-ux-design` on
current main. Preserve `om-mockup-prototype` as discovery's released name; the
unreleased import has no deprecated alias. Carry over the current shared rule
text and update the new skill's own contract and conditional references.

Read the spec/backlog, protected brief decisions, local overrides, visual
references and `.uxproof/` before composing. Prefer the repository's existing
prototype runtime, components and stories. Use the portable HTML scaffold only
when no suitable runtime exists or portable HTML is explicitly requested, and report its fidelity
limits. With no design system, produce an explicitly proposed visual direction;
do not overwrite `.uxproof/` or claim conformance to an absent contract.

Map requirements to screens, roles and relevant states. Refine one representative
screen before expanding the flow. Use actual components and supported viewport
and theme conventions. Diagnose a broken existing runtime instead of replacing it silently. Preserve
prototype identity, storage origin, screen and comment anchors, inputs on
failure, navigation context, and reviewer operation logs. Reuse an existing
prototype without initialization; never overwrite it to refresh the design.

Adapt the token helper to the current flat `.uxproof/tokens.json` format with
theme/source metadata, ahead of configured `designTokens` and the bundled default.
Retain the old snapshot shape and conventional snapshot fallback for compatibility.
Malformed selected input must fail with context rather than silently changing
the design source. Correct the #106 template substitution, repo-root propagation,
screen selector and escaping defects; regression-test the observable behavior.

Use a proposal link until the owner accepts the exact version and authorizes
the spec update. Keep the exact `Prototype:` spec marker for that accepted
version and hand off the selected revision,
component sources, coverage, simulations, browser evidence and acceptance status.
Reuse accepted detailed designs in spec-authoring rather than creating competing
illustrations; retain its `--no-mockups` and text-only fallback. Update skill
registration, usage docs, role routing, config defaults and validation/CI together.

## Acceptance criteria

1. Both skills coexist with distinct names, local overrides, docs and output
   ownership. No code or command interprets discovery output as detailed design.
2. An invocation can start from a spec or selected backlog scope, respects the
   brief, and asks only about missing decisions necessary for that task.
3. Existing-runtime work uses actual repository components and conventions; the
   portable and no-DS cases clearly identify their limitations and proposals.
4. Connected screens cover the selected requirement/state matrix, reviewed at
   the product's relevant viewport sizes and themes before readiness is claimed.
5. Token precedence and both data formats work, including theme variants,
   malformed input, path containment and drift checking. Setup adds no questions.
6. Revision work and export preserve comments, tombstones and stable anchors.
   Literal template values and unusual imported screen IDs do not corrupt output.
7. Handoff distinguishes visual verification, unresolved decisions and human
   acceptance; the spec's `Prototype:` points to one reproducible selected design.
8. The configured validation suite and new behavior tests pass. Independent
   realistic executions cover a repository with a DS/runtime, no DS, and an
   existing commented prototype. Browser checks report actual evidence and gaps.

## Source and release

User-approved plan in this task, 2026-09-14. PR #107 merged before implementation.
Imported source: PR #106 at `730a1d68d93a697a976d7563359c9c819c31b29b`.
On 2026-09-15, [@matgren accepted the replacement rollout condition](https://github.com/open-mercato/skills/pull/106#issuecomment-5678863467):
verify the import from upstream commit `9ea83205be7447867c042bbcfd3caaa9b4cadfb5`,
record all mappings and intentional differences, retain the verification evidence,
and obtain @pkarw's confirmation and fresh review before removing `blocked`.
The governing condition is the **Rollout** section of
`.ai/specs/2026-08-26-interactive-prototype-skill.md`; the comparison and evidence
are in `.ai/runs/2026-09-15-ux-design-import-verification.md`. This explicit amendment supersedes
upstream merge ordering for #106 once the required confirmation is recorded;
local implementation or tests alone never waive the gate.
