# Moodboard (step 3)

What the moodboard is, how it is gathered, and what it may not contain.

## What it is

A record of the references the team chose and what each one teaches, written to `${design}/moodboard.md` with image files beside it. It is the evidence behind every principle and token: a principle with no reference behind it is the agent's taste, and the skill does not ship taste.

## Gathering

Ask the user for references in these families, one round at a time, and record each with its source and its chooser:

- **Products they admire** — and the one thing each does that this product should also do.
- **Products they refuse to look like** — the anti-references, including the generic look (see the quality gate) and the category's default aesthetic when the product should stand apart from it.
- **Color** — screenshots, palettes, brand assets the team already owns. The brief's benchmark table is a source of references, not a source of style.
- **Type** — samples of the voice on screen: dense or airy, editorial or utilitarian, the numerals the product shows most.
- **Composition and density** — how much fits on a screen, where the eye rests, how lists and forms are laid out.
- **Motion and feedback** — how the product should react: instant and quiet, or expressive.
- **Tone of voice** — sample sentences the product would say and would never say.

When the user has no reference for a family, ask what the product's users already look at all day (the tools in the brief's persona lines) — that is the visual context the product enters, and it is a reference too. The agent may suggest a reference; it is marked *suggested* until the user keeps it, and is dropped otherwise.

## The file

```markdown
# Moodboard — {product}

Built {date} with {roles}. Character words (confirmed): {three to five words}. Anti-character: {words for what it must not feel like}.

## References

| # | Reference | Source | Chosen by | Why | Teaches | Family |
|---|---|---|---|---|---|---|
| M01 | … | {link or file; "link, not opened" when the agent could not or may not fetch it} | {role, or "user" when no role was given} | {why the chooser brought it} | {the one thing it shows, in the chooser's words when the link was not opened} | color / type / composition and density / motion / tone |

## Anti-references

| # | Look | Why not | Signature to avoid |
|---|---|---|---|
| X01 | the generic AI look | … | see quality gate |

## Images

{files beside this document, named `M01-….png`; "none provided" when the user brought no images — the moodboard still stands on descriptions and links}
```

## Rules

- No reference without a source and a chooser; no image the user did not provide or approve.
- Anti-references are as important as references: the principles' *avoid* half comes from them. The anti-character words are proposed by the agent from the anti-references and confirmed by the user, and the file says so.
- The moodboard is not the contract — nothing in it is a rule until step 4 turns it into one and the user confirms.
