# Report templates

Write the walkthrough artifact to
`${session}/report.md` in step 9, then give a shorter
final handoff. Follow
`references/rules.md`: lead with the consequence and real check, keep the artifact
complete, and link it from the handoff. Omit empty optional sections, but retain
limitations, checks not run, and every finding's real-user check. When the basis
is assumption-only, put `[ASSUMPTION]` in the first line of both reports.
End the handoff with the skill body's exact, undecorated Output contract lines.

## Walkthrough report

```markdown
# Walkthrough: {flow}, {subject}, {YYYY-MM-DD}

{The most consequential repeated hypothesis and the real check needed next, or why this run supports no finding. Every finding is synthetic and does not satisfy the Definition of Ready.}

Stance: {validate | simulate | adversary}
Panel: {n} runs × {m} personas; {ids per run}
Basis: {brief sections, spec, files, and evidence tiers}
Panel snapshot: {this session's personas.md, containing every panel run}
Session: {new session directory; exact subject and flow}
Composition: {from data | assumed; explain the source or assumption}
Saturation: {reached after {k} interviews | not reached: {t} new topics in the last run}
Parity: {overlap with held-out real interviews, which notes, exclusive themes | skipped: no held-out note for this flow because the only note built the personas | no real interviews to compare}
Elapsed: {minutes per phase: personas, interviews, walks, consolidation, parity}
Not askable of this panel: {brief assumptions about other segments or provenance, by id; say explicitly when no such limitation applies}

## 🎯 Scope and limits

{Name the flow, medium (narrative, prototype, running app), role logged in as, and what was not walked and why.}

## 🔍 Barriers that repeated (worst first, ties marked)

### 1. {Barrier and the job it would prevent.}

[SYNTHETIC]

Weight: {w}; spread: ±{s}; personas: P01, P03 (run 1), P07 (run 2); {ties, if any}.
{Locate the step, screen, and screenshot. Describe the persona's fast reaction and feeling, then its considered response, citing transcript lines and the passages that ground them.}
{Explain the consequence and the brief claim it touches: R0n, N0n, D0n, A0n.}
{Name the role to recruit, the real question or task, and the data that would confirm or refute this hypothesis.}

## 📋 Missing cases that repeated

{One entry per case, each with [SYNTHETIC] on its own line: explain the missing behavior, weight and spread, persona ids and runs, source line or pressure, and the real check.}

## ⚠️ Contradictions with the brief

{One entry per contradiction, each with [SYNTHETIC] on its own line: name the flow promise and conflicting brief claim, replication count, persona ids and runs, and the real check.}

## 🔍 Outliers

{Give each refusal, exit, or misread its own paragraph with the persona, run, reason, and pressure that caused it. Keep outliers separate from repeated findings.}

## 🔁 Seen once, not reported as a finding

{List items that appeared in one run only, with the persona and run, so a human can decide whether to investigate. A one-run walkthrough contains only these items, never findings.}

## 🧪 To confirm with real users

| # | Hypothesis | Persona ids / runs | Settles | Who to recruit | How |
|---|---|---|---|---|---|

{Pair every surviving finding with a real interview, data request, or usability test. Include the role, recruitment count when the plan specifies one, question or task, and brief claim or assumption it settles.}

## 📝 Interviews

{Link transcripts or include them per persona and run: question, fast reaction and feeling, considered answer, passages used, pressure and its effect, and the real check.}

## 🔍 Parity with real interviews

{Explain shared themes and sentiment alignment, real-only themes and the material each needs, and panel-only themes as questions for the next interview. Link calibration.md for the recorded overlap; keep the number in the Parity field above. If parity did not run, retain its reason there and omit this section.}

## 📸 Evidence

{Link screenshots or state that this was a narrative walk with no screens.}
```

Keep each surviving finding and its supporting detail in the artifact. If no
barriers repeat, explain why with the inspected screens or narrative material;
do not imply that a limited or single-run walk established a usable flow.

## Final report

Aim for 3–6 lines before the output fields; allow more for material limitations
or outliers. The artifact remains complete. If the handoff selects findings,
state how many it omits and link the full report. Keep run, saturation, parity,
and hypothesis totals in their output fields instead of repeating them in prose.

```markdown
🎯 `om-synthetic-users`: {The next real check and the repeated hypothesis that makes it necessary, or why no finding can be reported.}
{Name the source, evidence tiers, panel composition (from data or assumed), and stance with its reason.}
🔍 {Explain the most consequential repeated barriers, weight and spread, persona ids and runs, brief claims, and ties. Put [SYNTHETIC] on its own line for each finding; link any omitted findings with their count.}
⚠️ {Retain consequential outliers with their refusal or misread and cause, missing cases, contradictions, saturation limits, and what was not walked. Link longer explanations.}
🔍 {Explain blind spots against real interviews and needed source material, and panel-only questions; if no comparison ran, keep the reason in Parity below.}
🧪 {Name the real-user plan: roles, recruitment counts when specified, questions or tasks, and the brief assumptions each settles. Link the report, transcripts, and screenshots for the evidence behind it.}

Personas: {…}
Walkthrough: {…}
Runs: {…}
Parity: {…}
Hypotheses: {…}
Next: {…}
```

Use the shared glossary for headings and states. Preserve `[SYNTHETIC]` labels
and the distinction between repeated findings, outliers, and one-run observations
when shortening prose; never describe the panel's output as real-user evidence.
