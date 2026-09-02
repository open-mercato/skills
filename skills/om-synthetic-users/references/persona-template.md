# Persona template

What `om-synthetic-users` writes to `${research}/personas.md` (step 2). One block per persona, stable ids, every line tagged with the tier and source of the material it comes from. No names, ages, or biographies.

```markdown
# Personas — {product}

Basis: {product-brief.md sections used, spec, research files} · Built {YYYY-MM-DD} · Stance default: {validate | simulate | adversary}
Coverage: {n} persona lines — {a} sourced, {u} assumed

## P01 — {role} {in a situation, e.g. "developer blocked the day before a release"}

- Situation the problem shows up in: … `[tag]` {source}
- Goal, in their words: … `[tag]` {source}
- Success, as they would recognise it: … `[tag]` {source}
- Constraints — time, budget, who pays, who decides: … `[tag]` {source}
- Tools they already use for this: … `[tag]` {source}
- Words they use (and words they never use): … `[tag]` {source}
- Objections they will raise: … `[tag]` {source}
- What they will not do, whatever the product offers: … `[tag]` {source}
- Segment size or frequency, when the data says: … `[DATA]` {source}
- No basis for: {fields left empty on purpose, and the interview or data request that would fill them}

## P02 — …
```

Rules:

- A line with no source is written as `[ASSUMPTION]` and listed under *No basis for*; a persona with more assumed lines than sourced ones is labeled "assumption persona" in its heading.
- A persona comes from a segment the brief's Target group names or the data shows; never add a segment the material does not contain.
- Under `adversary`, add one line: *The reason this person would not switch:* — it must come from an objection in the material or be marked assumption.
- A refresh keeps ids, updates lines, and appends `Superseded: …` under a line whose source changed; it never deletes a persona, it marks it `retired` with the reason.
