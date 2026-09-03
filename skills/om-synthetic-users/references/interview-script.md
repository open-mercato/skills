# Interviews under pressure (step 3)

How the agent interviews a persona. The questions come from the brief's Problems, Goals, and Riskiest assumptions; the answers come from the persona's lines and the research passages retrieved for that question. A question the material cannot answer is answered "no basis" and lands under *To confirm with real users*.

## Ground every answer, question by question

Before the interview, find for each question the passages in the research directory that bear on it — the persona's own segment's interview notes, data lines, documents — and attach them to that question in the script the subagent receives, marked "for this question only". The transcript records, per answer, which passages informed it, or that none were attached. The persona speaks from lived situation and never mentions notes, documents, files, or research; it is told, once, that a passage attached to one question is background for that answer and not a memory it may claim later, and the interviewer's notes flag any answer that retells a passage's episode as the persona's own. A persona relaying what "people in my position" or "the tickets" say is the data speaking through the persona; the interviewer flags it and the answer does not count for a finding.

## What the persona never sees

The persona's context holds its own persona block, the passages retrieved for the current question, and the subject being walked. It never holds the brief's assumptions (`A0n`), the team's hypotheses, the interviewer's expected answer, or another persona's transcript. A model that is handed the answer someone hopes for uses it worse than it would be used by simply averaging afterwards, and a persona that has seen the assumption confirms it. The assumptions shape the *questions* in the script and the pressures applied; they do not enter the persona.

## Ask about the past, not the future

- "Tell me about the last time {the problem} happened. What did you do, step by step?"
- "What did that cost you — time, money, risk? What did you try before?"
- "Who else was involved, and who decided?"
- "What would have to be true for you to say the problem is gone?"
- "What did you not care about, that we might think you do?"

Never: "would you use", "would you pay", "do you like", "how likely are you to". Those questions produce compliments from real people and produce them for free from a persona. A quality-gate item removes any transcript that contains one.

## Fast reaction, then the considered one

Each answer is recorded twice: the persona's first reaction (one or two sentences, in the state of mind at entry, before any weighing) and the considered answer. Next to the thought, the feeling: which emotion, how strong (mild to intense), and what triggered it. The fast reaction is what a real user acts on; the considered answer is what they would say in an interview. The two disagreeing is a finding.

## Simulate the decision instead of asking about it

After the past-tense questions, put the persona in the situation the brief describes and let the environment force the choice: the deadline, the budget and who signs it off, the switching cost from the tool they already use, the colleague who decides, the thirty seconds they actually have. A pressure the brief does not quantify (no price is stated) is applied as what it is — "a price you are not told until the card form" — and the transcript says the value was unstated rather than inventing one. Record what the persona does — not what they say they would do — and where the story from the earlier answers collapses under pressure. Vary one pressure at a time (double the switching cost, remove the deadline) and record which one flips the decision: the variance across pressures matters more than the average.

## Per assumption in the brief

For every `A0n` in the brief's Riskiest assumptions that the persona's segment could have a story about, one question that could refute it, asked as a story ("when did you last…"), and one pressure that would test it. An assumption about another segment (a mentor-side assumption on a mentee panel) or about provenance (where a data file came from) is skipped and listed in the report as not askable of this panel. The answer is tagged `[SYNTHETIC]` and paired with the real check that would settle `A0n`.

## Four yes/no questions about the past

For the acquiescence measure, every persona gets the same four yes/no questions about what they did the last time, chosen so that the material makes two of them likely yes and two likely no for the segment ("did you ask anyone outside your team?", "did you pay anyone?", "did you ship without an answer?", "did you keep what you learned somewhere?"). Each answer is yes, no, or no basis, with the passage or persona line it rests on; the quality gate counts the yes share of the answered ones.

## Stance behaviour

- `validate` — the persona answers from what the running product or prototype actually showed them in the walkthrough, not from the brief's promises.
- `simulate` — every answer ends with *to confirm with: {role, question}*; the consolidated interview plan is the deliverable.
- `adversary` — after each answer the persona adds "and here is why I would still not switch"; the objection must come from the persona's material or be marked assumption. A persona's interview with no objections is re-run with the persona instructed to refuse the product; a whole run in which every persona agreed is discarded.

## `--open`: exploratory interviews

Without a flow and without the assumption list, the interview opens with the persona's situation and follows what they bring up. The output is the list of topics raised, in the persona's words, with the passage that grounded each, and the saturation trend across the panel. Ambiguity is kept; nothing is ranked. Use it when the question is "what is going on here", and the guided script when it is "what do we need to decide".

## Budget

One transcript is the five past-tense questions, one question per brief assumption the flow touches, and one pressure per decision the flow contains — nothing more. Each answer is a fast reaction of one or two sentences plus a considered answer of a short paragraph. A persona that elaborates beyond that is cut at the budget; length is not depth, and six long transcripts are what makes a run slow.

## Recording

One transcript per persona per run, `{YYYY-MM-DD}-{slug}-transcripts/run-{n}-P{nn}.md`, with per question: the question, the passages attached (or none), the persona lines it rests on, the fast reaction, the feeling with strength and trigger, the considered answer, the adversary line when the stance asks for it; then the decision simulation with each pressure and its effect; then the walk's step records as lists (the table in `walkthrough.md` is the field list, not a layout); then the topics raised; then the interviewer's notes on grounding failures and slop flags. Never in the brief.
