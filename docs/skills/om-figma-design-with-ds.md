# om-figma-design-with-ds

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Connects design-tool work to the repository's design system. In **Brief** mode it
writes a self-contained brief for a new screen: the archetype's layout, the
registry components and tokens to use (with their design-library names), the
states and interactions to draw, and reference screens from the codebase. It
names only what `.uxproof/` holds. In **Audit** mode it checks an existing
design against the contract: raw colors, off-scale values, detached components,
missing states, icons, accessibility. It ranks the violations and returns a
remediation plan. **Prompt** mode packages either job as a ready-to-paste prompt
for another design-capable agent.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{subject}` | No | The screen to design, or the design reference to audit. |
| `--audit` / `--prompt` | No | Choose Audit or Prompt mode explicitly (Brief is the default). |
| `--from <path>` | No | A spec or `om-ux-shape` handoff whose screens, states and copy the brief carries over. |
| `--apply` | No | After you accept the output, apply the listed operations to the design file through the provider. You confirm the exact list first. |

Design-tool access goes through a committed provider descriptor,
`.ai/design-tools/<provider>.md`, selected by the optional `design.provider`
config key. The skill ships the descriptor contract and scaffolds it on
request. It never hard-codes a tool API and never handles access tokens. When
no provider is set, it works from attached screenshots or exports, or switches
to Prompt mode.

## Works with

[om-ux-setup](om-ux-setup.md) writes the contract this skill reads, including
layers imported from a design system shipped by a dependency.
[om-ux-shape](om-ux-shape.md) decides the direction before a brief is worth
drawing. [om-ux-review-pr](om-ux-review-pr.md) later compares the built screens
with the contract.

---
*Source: [`skills/om-figma-design-with-ds/SKILL.md`](../../skills/om-figma-design-with-ds/SKILL.md)*
