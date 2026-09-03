# Report templates

The final report for `om-ux-style` (workflow step 8). Fill it exactly and expand with detail — the reader did not sit in the session. End with the Output contract lines from the skill body, one per line, exact and undecorated.

```markdown
## 🎯 om-ux-style — design contract

📝 **Basis.** {the moodboard: how many references, from whom, the confirmed character words and anti-character; whether a proposed palette from om-ux-setup was an input}

📋 **Principles and anti-patterns.** {P1 … P5 and X1 … X5 in one line each, with the reference each comes from}

🎯 **Tokens.** {the identity hues and the neutral, both themes, the type stacks and scale, spacing and radius; the contrast ratios of the main text/ground pairs}

📋 **Components and recipes.** {the list with the count of states considered; the three recipes and the sentences they fix}

📸 **What was written.** {each file with its path; for conventions.md, that the manual section was appended; on --refresh, what was superseded}

⚠️ **What only you can still decide.** {open questions: a family with no reference, a contrast pair the user chose to keep below AA, a component the flows may need}

✅ **Next.** {run om-ux-setup --refresh once components exist in code; drop theme.css into a prototype directory; where the review skills will now cite [PRODUCT] rules}

Design contract: .uxproof/
Theme: {…}
Moodboard: {…}
Next: {…}
```

## Variant: a design system already exists

When step 1 finds declared tokens and a component registry, the report is three lines: what was found, that extracting beats inventing, and the exact `om-ux-setup` invocation to run instead. No contract lines except `Next: om-ux-setup --refresh`.
