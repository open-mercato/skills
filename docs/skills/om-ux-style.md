# om-ux-style

> 🧑‍💻 Interactive — acts once, may ask questions, reports, and hands control back

Creates a design contract for a repository that has no design system yet. It gathers a moodboard from the references the team chooses (never invented), derives five confirmed principles and five anti-patterns, defines tokens by role for both themes with contrast checked against WCAG AA, and lists the components the product's flows need with all six states and three recipes. It writes the result where every UX skill already reads — declared tokens in `.uxproof/tokens.json`, the rules in the manual section of `.uxproof/conventions.md`, a minimal `contract.json` when none exists — plus a `theme.css` with the eight identity tokens a prototype directory expects. When a real design system already exists, it stops and routes to `om-ux-setup`, because extracting beats inventing. Storybook, component code, and screens stay in Implement; the contract is what they are built against.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{product}` | No | What the contract is for; taken from `product-brief.md` or asked when omitted. |
| `--design <dir>` | No | Where the moodboard, reference images, and `theme.css` live. Default `${SPECS_DIR}/design`. |
| `--refresh` | No | Revise a contract this skill wrote; superseded rules and tokens are marked, never silently replaced. |
| `--no-dark` | No | Skip the dark theme when the product deliberately ships one theme. |

## Works with

Reads the brief [om-discover](om-discover.md) wrote for the product's character and flows. Writes the files [om-ux-setup](om-ux-setup.md) extracts from code, so a later `om-ux-setup --refresh` converges the two; [om-ux-review-pr](om-ux-review-pr.md) and [om-ux-shape](om-ux-shape.md) apply its principles as `[PRODUCT]` rules; the `theme.css` is a drop-in for a prototype directory.

---
*Source: [`skills/om-ux-style/SKILL.md`](../../skills/om-ux-style/SKILL.md)*
