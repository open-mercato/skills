# om-ux-setup

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Extracts the repository's own design contract into `.uxproof/`, committed like code: design tokens, the component registry, screen archetypes with canonical example files, and a human-readable conventions document whose manual section holds the team's judgment calls and survives regeneration. Works with any design system because nothing is assumed — the contract is read out of the target repo. A repo with no declared tokens gets a proposed de-facto palette derived from the colors its code already uses: the first draft of a design system instead of an empty contract (proposed tokens never arm the audit). Run once per repository; re-run to refresh after design-system changes.

## Parameters

This skill takes no parameters.

## Works with

Runs the [`uxproof`](https://www.npmjs.com/package/uxproof) extractor (`npx uxproof init --no-skills`; a manual fallback is documented for offline environments). Every UX skill reads the contract it writes: [om-ux-shape](om-ux-shape.md) loads it as Known constraints, and [om-ux-review-pr](om-ux-review-pr.md) turns it into contract-grounded findings. The same package provides `uxproof audit` and `uxproof sync --check` as CI gates.

---
*Source: [`skills/om-ux-setup/SKILL.md`](../../skills/om-ux-setup/SKILL.md)*
