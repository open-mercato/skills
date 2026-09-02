# The context gate (step 2)

What `om-discover` checks before it writes anything, and what it hands back when material is missing. The gate exists because before Intake there is no repository to verify claims against: without it the agent fills the brief with plausible fiction.

## 1. Inventory the material

Read, in this order, and record what each source can support:

| Source | Where | What it can support | Tag |
|---|---|---|---|
| Interview notes, workshop exports, decision records | the research directory (`--research`, default `${SPECS_DIR}/research/`) | problems, users, stakeholders, rules, decisions, quotes | `[INTERVIEW]`, `[DOCUMENT]` |
| Data extracts (support tickets, analytics, sales notes, CSV/JSON exports) | the research directory | frequency, cost, baselines, segments | `[DATA]` |
| The repository | agent instruction files, README, specs, `.uxproof/`, `BACKWARD_COMPATIBILITY.md`, schema and routes | what exists, constraints, current flows, glossary | `[PRODUCT]` |
| The tracker (read-only, when a descriptor exists) | **search-issues**, **search-prs**, **get-issue** | tickets already filed, specs in flight, support history | `[DOCUMENT]` |
| Benchmarks | links the user provides or the agent finds, with the date checked | competitor behaviour, patterns, gaps | `[BENCHMARK]` |
| Persona walkthroughs, simulated interviews | `om-synthetic-users` reports under `{research}/walkthroughs/` | hypotheses only | `[SYNTHETIC]` |

Recognise material by content, not by filename: a file named `interview.md` with two bullet points is not an interview; a `notes.txt` with a dated conversation is.

## 2. Map material onto the brief

For every section of `references/brief-template.md`, record one of:

- **has material** — name the files; the section is written in step 4 with tags and source pointers;
- **thin** — one source, or a source that supports part of the section; written, with the coverage line naming it thin;
- **none** — no source at all; the section goes on the collection plan and is **not written**.

The ticket-level items of the Definition of Ready (`SDLC.md`) — the problem and who has it, the expected outcome and its check, what is out of scope, blocking questions, confirmed assumptions — must reach *has material* with a source that is not `[SYNTHETIC]` or `[ASSUMPTION]` before `om-prepare-issue` or a backlog can start from the brief. Say this in the report when it is not yet the case.

## 3. The collection plan

For every *none* section, and for every *thin* one the user wants stronger, write one entry:

```markdown
### {brief section}

- **What we need to know:** {the question the section answers}
- **Who can answer it:** {role, not name — e.g. "two developers who tried the current workflow this month", "the client's operations lead"}
- **How:** {interview | workshop block | data request | benchmark check} — {the specific ask, e.g. "export of support tickets tagged billing, last 90 days"}
- **Owner and by when:** {the human who books or requests it; a date}
- **Template:** `{research}/templates/{interview-note|workshop-export|data-request|decision-record}.md`
```

Hand out the capture templates below by writing them into `{research}/templates/` when they do not exist yet — the material has to land in the repository, because the agent cannot read chat threads or whiteboard tools. Then stop for those sections: the run's report lists them under `Collection plan:` and the brief header's coverage line counts them as missing.

## 4. When the user chooses to continue without material

The user may say "write it anyway from what we believe". Then the section is written from `[ASSUMPTION]` claims only, each with a test in the assumption map, the coverage line says how many sections rest on assumptions alone, and the brief's Definition of Ready addendum states that those sections do not satisfy the ticket-level tier until material replaces them. The choice is the user's; the honesty about it is not optional.

## Capture templates

`interview-note.md`:

```markdown
# Interview — {role}, {date}
- Situation the person was in when the problem showed up:
- What they did about it, step by step:
- What it cost them (time, money, risk), in their words:
- What they tried before, and why it was not enough:
- What would make them say the problem is gone:
- Verbatim quotes worth keeping (mark each as quote):
- What they explicitly did not care about:
- Interviewer's own remarks (kept separate from what was said):
```

`workshop-export.md`:

```markdown
# Workshop — {date}, {who was in the room, by role}
- Decision the session had to produce:
- Decider:
- Per stakeholder: expectation, definition of success, main worry:
- Constraints and appetite (budget, deadline and its origin, legal, organisational):
- Systems and data landscape:
- As-is process: front stage, back stage, handoffs, pain points with frequency and cost:
- Requested features → the problem behind each, its evidence, the outcome:
- Parking lot:
- Decisions taken (who, what, why):
- Open questions, blocking or not:
```

`data-request.md`:

```markdown
# Data request — {what}, requested {date}
- Question it answers:
- Source system and owner:
- Filter and period:
- Format and where to drop it (this directory):
- Personal data present? How it is reduced before it lands here:
```

`decision-record.md`:

```markdown
# D{nn} — {decision in one line}
- Date, owner:
- Context and the options weighed:
- Decision and why:
- Consequences, and what would make us revisit it:
- Status: active | superseded by D{nn}
```
