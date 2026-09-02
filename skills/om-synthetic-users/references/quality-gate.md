# Quality gate (step 8)

Apply before writing the report. Score each item 0 (absent or contradicted), 1 (present but vague or partial), 2 (concrete and supported).

## Personas and panel

1. Every persona line carries a tag and a source that exists; assumed lines are listed under *No basis for*.
2. No name, age, city, photo, biography, or trait profile without a source anywhere.
3. Every persona comes from a segment the brief's Target group names or the data shows; the panel's composition follows the data or is declared assumed; at least one persona barely cares.
4. The panel is not homogeneous: personas differ in objections, tools, and vocabulary; no single modern tool, workaround, or opinion is proposed by everyone.

## Interviews and walks

5. No stated-preference question anywhere in the transcripts ("would you use", "would you pay", "do you like", "how likely").
6. Every answer records the passages that grounded it, or that none did; no persona mentions notes, documents, or research.
7. Every decision was simulated under at least one pressure, and the record shows where the story and the pressured choice diverged.
8. Each walk step has the first three things noticed, the fast reaction with its feeling, and 📸 evidence when screens exist; narrative walks say "narrative" and never describe a screen the document does not.

## Findings

9. Every finding survived every run and carries its weight and spread; findings inside each other's spread are reported as tied; single-run items sit under *Seen once*.
10. Every finding carries `[SYNTHETIC]` on its own line, names the persona ids and runs behind it, and is paired with a real-user check: who to recruit (role), what to ask or measure, and which brief assumption (`A0n`) it settles when one applies.
11. No number from a persona leaves the report as a share of users or a prediction.
12. The report uses "would", never "validated", "confirmed", "users said", or "users want".
13. Under `adversary`, no run that merely agrees survives; under any stance, a zero-barrier result explains why with the screens.
14. The known persona biases were checked and, where present, named: over-positivity, the same technology proposed by everyone, every persona from the same place or kind of company, every persona equally engaged, idealism the material does not support.
15. **The parity check used held-out notes only**, or was skipped with the reason stated; no leaked overlap was recorded as a calibration row.
16. **Acquiescence was measured.** Language models say yes more often than the world does: on balanced binary questions their mean answer sits above one half. For every yes/no question in the transcripts, count the panel's yes share across all runs; a share clearly above one half that the persona lines and passages do not support is reported as acquiescence, and those answers are excluded from the findings rather than counted as agreement.
17. When real interview notes exist, the parity check ran and `calibration.md` was written; the report treats deviation as questions and material, never as a defect to smooth over.
18. Nothing in the report edits or pretends to edit the brief, a spec, or a tracker item.

Critical gates: items 1, 2, 5, 9, 10, 11, 12, 15, 16. A zero means the report is not ready; fix it or drop the finding.

## Slop signals to remove on sight

- A persona that reads like a stock photo caption, or a personality profile with no source behind it.
- "Users want" or "customers need" anywhere.
- A percentage of personas presented as a share of users.
- A finding the material cannot trace to a persona line and a passage.
- A finding from one run presented as if it repeated.
- A walkthrough that praises the flow in every step.
- A quote attributed to a persona as if a person said it.
- A screen described in a narrative walk that neither brief nor spec contains.
- Five personas who all propose the same tool, in the same words.
- A panel that says yes to nearly every yes/no question.
