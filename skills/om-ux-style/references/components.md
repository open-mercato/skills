# Components and states (step 6)

The component list is the contract Implement builds against and `om-ux-review-pr` reviews against. It names what the product needs, what each component must do in every state, and when not to use it. It names no library.

## Deriving the list

Start from the brief's Key flows (`product-brief.md`) or, without a brief, from the screens the user describes. Every screen decomposes into a few shapes: a list with filters, a form, a detail view, a dialog, navigation, feedback. The components are what those shapes need — usually ten to twenty, never a catalogue.

## Shape of a component entry

```markdown
### Button
- Purpose: {the one job}
- Variants: {primary, secondary, quiet, destructive — only the ones the flows need}
- Required states: hover, focus (visible ring, `focus` token), disabled (not just faded: unreachable by keyboard when appropriate), loading (label stays, spinner replaces icon), empty n/a, error n/a
- Accessibility: {role, name, keyboard, minimum target size}
- Copy rule: {verb first, what happens when pressed}
- Do not use for: {navigation — that is a link}
- Related principle: P{n}
```

Every component lists all six states and marks the ones that do not apply as n/a with a reason — a reviewer must be able to see that "loading" was considered, not forgotten.

## Recipes

Three recurring shapes get a recipe: which components, in which order, with the empty, loading, error, and no-permission states written as the actual sentence the user reads.

```markdown
### Recipe — list with filters
1. Page title and the primary action (Button, primary) on one line.
2. Filter row (Select, SearchInput, Chip for active filters) — chips use `radius-sm`, never pills unless the contract says pills.
3. Table or Card list; empty state: "No {items} yet" with the primary action repeated; loading: skeleton rows, not a spinner; error: the message and a retry.
4. Pagination or load-more, stated.
```

The same for a form (labels, help text, validation timing, the error summary) and a detail view (header, sections, the destructive action's placement and confirmation).

## What is out of scope here

Storybook, code, and screens are Implement's job. The contract gives Implement everything it needs to build a screen without inventing a value or a variant; when a screen needs a component the contract lacks, the contract is extended first (a `--refresh`), then the screen is built.
