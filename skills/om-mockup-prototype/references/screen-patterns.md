# Screen anatomy for prototypes

This is the neutral anatomy the bundled stylesheets implement: a desktop
backoffice shell with a sidebar, a sticky top bar, list pages built around a
data-table card, a two-column form layout, and a Kanban board. Copy these
structures instead of guessing — a prototype whose layout contradicts itself
misleads reviewers.

**This file is a template.** A repository's own screen anatomy belongs in the
repo-local override (`.ai/skills/om-mockup-prototype/references/screen-patterns.md`),
which initialization scaffolds from this template when it is missing and which
wins over this file. Replace the structures below with the ones your product's
real screens use — measured from the running application or the component
sources, not from memory — and keep the "easy mistakes" list alive with the
ones your reviewers actually hit. The `om-ux-setup` contract (`.uxproof/`),
when present, is the natural source for tokens, component names, and screen
archetypes.

## Application shell

```text
grid [240px_1fr]   (collapsed: [80px_1fr])
├── aside   border-right, py-4 px-3
└── column  min-height 100svh
    ├── header  61px sticky, bottom border, translucent blurred background, px-3…6 py-3
    ├── main    flex-1, p-4…6, centered, max-width ~96rem
    └── footer  top border, px-4 py-3, right-aligned actions
```

Four easy mistakes:

1. Breadcrumbs belong in the top bar, not the page body; the first item is a
   home icon linking to the application root.
2. The active-navigation rail extends outside the padding: a 4px rounded-right
   bar absolutely positioned at the container's left edge, with the container
   compensating via negative margin plus matching padding.
3. A navigation-group heading uses extra-small, medium-weight, uppercase,
   wide-tracked, muted text — not an overline text style.
4. The sidebar has its own 36px search input below the logo, independent of
   global search in the top bar.

The logo is a 40×40 round mark plus the name inside a padded, rounded,
hover-highlighted block.

## Page scaffolding

```text
Page        → vertical stack, 1.5rem gaps
Page header → column on small screens, row with space-between from sm up
              h1: 1.25→1.5rem, semibold, tight leading
              subtitle: small, muted, slight top margin
              action row: wrapping flex, 0.5rem gaps
Page body   → vertical stack, 1rem gaps
```

The page title is semibold, not bold.

## Data-table list layout

On list pages, the title and primary action belong in the table-card header
rather than the page header.

```text
card (rounded-lg, border, card background)
├── header px-4 py-3, bottom border
│   ├── row: h2 (base size, semibold) ↔ action buttons
│   └── toolbar row (top border, mt-3 pt-3)
│       ├── search input (18–20rem) + filters + view switcher
│       └── selection count + bulk actions
├── optional info strip px-4 py-2, bottom border
├── table
└── pagination footer px-4 py-3, top border
```

Table details:

- The header band uses the muted color at low opacity.
- Header cells: comfortable padding, left-aligned, medium weight, muted
  color, no wrapping.
- Body cells match the header padding; rows separate with bottom borders that
  stop after the last row; row hover is a subtle muted wash.
- The selection column is narrow and fixed; the action column hugs the right.
- Selection controls use the selection accent token, not the primary color.

Pagination copy follows "Showing 1 to 25 of 312 results" with tabular
numerals. Page buttons are 32px squares with rounded corners, the active page
gets the muted background, and the page-size select sits on the right. Bulk
actions stay inline in the toolbar; a floating action bar belongs to the
Kanban pattern only.

## Form layout

```text
form
└── grid: single column, from lg two columns at roughly 7:3
    ├── main column   (vertical stack, 0.75rem gaps)
    └── side column   (vertical stack, 0.75rem gaps)
```

A group card uses the card surface with comfortable padding; its title is
small and medium-weight. In edit mode the form header puts Back and the title
on the left, actions on the right. Footer order is fixed: additional actions →
Delete → Cancel → Save. Save is a submit button with a save icon and a
spinner plus "Saving…" while in flight. Delete uses the outlined destructive
variant, not the filled one.

## Kanban board

```text
column (flex-none, vertical, 0.75rem gaps)
├── column header card (muted wash, px-4 py-3.5)
│   ├── thin full-width color bar
│   └── row: NAME (small, bold, uppercase) + count badge ↔ column total
├── add button
└── drop area (min-height ~40vh, rounded, slight padding)
```

A card uses the card surface with a subtle shadow; its title is base-size
semibold clamped to two lines. Chips are rounded, extra-small, semibold, and
colored with the semantic status tokens. Quick actions may reveal on hover
but must remain visible for touch and keyboard focus. The board's bulk-action
bar floats bottom-center in inverted colors with a strong shadow.

## Tokens and scale

| Control | Height |
|---|---|
| Default button | 36px, 1rem horizontal padding (0.75rem with an icon) |
| Small button | 32px, 0.75rem padding |
| Icon button | 36px square |
| Input / search input | 36px, 0.75rem padding |
| Top bar | 61px |

The radius scale cascades from `--radius` (default 0.625rem → 6px small, 8px
medium, 10px large, 16px extra-large).

Use semantic tokens only. Express statuses with
`status-{error|success|warning|info|neutral|pink}-{bg|text|border|icon}`,
never hardcoded shades; use `chart-*` tokens for charts; add no theme-specific
overrides — the semantic tokens already switch themes.

## Deliberate prototype differences

Static HTML has two deliberate differences from production code:

- Icons use an embedded SVG sprite rather than an icon-library import.
- Text is hardcoded rather than passed through the product's i18n layer.

Both patterns are forbidden in production. Record the differences in the
generated README so nobody treats prototype markup as implementation guidance.
