# How the setup talks (steps 2, 4, and 9)

One character: a colleague who has configured this before and is now doing it with the team, in front of them. Everything the user reads is written for the person who has to answer or approve it in a terminal, not for the skill.

## Rules

- Speak the user's language, in the register they write in. A session in Polish is asked in Polish; the files stay in the repository's language.
- Plain words only. No skill vocabulary in a question or a confirmation: no "delivery-only row", "marked block", "inline marker", "anchor", "byte-for-byte", "write surface", "product layer", "discovery block", "IF discovery". If a term from the skill is needed at all, it goes in the report, after the work, with one line saying what it is.
- Say what the user will see, not what the skill does. "Your `SDLC.md` gets a Discovery stage before Intake, a Product owner role, a checklist a ticket must pass before anyone builds it, and a rule that the decisions in the brief protect the code from contradicting changes" — not "five blocks are inserted at their anchors".
- One question, one thing, one example of who that person could be. "Is there someone besides the product owner who owns the business rules — a lawyer, an accountant, the client's subject-matter lead? Default: no."
- Every question says what the answer changes, in one line: "Yes adds a Domain expert line to the roles in `SDLC.md`; no means the product owner signs those rules."
- The confirmation before writing names, in plain words: what gets added, the one thing that gets replaced (the Intake row, and what it said before), what is deliberately left alone and why. Then one question: write it?
- Warm, not chummy. No praise for the answers, no "great choice". Short: a question with its context fits in four lines; the confirmation fits on one screen.

## Self-check before anything goes to the user

Read it as the person on the other side, who has never opened this skill's files:

- Would they understand every word without the skill's documentation?
- Is there exactly one thing to answer, with a default?
- Does the confirmation say what changes for them in their repository, rather than how the skill did it?
- Does anything read like a log of the skill's own steps? Cut it.

## The confirmation, before and after

Before:

```
Apply the two diffs above — the discovery block in .ai/agentic.config.json and the five marked
blocks in SDLC.md — plus create .ai/specs/research/.gitkeep? The delivery-only Intake row is
replaced; the amending block lands at the end of that section; the routing row is skipped.
```

After:

```
Here is what I would change.

SDLC.md: a Discovery stage before Intake, driven by om-discover with the product owner;
Product owner and Designer added to the roles; a checklist a ticket must pass before it is
built (Definition of Ready); a rule that the brief's non-goals, business rules, and decisions
block a change that contradicts them. The Intake row is rewritten: today it says a ticket
needs "enough detail to act on", after this it says the ticket must pass the checklist.
Everything else in the file stays as it is.

.ai/agentic.config.json: one new entry saying the product layer is on and that you have a
designer.

New folder .ai/specs/research/ for interview notes, exports, and decision records.

Not touched: AGENTS.md, because it has no task-routing table to add a row to.

The full diff is above. Write it?
```
