# Report templates

The walkthrough report written to `${research}/walkthroughs/{YYYY-MM-DD}-{slug}.md` (step 9) and the final report. Fill them exactly and expand with detail. End the final report with the Output contract lines from the skill body, one per line, exact and undecorated.

## Walkthrough report

```markdown
# Walkthrough — {flow}, {subject}, {YYYY-MM-DD}

Stance: {validate | simulate | adversary} · Panel: {n} runs × {m} personas — {ids per run} · Basis: {brief sections, spec, files} · Composition: {from data | assumed} · Every finding below is [SYNTHETIC].
Saturation: {reached after {k} interviews | not reached — {t} new topics in the last run}
Parity: {overlap with held-out real interviews, which notes, exclusive themes | skipped — no held-out note for this flow (the only note built the personas) | no real interviews to compare}
Elapsed: {minutes per phase — personas, interviews, walks, consolidation, parity}
Not askable of this panel: {brief assumptions about other segments or about provenance, by id}

## 🎯 What was walked

{the flow, the medium (narrative, prototype, running app), the role logged in as, and what was not walked and why}

## 🔍 Barriers that repeated (worst first, ties marked)

### 1. {one-line barrier} `[SYNTHETIC]` — weight {w} (spread ±{s}) — P01, P03 (run 1); P07 (run 2)
- **Where**: {step, screen, 📸 file}
- **What the persona would do**: {fast reaction and feeling, then the considered one, from lines …, grounded in {passages}}
- **Why it matters**: {the job it stops, the brief claim it touches — R0n, N0n, D0n, A0n}
- **To confirm with real users**: {role to recruit, the question or the task, the data that would settle it}

## 📋 Missing cases that repeated

{one per line, weight and spread, persona ids and runs, the persona line or pressure it comes from, the real check}

## ⚠️ Contradictions with the brief

{one per line: the flow promise, the brief claim it conflicts with, persona ids and runs, the real check}

## 👤 The outliers

{the one persona in fifteen who refused, quit, or misread, with the reason and the pressure that did it — reported on its own, never averaged away}

## 🔁 Seen once, not reported as a finding

{items that appeared in one run only, with persona and run, for a human to decide whether to chase}

## 🧪 To confirm with real users

| # | Hypothesis | Persona ids / runs | Settles | Who to recruit | How |
|---|---|---|---|---|---|

## 📝 Interviews

{per persona and run: question, fast reaction and feeling, considered answer, passages used, pressure applied and its effect, real check — or a pointer to the transcript file beside this report}

## 🔍 Parity with real interviews

{themes in both with sentiment alignment; real-only themes and the material each one calls for; panel-only themes as questions for the next interview; the overlap recorded in calibration.md — or "no real interviews to compare"}

## 📸 Evidence

{screenshot files, or "narrative walk, no screens"}
```

## Final report

```markdown
## 🎯 om-synthetic-users — walkthrough

📋 **Basis, panel, and stance.** {which brief or spec, which tiers the personas rest on, how the panel was composed and whether from data, how many runs, the stance and why}

🔍 **What repeated.** {the top barriers in full sentences, with weight and spread, the persona ids and runs, and the brief claims they touch; which findings are tied}

👤 **The outliers.** {the refusals and misreads worth a paragraph each}

⚠️ **What the material does not cover.** {missing cases and contradictions, and what that says about the brief or the spec; whether the panel saturated}

🔍 **Where the panel and real people diverge.** {the parity check in words: blind spots and their material, panel-only themes as questions — or that no real notes exist yet}

🧪 **What to confirm with real users.** {the interview plan or usability test: roles, counts, questions; which brief assumptions each settles}

📸 **Evidence.** {where the report, transcripts, and screenshots are; what was not walked}

Personas: {…}
Walkthrough: {…}
Runs: {…}
Parity: {…}
Hypotheses: {…}
Next: {…}
```
