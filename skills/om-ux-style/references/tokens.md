# Tokens (step 5)

The token families, their naming, and the checks before a value is accepted. Values come from the moodboard and the user; the agent proposes and checks.

## Families and roles

- **Color, per theme (light and dark unless `--no-dark`):** `ground`, `surface`, `surface-2`, `line`, `text`, `text-2`, `muted`, `focus`, `primary`, `primary-hover`, `primary-foreground`, `accent-1`, `accent-2`. The semantic status roles — `success`, `warning`, `danger`, `info` and their foregrounds — are part of the contract too, kept distinct from the accent hue: they carry meaning, and re-coloring them for branding changes meaning.
- **Type:** two stacks — `font-display` and `font-body` (a third `font-mono` when the product shows code or numbers in columns) — each with a real fallback stack, and a scale (`text-xs` … `text-2xl`) with line heights; tabular numerals named where digits align.
- **Spacing:** a scale (`space-1` … `space-8`) on one base unit; the contract says which steps are used for what (inline, stack, section).
- **Radius:** `radius-sm`, `radius-md`, `radius-lg`, and the rule for pills when they exist.
- **Shadow and elevation:** `shadow-1`, `shadow-2`, and whether elevation exists at all in this product.
- **Motion:** durations and easings when the moodboard's motion family says the product moves; otherwise "reduced motion by default" as the contract.

## Values the agent proposes

A reference decides a family's character, rarely a value: "one accent" names no hue. The agent proposes the value, marks it *proposed* in the moodboard and the report, and the user confirms or replaces it; a confirmed proposal is a team decision, not an invention. What the agent may never do is add a reference, a brand asset, or a "house style" the team did not bring.

## Naming

By role, never by value: `primary`, not `blue-600`; `text-2`, not `gray-700`. A token whose name says its value cannot change value without lying.

## Checks before a pair is accepted

- Contrast: text on its ground meets WCAG AA (4.5:1 for body text, 3:1 for large text and for UI boundaries), in both themes. State the ratio next to the pair in the report.
- A dark theme is not an inverted light theme: check the accent on both grounds and the surface hierarchy.
- The primary and the two accents are the only identity hues; every other color is a neutral with a slight bias toward the primary, or a semantic role.
- A neutral is chosen, not inherited: pure mid-gray with no hue bias is a sign nobody decided.

## The eight identity tokens

`theme.css` carries exactly these, in the convention prototype directories load after their base tokens: the primary color with its hover and foreground, two brand accents, the radius, and the two font stacks. Everything else stays a semantic contract, stated in the file header as out of scope for branding. The mapping from this skill's families: `primary`, `primary-hover`, `primary-foreground`, `accent-1`, `accent-2`, `radius-md`, `font-display`, `font-body`.

## Where they are written

`.uxproof/tokens.json` as `{ "name", "value", "kind", "source": "design", "theme": "light" | "dark" | "both" }` entries (the `theme` field is additive to the format `om-ux-setup` writes; readers that ignore it see a flat list), and `${design}/theme.css` for the eight identity tokens. `kind` values: `color` for every color role, `font` for stacks, `size` for the type scale (value shape `"14px/20px"`, size over line height), spacing, and radii, `shadow` for elevation, `other` for motion and numeral settings. Full shapes in `references/contract-writes.md`.
