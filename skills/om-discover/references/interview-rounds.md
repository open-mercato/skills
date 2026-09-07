# Interview rounds (step 3)

How `om-discover` asks. The body's rules are the contract; this file is technique.

## Sources before questions

The ladder, in order: the research directory → the repository → the tracker (read-only, when available) → benchmarks the user points at → the user. Check which revision the material describes before treating a discrepancy as current. Ask the user directly for unavailable facts, their experiences, motivation, appetite, constraints, priorities, taste, and decisions. A factual inconsistency with a clear authority is a finding to report, not a policy choice for the user to approve; when sources conflict and neither is authoritative, ask who can settle the fact. Report corrections for the implementation hand-off; discovery's write surface stays unchanged.

Choose the question's form from what is missing:

| What is missing | How to handle it |
|---|---|
| A fact available in the material, repository, or tracker | Read and cite it. Do not spend a round question asking the user to repeat it. |
| An unavailable fact or a person's experience | Ask neutrally, about a concrete situation or the last occurrence. Do not suggest an answer, a cause, or a preferred outcome. |
| A preference or decision | Present viable options and their consequences. Recommend only when the known goals and constraints support a choice; state that basis, its trade-off, and when another option would fit better. |
| A decision whose recommendation depends on an unknown fact | Ask for that fact first. Keep the decision for a later round, or label any alternatives as conditional; do not present one as the settled default. |

Separate the current situation from the desired policy. Naming a role is not deciding its responsibilities; assigning a reviewer is not deciding when review is required. Split a question when its parts can have different answers.

## Frontier rounds

Map the brief as a tree of questions: every settled answer opens the questions that depended on it. The **frontier** is every question that can be asked now without guessing at an answer not yet heard. Ask the frontier in one round, numbered, at most eight questions — when the frontier is larger, ask the eight that unblock the most brief sections and carry the rest to the next round. Use the appropriate form above; recommendations are not a required field. Wait for the user. Recompute the frontier and ask the next round. A question whose answer depends on another still open in this round belongs to a later round. Two rounds are the norm, three the ceiling unless the user asks for more; what is still open after that goes to the collection plan or the open questions, not to a fourth round.

Format a round like so, in the interviewer's voice from `references/voice.md` (plain words, the user's language, one concrete thing per question):

```
**Q1 — {plain title, six words or fewer}.**
Why I ask: {one line pointing at what in the material raised it}
Question: {an open question for an experience, or two or three named options with consequences for a decision; show a neutral answer shape only when helpful}
My suggestion: {optional, decisions only: the choice, its basis, the condition under which it fits, and the trade-off or condition favoring another option}
If you don't know yet: {what goes on the collection plan, and who could answer}

**Q2 — …**
```

Omit `My suggestion` for factual and experience questions, unsupported choices, and skeptic CRITICALs. The evidence tier the answer carries is recorded by the agent when the answer comes back; it is not vocabulary for the question. A user's approval is evidence of their decision, not proof of the recommendation's claims about users or the current process. Before the round goes out, run the self-check in `references/voice.md`.

A question that carries a skeptic CRITICAL finding is asked without a recommendation — recommending an answer to it is resolving it.

When a frontier question needs a fact from the material or the repository, look it up before the round (a sub-agent may do it while the round runs); do not block the rest of the frontier on it, and never ask the user for a fact you could read. When a proposed choice rests on an assumption, name the assumption and how a different answer would change the choice; the user may explicitly accept that uncertainty, but the assumption keeps its tag.

Every recommendation carries a meaningful trade-off or counter-argument, in every mode. In `own` mode, also check whether the question presumes the team's idea is needed; ask about the problem and what would disprove it without suggesting the desired result.

Keep factual corrections, terminology choices, and changes to acceptance or responsibilities distinct in the decision summary. A batch confirmation is valid for explicit independent choices with their consequences shown; it cannot close unanswered prerequisites or turn the agent's entire analysis into confirmed facts. An unanswered decision stays open or `proposal` under the existing ownership rules.

## Housekeeping before the round

Four things are settled in one plain line each, before Q1, and never take a seat among the eight:

- the mode: detected and confirmed in workflow step 1, before the context gate;
- where the brief lands: `SPECS_DIR` from the config, `.ai/specs` without one (never a question);
- who owns the brief: the person running the session, confirmed with the final yes in step 7;
- a missing name: when the material says "both founders" or "the team" and only one name is known, ask "Who is the second founder?" without a recommendation or a counter-argument.

## The round ends when

- every brief section either has content with a tag, or sits on the collection plan;
- every decision the brief will carry has a named human owner, or the user has declined to name one and the decision is written as a `proposal` with a blocking question;
- no blocking open question is left unanswered by the person who can answer it;
- the user signals enough — depth is their call, not the skill's.

Depth follows risk: a small, reversible product decision gets one short round; a client workshop or a new product gets as many as the material supports. The gate is the collection plan, not the number of rounds.

## Question ladders per mode

**`existing`.** What is the goal and the metric with today's baseline? What must not change (flows, data, integrations, SLAs)? Which users and screens are touched, and which are not? Which compatibility surfaces from `BACKWARD_COMPATIBILITY.md` are in play, and what is the migration and rollback path? What does the data say about how the current flow is used, and what does support say about where it hurts?

**`client`.** What decision must this session produce? Who decides, who pays, who uses, who can block? What does each of them call success, and where do those definitions disagree? What are the appetite and the deadline, and where does the deadline come from? Which systems exist, what must we integrate with, who owns the data? How does the process run today — front stage, back stage, handoffs — and which pain points cost the most and happen most often? For every feature on the client's list: which problem, what evidence, which outcome? Which of the requested features survive that reframing? What must not get worse? What is the pilot group and what happens to the old process?

**`own`.** What is the vision in one sentence, and what change does it bring about? Who has the problem, and how do we know beyond ourselves? What are the three assumptions that, if false, make the product pointless — and what is the cheapest test for each? What result makes us stop? What is the one metric, the threshold, and the date? What are we deliberately not building?

**Common to all modes.** The domain glossary (the nouns and their owners). The business rules the product enforces and where they come from. The current and future key flows. The non-goals. The open questions, each marked blocking or not, each with the person who can answer it.
