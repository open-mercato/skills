# Product brief template

The one file `om-discover` writes: `${SPECS_DIR}/product-brief.md`. Every section keeps its heading even when its body says "on the collection plan" or "not applicable in this mode" — humans and skills key on the structure. One claim per line, each with its evidence tag and source. Identifiers (`D01`, `R01`, `N01`, `A01`, `Q01`) are stable for the life of the brief: entries are superseded, never renumbered or deleted. Status vocabulary for rules, non-goals, and decisions: `active` (owned and in force), `proposal` (no human has put their name to it yet), `superseded` (replaced by a later id).

```markdown
# {Product name} — product brief

- Date: {YYYY-MM-DD} · Mode: {existing | client | own} · Owner: {role or name}
- Coverage: {n} claims — {a} sourced (interview {i}, data {d}, document {c}, product {p}, benchmark {b}), {s} synthetic, {u} assumed; {k} entries on the collection plan
- Definition of Ready signed by: {product owner (name) | client decider (name) | team, riskiest assumption tested/accepted | not yet signed — {what is missing}}
- Sources: {list of research files and repository paths this brief rests on}

## Vision

{One sentence: for whom, what changes, why it matters.} `[tag]` {source}

## Target group and stakeholders

- Customer (pays): … `[tag]` {source}
- User (uses): … `[tag]` {source}
- Stakeholders (decides, blocks, operates): … `[tag]` {source}
- Decider for scope decisions: {name and role}      <!-- mandatory in client mode -->

## Problems, with evidence

- {problem} — who has it, how often, what it costs `[tag]` {source}

## Product and how it stands out

- What it is: … `[tag]` {source}
- What makes it different: … `[tag]` {source}
- Benchmark: | reference | what it does well | where it falls short for our users | checked on | link |

## Goals and success criteria

- Business goal: {measurable, with a date} `[tag]` {source}
- User outcome: {observable behaviour that means the problem is gone} `[tag]` {source}
- Primary metric, baseline today, threshold, date: … `[tag]` {source}
- What must not get worse: …

## Scope

- **Now:** {the smallest coherent product that completes one real job end to end}
- **Later:** …
- **Not doing:** see Non-goals

## Domain glossary

| Term | Meaning | Owned by | Visible to |
|---|---|---|---|

## Key flows

- Current state: {flow name} — {steps, pain points} `[tag]` {source}
- Future state: {flow name} — {steps}; a step a source decided carries that source's tag, the rest is `[ASSUMPTION]` until a prototype is walked

## Business rules

| Id | Rule | Applies to | Source | Owner | Status | Review by | Required path to change |
|---|---|---|---|---|---|---|---|
| R01 | … | … | `[tag]` {source} | {name} | active | {date} | {who approves; a superseding row} |

## Non-goals

| Id | We are not building | Why | Owner | Status | Review by | Required path to change |
|---|---|---|---|---|---|---|
| N01 | … | … | {name} | active | {date} | {who approves; a superseding row} |

## Decisions

| Id | Date | Decision | Why | Owner | Status | Review by | Required path to change |
|---|---|---|---|---|---|---|---|
| D01 | … | … | … | {name} | active | {date} | {who approves; a superseding row with the old id in "supersedes"} |

## Riskiest assumptions

| Id | Assumption | Importance | Evidence today | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|---|---|
| A01 | … | high / medium / low | none / weak / some, with the tag | … | … | … | … | untested / accepted untested (D{nn}, checked by …) / held / refuted |

Importance and Evidence together are the assumption map: the important-and-unproven corner is tested first, and in `own` mode every entry there needs a test, an owner, and a date or a recorded decision to build without it.

## Kill criteria

{`own` mode: the result that makes the team stop, with the date it is checked and who calls it. Other modes: "not applicable in {mode}".}

## Hypotheses to test

{Everything tagged `[SYNTHETIC]`: the barriers, missing cases, and contradictions a persona walkthrough reported, each paired with the interview or data request that would confirm or refute it. Pulled in on `--refresh` from the walkthrough reports under the research directory.}

## Open questions

| Id | Question | Blocking | Who can answer | Status |
|---|---|---|---|---|
| Q01 | … | yes/no | {role} | open |

## Definition of Ready addendum ({mode})

{existing: migration and rollback path; affected screens and user groups. client: decider's sign-off on scope and anti-goals. own: the riskiest assumption's test result, or the recorded decision to build without it.}

## Collection plan

{Sections still waiting for material, with who, how, owner, and date — copied from the gate.}
```

## Reading rules for other skills

- `om-brainstorm` reads Vision, Problems, Scope, Non-goals, and Decisions in its Frame step, so a brainstorm never re-litigates a decision that has an owner.
- `om-spec-writing` reads Problems, Goals, Business rules, Domain glossary, Key flows, Assumptions, and Open questions; blocking open questions and `[ASSUMPTION]`-only problems become spec Open Questions.
- `om-prepare-issue` reads Problems, Target group, Goals, Non-goals, and Open questions to fill the ticket-level tier of the Definition of Ready, and cites the brief's ids where a decision or a non-goal bounds the ticket.
- `om-code-review` and `om-ux-review-pr` treat Non-goals, Business rules, and Decisions as a protected contract (per `SDLC.md`): a change that contradicts an active entry without a superseding row in the same PR is a blocker. Supersede, never delete; the old row stays with status `superseded` and the new row names it.
