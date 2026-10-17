# om-ux-design

Design detailed screens and connected prototypes from a specification or selected
backlog scope. Reuse the repository's components, stories and prototype runtime;
verify the selected flow before handing it to implementation.

## Usage

```text
/om-ux-design .ai/specs/2026-07-18-checkout-redesign.md --scope "checkout summary"
/om-ux-design .ai/specs/backlog.md --scope "account recovery"
/om-ux-design prototypes/checkout/README.md --refresh prototypes/checkout
```

| Argument | Meaning |
|---|---|
| `{source}` | Required repository-relative specification or backlog path, or an existing prototype whose context identifies that source. |
| `--scope <story, epic or flow>` | Select part of the source when the request does not already identify it. |
| `--slug <name>` | Stable kebab-case name for a new portable prototype. |
| `--refresh <path>` | Update an existing design while preserving its source, identity and review feedback. |

## What it does

The skill reads the source requirements, protected brief decisions, visual
references, local overrides and `.uxproof/` when present. It refines a
representative screen, then connects the selected roles, states and recovery
paths. Browser checks cover the product's relevant viewports and themes.

Existing components and a suitable local runtime take priority. A broken runtime
requires diagnosis. Portable HTML is available when no suitable runtime exists
or it was explicitly requested, with its fidelity limits stated. Without a
design system, the result is a proposed visual direction; it does not establish
or overwrite a `.uxproof/` contract.

Updates preserve prototype identity, screen and comment anchors, review
operations and tombstones. Moving an existing prototype requires preserving its
feedback through export/import; browser storage alone is not a backup.

## Handoff

The report links the launch route and exact version, requirement and component
sources, verification evidence, simulations and unresolved decisions. It ends
with `Design:`, `Source:`, `Verification:`, `Acceptance:` and `Next:` fields.
Passing checks and human acceptance are separate. Only the accepted version,
with authorization to update the spec, becomes its `Prototype:` reference;
pending designs remain proposal links.

This interactive skill completes the requested local design work and hands
control back. It does not publish the prototype or require a new pipeline stage.
[`om-mockup-prototype`](om-mockup-prototype.md) owns neutral discovery experiments;
[`om-ux-setup`](om-ux-setup.md) extracts the design contract;
[`om-auto-write-spec`](om-auto-write-spec.md) reuses accepted detailed designs as
spec visuals; [`om-ux-review-pr`](om-ux-review-pr.md) compares the implementation
with the accepted scope.

*Source: [`skills/om-ux-design/SKILL.md`](../../skills/om-ux-design/SKILL.md)*
