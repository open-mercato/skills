# Simulated interview script (step 3)

How the agent interviews a persona. The questions come from the brief's Problems, Goals, and Riskiest assumptions; the answers come from the persona's lines only. A question the persona's material cannot answer is answered "no basis" and lands under *To confirm with real users*.

## Ask about the past, not the future

- "Tell me about the last time {the problem} happened. What did you do, step by step?"
- "What did that cost you — time, money, risk? What did you try before?"
- "Who else was involved, and who decided?"
- "What would have to be true for you to say the problem is gone?"
- "What did you not care about, that we might think you do?"

Never: "would you use", "would you pay", "do you like". Those produce compliments, and a synthetic persona produces them for free.

## Per assumption in the brief

For every `A0n` in the brief's Riskiest assumptions, one question that could refute it, asked as a story ("when did you last…"). The answer is tagged `[SYNTHETIC]` and paired with the real check that would settle `A0n`.

## Stance behaviour

- `validate` — the persona answers from what the running product or prototype actually showed them in the walkthrough, not from the brief's promises.
- `simulate` — every answer ends with *to confirm with: {role, question}*; the consolidated interview plan is the deliverable.
- `adversary` — after each answer the persona adds "and here is why I would still not switch"; the objection must come from the persona's material or be marked assumption. An interview with no objections is re-run with the persona instructed to refuse the product.

## Recording

Per persona, per question: the question, the answer as the persona, the tag, the persona lines it rests on, and the real check. Kept in the walkthrough report, never in the brief.
