# Interview rounds (step 3)

Use the material to identify the decision this session needs to support. Ask about the unknowns that could change that decision. The brief records the result; its headings do not set the interview agenda.

## Sources before questions

Read the research directory, the relevant repository files, the tracker when available (read-only), and benchmarks the user points at. Ask the user for facts and decisions only they can supply. Do not ask them to repeat what a source already says. An answer of “we do not know” settles that gap for this session; reopen it only when new material or a correction changes what can be answered. When sources disagree, cite the disagreement and ask only about what you cannot resolve by reading.

Establish the current decision from the request and material before choosing questions. If it is unclear, start with one question, such as "What do you need to decide after this conversation?" A decision might be whether to investigate a problem, test an idea, narrow a proposed scope, or proceed with a known change. Do not assume that every session must justify building a product.

## Choose each round by its effect on the decision

Default to two or three independent questions. Ask one when its answer determines what to ask next. Use batches of up to eight only when the user explicitly prefers larger batches. A question whose answer depends on another unanswered question belongs in a later round.

Choose the questions whose answers could most change the target users, the problem, the decision to proceed, or the cost of being wrong. A question that would fill several sections is not necessarily important. Look up any available facts first, then ask only the remaining questions.

Distinguish two kinds of question:

- **Research:** ask what happened, what someone did, what it cost, or what supports a claim. Do not suggest an answer, attach a recommendation, or supply a numeric example. Let the user describe one real experience in their own words. If the answer format is unclear, a prompt such as "Start with the last time it happened" is enough.
- **Decision:** ask the authorized person to choose between known alternatives or set a constraint. When the evidence supports a recommendation, explain what it rests on and the actual tradeoff. Do not invent an option, a target, or a counterargument to complete a question format. Without a basis for recommending, present the choice plainly.

For example, a research question can be:

> The interview note describes a delay but not its effect. What happened the last time that person had to wait?

A decision question can be:

> The support notes show missed handoffs; the proposed scope also includes reporting. I suggest testing the handoff first, which leaves reporting for later. Do you want to limit this pass to the handoff?

Use a short context sentence only when it helps explain why you are asking. Add answer choices when there is a real choice. Add guidance about an unknown answer only when it changes the next step. Do not repeat labels such as "Why I ask", "Question", and "My suggestion" under every question. Number questions only when asking more than one.

Record the answer's evidence tier in the brief, not in the question. Accepting an agent recommendation creates a human decision; it does not create research evidence. Keep its origin visible. A question carrying a skeptic CRITICAL finding has no recommendation. Run the self-check in `references/voice.md` before sending the round.

## Frame the need and compare directions

When the need is unclear, use a recorded episode or ask for the last relevant case. Follow up only on the missing action, workaround or consequence that could change the decision. Read a supplied artifact or process trace when it helps. A teammate's account of someone else's experience keeps that attribution; inferred motives follow the evidence rules.

While the direction is open, frame the challenge around the person, situation and desired outcome. A question such as “How could we help this person achieve that outcome?” should leave room for different solutions. Use the user's words and actual constraints; do not require the phrase or a separate worksheet. Respect an explicitly chosen solution and assess its remaining risks instead of reopening the choice.

When choosing an approach matters, compare materially different ways to meet the need. Consider the current workaround or manual delivery when viable. Label agent ideas as proposals and check them against known constraints; do not invent supporting demand. Record the relevant alternative and the reason for the choice in the existing Decisions row. Do not impose an option quota, separate ideation workshop or extra round.

## Session limits and stopping

- `--quick` allows one substantive interview round. Use the material already available for the rest of the brief. Run the skeptic inline; fix your own drafting errors and record unresolved findings as open questions or collection work. Do not open another interview round unless the user asks to continue.
- A full session allows up to three substantive rounds in total, including any follow-up questions from the skeptic. Use fewer when the decision is clear. At the limit, record what remains unknown and its effect on readiness; ask further questions only if the user requests more.
- Final sign-off confirms the draft and the named owner. Do not use sign-off or "housekeeping" to hide another substantive round. Ask a missing identity only when needed to attribute a consequential decision; otherwise leave it a proposal.
- Stop interviewing when the current decision has enough support, when the next useful evidence needs to come from elsewhere, or when the user says enough. Empty optional headings do not justify more questions.

Depth follows the risk of the decision. A small reversible choice may need one question; a costly commitment may remain unready after three rounds. "We don't know" is a valid answer. Name the missing evidence, who can obtain it, and the decision it affects. Block dependent work only for a consequential missing decision or evidence required by the Definition of Ready. Correct your own wording, duplication, and source-link errors without asking the user to resolve them.

Use `SPECS_DIR` from configuration, or `.ai/specs` when absent, without asking where to save the brief. Reuse the mode established in step 1. Confirm ownership at sign-off without repeating settled facts.

## Question priorities by mode

These are prompts to select from, not a checklist to ask in full.

**`existing`.** Which decision is needed about the current product? Where does the current job fail, for whom, and what does the usage or support material show? Which unknown could make the proposed change ineffective or too costly? Once the direction is supported, inspect affected flows, users, data, and compatibility surfaces. Ask about migration, rollback, and service commitments only when the proposed change touches them.

**`client`.** Which decision must the session produce, and who can make it? What happened in a recent case of the costly problem? What do the requested features each solve, and which has evidence behind it? Resolve conflicting expectations or binding constraints that could change the direction. Examine systems, rollout, and operational requirements when they affect the chosen scope.

**`own`.** Who might have the problem, and what do we know about their actual experience? Which belief, if false, would change the decision to continue? What is the smallest useful test, or the provisional scope if the team chooses to proceed? Agree what observation would cause the team to stop or revise the idea. Use quantitative thresholds only when the material or the decision-maker supplies a reason for them; otherwise leave them open.

**All modes.** Clarify domain terms, business rules, flows, and non-goals when their meaning changes the current decision or constrains the next step. Reuse existing definitions and decisions. Put unresolved questions in the brief with the person who can answer them and whether dependent work must wait.
