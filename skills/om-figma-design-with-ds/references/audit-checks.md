# Audit checks (Audit mode, step 4)

Each check compares what the design holds with what the contract declares. A
check whose contract facts are missing (no size tokens, no icon set named in
the conventions) is skipped and listed as an evidence limit, never judged from
taste.

## Checks

| # | Check | Violation when | Default severity |
|---|---|---|---|
| 1 | Color binding | A fill, stroke, or text color is a raw value, or bound to a variable with no `designName` match in `tokens.json` | critical when the contract declares themed color tokens (the value will not follow the theme), else warning |
| 2 | Semantic color | A status meaning (error, success, warning, information) is carried by a non-status token, or a status token decorates something with no status | critical |
| 3 | Scales | Text size, spacing, radius, shadow, or layering off the contract's size, font, and shadow tokens | warning |
| 4 | Library components | An element the registry covers is detached, local, or drawn by hand instead of the `designComponent` instance | critical for form controls and feedback, else warning |
| 5 | Archetype | The screen ignores its archetype's `anatomy`, or fits no archetype in the contract | warning; no-fit is a summary discovery naming the pattern that would be needed |
| 6 | Required states | A state from the archetype's `requiredStates`, or empty, loading, error, validation, or success where the screen needs it, is not designed | critical, and named in the summary as a discovery |
| 7 | Interactive states | Hover, focus, active, or disabled variants are missing, or disabled is shown only by opacity where the contract has disabled tokens | warning |
| 8 | Consistency | Controls in one row mix sizes; one action appears with two styles | warning |
| 9 | Icons | Icons outside the icon set the conventions name, emoji or pictographs used as icons, or icon-only controls with no label annotation | warning |
| 10 | Accessibility | Color as the only carrier of meaning, text contrast below the standard for its size, focus order or keyboard path unannotated for a dialog or form | critical for contrast and meaning-by-color, else warning |
| 11 | Restricted tokens | A token the conventions restrict to a context (brand or marketing colors, gradients, category accents) used outside it | warning |
| 12 | Manual-section rules | A rule written in the `conventions.md` manual section is broken | the severity the team wrote, else warning |

Guard rules in `guards.json` whose `why` concerns something visible in a design
(a forbidden value, a required state) are applied too, citing the rule `id`.

## Ranking and grouping

- Rank critical → warning → info; within a level, by how many screens and users
  the violation reaches.
- One entry per distinct violation; a repeat is listed once with its count and
  the frames it appears in.
- Each entry names where (frame and element or region), what (the value as it
  appears), the fix (the exact token, component, or pattern, from the
  contract), and why (one line: theming, accessibility, consistency, or cost to
  build).
- A proposal that needs a new token or component is not a fix: flag it as a
  design-system gap for the team to decide.

## Provider operations

For each fix a provider could apply, list the operation: variable bindings
(**bind-variable**), component swaps (**swap-component**), and scale snaps that
map one-to-one to a token. Anything needing judgment stays in the manual plan.
