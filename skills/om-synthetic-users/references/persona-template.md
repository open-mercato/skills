# Persona template

What `om-synthetic-users` writes to `${research}/personas.md` (step 2). One block per persona, stable ids, every line tagged with the tier and source of the material it comes from. No names, ages, or biographies.

```markdown
# Personas — {product}

Basis: {product-brief.md sections used, spec, research files} · Built {YYYY-MM-DD} · Stance default: {validate | simulate | adversary}
Panel composition: {segments and proportions, and whether they come from data or are assumed}
Coverage: {n} persona lines — {a} sourced, {u} assumed

## P01 — {role} {in a situation, e.g. "developer blocked the day before a release"}

Runs: {run numbers this persona appeared in}
- Segment and share of the panel: … `[DATA]` {source} | assumed
- Situation the problem shows up in: … `[tag]` {source}
- State of mind at entry — {anxious and rushed | curious and unhurried | indifferent | resentful of the current tool …}, because {the situation}: … `[tag]` {source}
- How much this topic matters to them (central | occasional | barely): … `[tag]` {source}
- Goal, in their words: … `[tag]` {source}
- Success, as they would recognise it: … `[tag]` {source}
- Constraints — time, budget, who pays, who decides, switching cost: … `[tag]` {source}
- Tools they already use for this, and what they look at all day: … `[tag]` {source}
- Words they use (and words they never use): … `[tag]` {source}
- Objections they will raise: … `[tag]` {source}
- What they will not do, whatever the product offers: … `[tag]` {source}
- Traits the material supports (e.g. risk-averse, impatient with setup): … `[tag]` {source}      <!-- only when a source shows it; never a personality profile from nothing -->
- No basis for: {fields left empty on purpose, and the interview or data request that would fill them}

## P02 — …
```

Rules:

- A line with no source is written as `[ASSUMPTION]` and listed under *No basis for*; a persona with more assumed lines than sourced ones is labeled "assumption persona" in its heading. For the coverage count a line is sourced when its main claim carries a real tier, even if a clause inside it is assumed; a line whose main claim is assumed counts as assumed.
- The indifferent seat's salience line may be an `[ASSUMPTION]` when the material holds no one who barely cares; the line says so. Everything else about that persona follows the same sourcing rules as the rest.
- Before a persona block is handed to its subagent, the tags and source keys are stripped: the persona knows its situation, not its bibliography.
- A persona comes from a segment the brief's Target group names or the data shows; never add a segment the material does not contain. The panel includes at least one persona whose topic salience is *barely*.
- The state of mind at entry is derived from the situation, not invented: "blocked the day before a release" implies rushed and anxious; "browsing on a Sunday" implies unhurried. It changes what the persona notices (a typo reads as sloppy to the unhurried and as a scam signal to the anxious).
- Traits are written only when a source shows them; no trait profile is generated to make a persona feel rounder.
- Under `adversary`, add one line: *The reason this person would not switch:* — it must come from an objection in the material or be marked assumption.
- A refresh keeps ids, updates lines, and appends `Superseded: …` under a line whose source changed; it never deletes a persona, it marks it `retired` with the reason. Personas sampled fresh for a run get new ids; the file keeps every persona ever used, with the runs it appeared in.
