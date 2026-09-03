# Quality gate (step 8)

Apply before writing the contract. Score each item 0 (absent or contradicted), 1 (present but vague or partial), 2 (concrete and confirmed).

1. Every principle and anti-pattern traces to a moodboard entry with a source and a chooser, and was confirmed by the user.
2. Every principle is checkable on a screenshot by someone who did not write it; it has a do and a not.
3. Tokens are named by role; no value-named token anywhere.
4. Every text/ground pair meets WCAG AA in both themes, with the ratio recorded; the dark theme was designed, not inverted.
5. The neutral was chosen (a hue bias, or an explicit decision for pure gray), and the identity hues are three at most.
6. Every component lists all six states, with n/a justified, and its accessibility requirements.
7. The three recipes write the empty, loading, error, and no-permission sentences the user reads.
8. `theme.css` declares exactly eight identity token names in `:root` (the `.dark` block re-declares the five color knobs only) and states the semantic contract in its header.
9. The manual section of `conventions.md` was appended, not rewritten; superseded rules are marked.
10. Nothing in the contract names a framework, a component library, or a product other than this one.

Critical gates: items 1, 3, 4, 8, 9. A zero means the contract is not ready. The gate runs before the files are written; item 9 is checked on the content about to be written.

## Signatures of the generic look

Flag the contract when it would reproduce these without a moodboard reference that chose them deliberately:

- warm cream ground with a serif display face and a terracotta accent;
- near-black ground with one acid-green or vermilion accent;
- a purple-to-blue gradient hero on white;
- a "safe" geometric sans as the only voice, with no display or mono role decided;
- every corner on the same large radius, every card with an accent rail;
- everything centered, hairline rules and dense columns as decoration;
- emoji or glyph characters used as icons;
- amber text on amber fills in chips and badges (contrast fails);
- glow halos and radial gradients as emphasis.

A signature the team consciously chose stays — the moodboard entry says so and names why.
