# Writing the contract (step 7)

Exactly what this skill writes, where, and how it stays compatible with what `om-ux-setup` writes and every UX skill reads. Show the user the diff of each file before writing.

## `.uxproof/tokens.json`

An array of token entries in the format `om-ux-setup` documents, with two additive fields:

```json
[
  { "name": "primary", "value": "#1f6b73", "kind": "color", "source": "design", "theme": "light" },
  { "name": "primary", "value": "#6fc3c9", "kind": "color", "source": "design", "theme": "dark" },
  { "name": "font-body", "value": "\"IBM Plex Sans\", system-ui, sans-serif", "kind": "font", "source": "design", "theme": "both" }
]
```

`source: "design"` marks a declared token (as opposed to one extracted from code, where `source` is a file path, or proposed from a palette, `"proposed"`); `theme` is `light`, `dark`, or `both`. Both sentinels are documented in `om-ux-setup`'s contract format. Readers that do not know the fields still see a valid flat list. When the file already holds *declared* tokens, this skill stops (workflow step 1); when it holds a *proposed* palette, the proposed entries are kept under `"source": "proposed"` for the record and the declared ones are added.

## `.uxproof/conventions.md`

When the file does not exist, create it with one title line (`# Conventions — {product}`), one sentence saying the generated sections will be added by `om-ux-setup`, and the manual markers. Then append inside the manual markers, never outside them, never replacing what is there:

```markdown
<!-- uxproof:manual-start -->
{existing team rules stay untouched}

## Design contract — written by om-ux-style on {date}
### Character
{confirmed character words; anti-character}
### Principles
{P1 … P5 per references/principles.md}
### Anti-patterns
{X1 … X5}
### Components and states
{the list per references/components.md}
### Recipes
{list with filters, form, detail view}
### Superseded
{on --refresh: what changed, from what, why — the old rule quoted}
<!-- uxproof:manual-end -->
```

## `.uxproof/contract.json`

Only when absent. The minimal shape `om-ux-setup` documents, with `"framework": "unknown"`, the styling system the repo uses or `"css"`, `tokenSources` pointing at `tokens.json`, empty component roots, and `counts` where `tokens` is the number of entries in `tokens.json`, `colorTokens` the number of distinct color role names, and `components` is `0` until code exists — so `om-ux-review-pr` finds a contract and cites `[PRODUCT]` rules. When `om-ux-setup` later runs, it regenerates everything outside the manual section from code and the two converge.

## `${design}/theme.css`

The eight identity tokens in the convention a prototype directory loads after its base tokens — a plain `:root {}` and `.dark {}` block, no framework directives, no build step:

```css
/* theme.css — identity tokens for {product}. Written by om-ux-style on {date}.
   Edit these eight values to rebrand. The .dark block overrides the five color knobs;
   radius and the two font stacks are theme-invariant and inherit from :root.
   Everything else (status roles, focus ring, layering, semantic colors) is a
   contract, not identity — do not re-purpose it here. */
:root {
  --primary: {value};
  --primary-hover: {value};
  --primary-foreground: {value};
  --accent-1: {value};
  --accent-2: {value};
  --radius: {value};
  --font-display: {stack};
  --font-body: {stack};
}
.dark {
  --primary: {value};
  --primary-hover: {value};
  --primary-foreground: {value};
  --accent-1: {value};
  --accent-2: {value};
}
```

## `${design}/moodboard.md`

Per `references/moodboard.md`, with the user's image files copied beside it.

## Hand-off lines the report carries

- Commit the contract like code: reviewable, diffable, explained in the commit.
- Once components exist in code, run `om-ux-setup --refresh` so the extracted registry and archetypes join the declared tokens; the manual section survives.
- A prototype directory that carries its own `theme.css` takes this file as a drop-in.
