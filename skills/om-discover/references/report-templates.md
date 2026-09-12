# Report templates

Use this content guide for `om-discover`. The human-facing report should make the outcome understandable without repeating the brief. Adapt the wording to the user's language, combine related points and omit inapplicable commentary. Paragraph count and labels are flexible; output markers remain exact.

## Brief written

A compact report can read:

```markdown
The brief is saved at {link}. {The decision, owner and agreed scope, with the reason it serves the current need.}

{Independent source basis and its limits; the consequential unknown, what it blocks and who can resolve it. Include synthetic hypotheses separately when present.}

{What the brief supports next and why; the next action and whether it is offered, authorized and pending, completed or declined.}
```

Add a short review note: material corrections and their consequence, or one sentence when no correction was needed. Disclose an inline-only review. Expand the explanation when a consequential disagreement or correction needs it; do not add a paragraph per tag or deferred section. Link a completed companion's report. If it returns a downstream `Next:`, check that action against this skill's authorization and readiness rules. Preserve an authorized, unstarted route with all its arguments in the final `Next:`; describe completed actions and unaccepted suggestions only in prose.

End with the applicable contract lines from `SKILL.md`:

```text
Elapsed: {observed minutes per step, or timing not recorded}
Product brief: {repo-relative path}
Coverage: {legacy count from the brief, without the collection-plan suffix}
Collection plan: {k} entries waiting for material
Next: {authorized, unstarted skill action and supported args, or none}
```

Emit `Collection plan:` only when actual material requests remain. It does not count deferred optional sections. Coverage counts tagged lines, not independent evidence or product validation; its synthetic count excludes the Hypotheses section. State that section's separate count in prose when nonzero. Apply the `Next:` states in `SKILL.md`; an offer or a completed action is not an instruction to run it.

## Quick pass

Use the same content guide, normally in two or three short paragraphs plus the contract lines. State that this was a quick pass with an inline review; give the actual number of question rounds only if useful. State the important undecided point and whether deeper work would help the current choice. Do not turn untouched sections into homework or imply that quick mode skipped source, coherence or compression checks.

## Collection plan only

When the user has not chosen to draft assumptions and essential material is absent, report the specific requests, the decisions they block and the supplied capture templates. Name owners and timing only when known. Do not emit `Product brief:` or `Coverage:` when no brief was written.

```text
Collection plan: {k} entries waiting for material
Next: none
```

## Refresh

Briefly state what changed: scope or evidence, superseded ids and their replacements, closed requests, and any changed readiness conclusion. Fold this into the outcome paragraph when it is short. Distinguish new independent material from edited or deduplicated prose; a changed count alone does not mean stronger evidence.
