# Product brief template

The one file `om-discover` writes: `${SPECS_DIR}/product-brief.md`. Every section keeps its heading even when its body says "on the collection plan" — humans and skills key on the structure. One claim per line, each with its evidence tag and source. Identifiers (`D01`, `R01`, `N01`, `A01`, `Q01`) are stable for the life of the brief: entries are superseded, never renumbered or deleted.

```markdown
# {Product name} — product brief

- Date: {YYYY-MM-DD} · Mode: {existing | client | own} · Owner: {role or name}
- Coverage: {n} claims — {a} sourced (interview {i}, data {d}, document {c}, product {p}), {s} synthetic, {u} assumed; {k} sections on the collection plan
- Definition of Ready signed by: {product owner | client decider (name) | team, riskiest assumption tested/accepted}
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
- Future state: {flow name} — {steps} `[ASSUMPTION]` until a prototype is walked

## Business rules

| Id | Rule | Applies to | Source | Status | Required path to change |
|---|---|---|---|---|---|
| R01 | … | … | `[tag]` {source} | active | {who approves; a superseding row} |

## Non-goals

| Id | We are not building | Why | Owner | Status |
|---|---|---|---|---|
| N01 | … | … | {name} | active |

## Decisions

| Id | Date | Decision | Why | Owner | Status | Required path to change |
|---|---|---|---|---|---|---|
| D01 | … | … | … | {name} | active | {who approves; a superseding row with the old id in "supersedes"} |

## Riskiest assumptions

| Id | Assumption | If false | Smallest test | Owner | By when | Result |
|---|---|---|---|---|---|---|
| A01 | … | … | … | … | … | untested |

## Hypotheses to test

{Everything tagged `[SYNTHETIC]`: the barriers, missing cases, and contradictions `om-synthetic-users` reported, each paired with the interview or data request that would confirm or refute it. Pulled in on `--refresh` from the walkthrough reports under the research directory.}

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
- `om-prepare-issue` reads Problems, Target group, Goals, Non-goals, and Open questions to fill the ticket-level tier of the Definition of Ready.
- Review skills that check protected surfaces treat Non-goals, Business rules, and Decisions as a contract when the repository says so in `SDLC.md`.
