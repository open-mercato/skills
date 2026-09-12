# Product brief template

Write `${SPECS_DIR}/product-brief.md` with the existing section headings intact. The added Decision summary is a short reading path, not a second copy of every rule. Use it to state the current choice, evidence limitations and consequential unknowns; link to canonical rows or sections for detail. Aim for 500 to 900 words at most, shorter when the material is thin. Do not fill space to meet a word target.

The detailed sections retain the contract used by other skills. Write each substantive claim once with its source tag and pointer; elsewhere use a brief cross-reference. The summary adds no claims of its own. Keep an empty optional section to one short deferral, retaining any required table headers without placeholder rows. Do not repeat that deferral in the final report or collection plan; create a collection request only when the missing material matters. Do not invent research to complete the template.

Keep ids (`D01`, `R01`, `N01`, `A01`, `Q01`) stable. Preserve existing rows and history; supersede decisions rather than deleting or renumbering them. Status for rules, non-goals and decisions is `active`, `proposal` or `superseded`. On refresh, retain existing table columns and append missing fields. A missing owner or review date stays explicit; never invent consent or a date.

```markdown
# {Product name} — product brief

- Date: {YYYY-MM-DD}
- Mode: {existing | client | own}; Owner: {role or name}; Pass: {full | Quick pass}
- Evidence basis: {independent source material and its limits; distinguish observations from team decisions; identify the most consequential untested belief}
- Coverage: {n} claims — {a} sourced (interview {i}, data {d}, document {c}, product {p}, benchmark {b}), {s} synthetic, {u} assumed; {k} entries on the collection plan
- Synthetic hypotheses outside Coverage: {count in Hypotheses to test; the legacy counter excludes this section}
- Definition of Ready signed by: {named appropriate owner | not yet signed, with what is missing}; ready for: {research | a named experiment | implementation planning of the stated scope}
- Sources: {paths to actual research and repository sources; do not repeat excerpts here}

## Decision summary

{The current decision and whether it is agreed or still proposed.}
{Who has the problem, the relevant observation and the present workaround; link to Problems and Target group.}
{What the user chose to do now and why; reference Scope and the relevant D/R/N ids.}
{The uncertainty or mismatch most likely to change that choice, including any gap between the observed need and the proposed solution; link to the relevant A/Q ids.}
{The next action, what it will tell us and who owns it. State unavailable dates or criteria as open rather than inventing them.}

## Vision

{For whom and what should change, in one plain sentence. Identify it as the team's intended direction, not a demonstrated benefit.} `[tag]` {source}

## Target group and stakeholders

- Customer (pays): {observed or chosen role; say which} `[tag]` {source}
- User (uses): {observed situation; do not generalize beyond its support} `[tag]` {source}
- Stakeholders (decides, blocks, operates): {only roles relevant to this decision} `[tag]` {source}
- Decider for scope decisions: {name and role, or a blocking question when required}

## Problems, with evidence

- {Observed problem, who experienced it, present workaround and known cost or frequency; say when only one account supports it.} `[tag]` {source}
- {Separate an inferred need or cause from the observed event; link consequential untested interpretations to A ids. When the direction is open, state the person, situation and desired outcome without prescribing a feature.}

## Product and how it stands out

- What it is: {one sentence, referring to Scope for details} `[tag]` {source}
- What makes it different: {only sourced comparisons, or an explicit hypothesis linked to an A id}

| reference | what it does well | where it falls short for our users | checked on | link |
|---|---|---|---|---|

{Only populate a benchmark when it informs the decision and was checked. Otherwise state why it is deferred.}

## Goals and success criteria

- Business goal: {chosen target, owner and rationale; reference the decision id}
- User outcome: {observable result addressing the sourced problem} `[tag]` {source}
- Primary metric, baseline today, threshold, date: {when relevant to the current choice; distinguish measured baseline from chosen target; unknowns stay explicit}
- What must not get worse: {only actual constraints relevant to this decision; link to their source or rule}

## Scope

- **Now:** {one complete job or clearly bounded proposed experiment; reference rules and decisions instead of restating them}
- **Later:** {deferred work and the relevant decision ids}
- **Not doing:** see Non-goals

## Domain glossary

| Term | Meaning | Owned by | Visible to |
|---|---|---|---|

{Include ambiguous terms needed to understand the current scope. Do not turn the glossary into a duplicate specification.}

## Key flows

- Current state: {observed steps and relevant friction} `[tag]` {source}
- Future state: {only the steps needed to understand Now; cite decided steps, label proposed steps as assumptions, refer to rule ids}

{A quick pass may use an existing flow. Without material, leave it deferred; do not create a flow for a synthetic-panel handoff.}

## Business rules

| Id | Rule | Applies to | Source | Status | Review by | Required path to change | Owner | Supersedes |
|---|---|---|---|---|---|---|---|---|
| R01 | {one rule} | … | `[tag]` {source or linked decision} | active / proposal | {date or explicit trigger; unknown if unset} | {who approves a superseding row} | {name or pending} | {id or none} |

## Non-goals

| Id | We are not building | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|
| N01 | … | … | {name or pending} | active / proposal | {date or trigger; unknown if unset} | {who approves a superseding row} | `[tag]` {source} | {id or none} |

## Decisions

| Id | Date | Decision | Why | Owner | Status | Review by | Required path to change | Source | Supersedes |
|---|---|---|---|---|---|---|---|---|---|
| D01 | … | {choice or adoption of a rule id} | {reason; include a relevant alternative actually considered when the approach was open; identify an accepted agent recommendation when applicable} | {name or pending} | active / proposal | {date or trigger; unknown if unset} | {who approves a superseding row} | `[tag]` {source} | {id or none} |

## Riskiest assumptions

| Id | Assumption | Importance | Evidence today | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|---|---|
| A01 | … `[ASSUMPTION]` {origin or no material} | high / medium / low | {what is observed, with references; separate beliefs} | {what decision changes} | {learning question, action, observable result and limits; choose the form to answer the question} | … | {date, review point or unknown} | untested / accepted untested (D{nn}) / held / refuted |

{Treat a recorded acceptance as permission to take the risk, not as evidence that the assumption held.}

## Kill criteria

{For the current experiment or product decision: what result prompts stopping or reconsidering, when, and who decides. Distinguish an observed outcome from a stated intention. If undecided, name that gap. If irrelevant to this decision, say why.}

## Hypotheses to test

{Canonical `[SYNTHETIC]` claims only, with their source walkthrough and the real interview or measurement needed to check them. This section is excluded from legacy Coverage and counted separately in the header.}

## Open questions

| Id | Question | Blocking | Who can answer | Status |
|---|---|---|---|---|
| Q01 | … | {yes/no and the specific decision or work blocked} | {role} | open |

{Keep closed ids and their resolution concise. Optional later questions do not block unrelated current work.}

## Definition of Ready addendum ({mode})

{Apply the selected mode's relevant requirements. State whether Problems and Target group have actual support, which Now decisions remain open, and what work is ready. A provisional experiment or risk acceptance does not automatically make implementation ready.}

## Collection plan

{Only material requests needed for the current decision or an explicit follow-up, with who, how, owner and timing when known. Deferred optional headings are not entries.}
```

## Reading rules for other skills

- The summary is optional in legacy briefs. Read the canonical sections for decisions, evidence and readiness; follow internal ids and section links without assuming the summary is complete.
- `om-brainstorm` reads Vision, Problems, Scope, Non-goals and Decisions; respect active choices while keeping the evidence behind them separate.
- `om-spec-writing` reads Problems, Goals, Business rules, Domain glossary, Key flows, Riskiest assumptions and Open questions. Unsupported factual claims remain questions even when the team chose to proceed.
- `om-prepare-issue` and `om-backlog` read their existing sections. Check source relevance to Problems and Target group, not the total Coverage count or the presence of a decision record. Proposed experiments and unresolved consequential questions must not be relabeled as implementation-ready stories.
- `om-code-review` and `om-ux-review-pr` keep treating active Non-goals, Business rules and Decisions as the protected contract. Changed choices need owner-approved superseding rows; retain old ids and statuses. New ownership/source fields are additive, and old tables remain readable through their existing cells and linked records.
