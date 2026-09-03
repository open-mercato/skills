# Principles and anti-patterns (step 4)

Five things to do, five things to avoid, each derived from a moodboard entry and confirmed by the user. Written into the manual section of `.uxproof/conventions.md` so `om-ux-review-pr` and `om-ux-shape` apply them as `[PRODUCT]` rules.

## Shape of a principle

```markdown
### P1 — {rule in one line, as an instruction to someone building a screen}
- From: M0n {reference}
- Do: {a concrete example — a screen, a component, a label}
- Not: {the counter-example that breaks the rule}
- Why: {what it does for the user in this product, one sentence}
```

## Shape of an anti-pattern

```markdown
### X1 — {what not to do, in one line}
- From: X0n {anti-reference}
- Looks like: {the signature a reviewer can spot}
- Instead: {the principle that replaces it}
```

## How to derive them

- Start from the confirmed character words; each principle should make one of them true on screen.
- A principle must be checkable on a screenshot by someone who did not write it. "Feels premium" is not a principle; "one accent color per screen, on the primary action only" is.
- The five *avoid* entries always include the generic look's signatures that apply to this product, and the category default the product is meant to break away from.
- Five is the budget, not a target to pad: fewer strong rules beat ten weak ones. When the user has more, the extra ones go into the manual section as notes, not as principles.
- Propose, then ask. The user confirms or rewrites each one; a principle the user did not confirm is not written.
