# Research basis

What this skill's design rests on, what was adopted, and what was deliberately left out. Load when adapting the skill; the workflow does not need it.

## Adopted

- **Silicon sampling and algorithmic fidelity** — Argyle, Busby, Fulda, Gubler, Rytting, Wingate, *Out of One, Many* (2022): a language model conditioned on rich backstories mirrors the response distributions of human sub-populations. Adopted as: personas conditioned on sourced lines, and a panel whose composition follows known proportions.
- **Interview-grounded agents** — Park et al., *Generative Agent Simulations of 1,000 People* (arXiv 2411.10109, 2024): agents built from two-hour interview transcripts reproduced their interviewees' survey answers with about 85% of the accuracy those people showed against themselves two weeks later. Adopted as: real interview notes are the best persona material there is, and the parity check against them is the calibration loop. Left out: any claim that the panel predicts survey numbers.
- **Question-by-question grounding with provenance** — practitioner reports on retrieval for synthetic interviews: each answer draws on the passages that bear on that question, records which, and does not carry retrieved detail into later answers. Adopted as the grounding rule in the interview script.
- **Believe what repeats** — practitioner reports on synthetic panels: a fresh panel per run, at least two or three runs, findings that survive every run, and gaps read against the panel's own spread. Adopted as the run and consolidation rules. Left out: precise rankings and percentages, which the same reports say the method does not support.
- **Saturation** — the qualitative-research convention that a study has saturated when new interviews stop adding themes, operationalised as fewer than one new topic in twenty over the last several interviews. Adopted as the saturation line in the report.
- **Individually believable, collectively wrong** — practitioner reports on calibration: marginal matching to known proportions, and salience (most people barely engage with most topics). Adopted as the panel composition rules and the indifferent persona.
- **Homogeneity of aligned models** — Mohammadi, *Creativity Has Left the Chat* (2024): alignment reduces output diversity and pulls answers toward attractor states. Adopted as: one persona per fresh-context subagent, a homogeneity check on the panel, and resampling from other corners of the segments. Left out: model shuffling, which a skill cannot control.
- **The say-do gap** — practitioner reports and the behavioural-economics literature (Horton, *Homo Silicus*, 2023; Brand, Israeli, Ngwe, *Using GPT for Market Research*, 2023): stated preferences diverge from choices under constraint. Adopted as: no stated-preference questions, the decision simulated under pressure, variance across pressures over averages, outliers reported on their own.
- **Fast reaction before considered answer** — the somatic-marker and dual-process accounts that practitioner reports build on: an affective state at entry biases what is noticed and how a defect is read. Adopted as: state of mind at entry, the first three things noticed, the fast reaction with its feeling next to the thought. Left out: personality profiles generated without a source.
- **Ensembles beat single judges, hybrids beat ensembles** — Schoenegger et al., *Wisdom of the Silicon Crowd* (arXiv 2402.19379, 2024): aggregated model forecasts match human crowds and improve when combined with human judgment. Adopted as the reason the panel is a panel, and the reason every finding is paired with a real-user check.
- **The deviation is the finding** — practitioner comparison studies: themes only real people raised locate the panel's blind spots; themes only the panel raised are questions, not findings. Adopted as the parity check.

## Left out, on purpose

- Predicting survey toplines or any quantity from the panel. The same practitioners who do it document that radically different populations produce identical marginals; this skill produces no numbers.
- Eye-tracking-grade attention prediction. The first-three-things-noticed record is a cheap qualitative proxy, not a saliency model.
- Emotion taxonomies and personality inventories applied to every persona. A feeling is recorded next to each reaction; a trait is written only when a source shows it.
- Model routing and prompt-evaluation platforms. Out of a skill's reach; the calibration file is the cheap analogue of a trend dashboard.
- Any reading of parity as a licence to skip real interviews. Every source used here says the opposite.
