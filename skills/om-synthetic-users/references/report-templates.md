# Report templates

The walkthrough report written to `${research}/walkthroughs/{YYYY-MM-DD}-{slug}.md` (step 7) and the final report. Fill them exactly and expand with detail. End the final report with the Output contract lines from the skill body, one per line, exact and undecorated.

## Walkthrough report

```markdown
# Walkthrough — {flow}, {subject}, {YYYY-MM-DD}

Stance: {validate | simulate | adversary} · Personas: {P01, P02, P03} · Basis: {brief sections, spec, files} · Every finding below is [SYNTHETIC].

## 🎯 What was walked

{the flow, the medium (narrative, prototype, running app), the role logged in as, and what was not walked and why}

## 🔍 Barriers (worst first)

### 1. {one-line barrier} `[SYNTHETIC]` — P01, P03
- **Where**: {step, screen, 📸 file}
- **What the persona would do**: {in the persona's words, from lines …}
- **Why it matters**: {the job it stops, the brief claim it touches — R0n, N0n, D0n, A0n}
- **To confirm with real users**: {role to recruit, the question or the task, the data that would settle it}

## 📋 Missing cases

{one per line, persona ids, the persona line it comes from, the real check}

## ⚠️ Contradictions with the brief

{one per line: the flow promise, the brief claim it conflicts with, the persona ids, the real check}

## 🧪 To confirm with real users

| # | Hypothesis | Persona ids | Settles | Who to recruit | How |
|---|---|---|---|---|---|

## 📝 Simulated interviews

{per persona: question, answer as the persona, persona lines used, real check}

## 📸 Evidence

{screenshot files, or "narrative walk, no screens"}
```

## Final report

```markdown
## 🎯 om-synthetic-users — walkthrough

📋 **Basis and stance.** {which brief or spec, which tiers the personas rest on, how many persona lines are assumed, the stance and why}

🔍 **What the personas would trip over.** {the top barriers in full sentences, with the persona ids and the brief claims they touch}

⚠️ **What the material does not cover.** {missing cases and contradictions, and what that says about the brief or the spec}

🧪 **What to confirm with real users.** {the interview plan or usability test: roles, counts, questions; which brief assumptions each settles}

📸 **Evidence.** {where the report and screenshots are; what was not walked}

Personas: {…}
Walkthrough: {…}
Hypotheses: {…}
Next: {…}
```
