# Check the material

Read before drafting. The goal is to learn what supports the current decision, what could change it, and what still needs to be collected.

## 1. Inventory relevant sources

| Source | Where | What it can support | Tag |
|---|---|---|---|
| Interview notes and direct accounts | research directory; a participant's account captured during this session | the person's experience or stated preference, within that account's limits | `[INTERVIEW]` |
| Data extracts | support, analytics, sales or other research exports | measured frequency, cost, baselines and segments, with source, period and filter | `[DATA]` |
| Workshop and decision records | research directory | choices, constraints and their owners; separate observations from beliefs | `[DOCUMENT]` |
| Repository | README, specs, design contract, compatibility surfaces, relevant schema and routes | what exists or was specified; never demand by itself | `[PRODUCT]` |
| Tracker | read-only **search-issues**, **search-prs**, **get-issue**, **list-issue-comments** when configured | existing work, support accounts and recorded decisions | `[DOCUMENT]` |
| Benchmarks | provided or discovered links checked on a date | reference behaviour relevant to this decision | `[BENCHMARK]` |
| Synthetic walkthroughs | research walkthrough reports | hypotheses and missing cases only | `[SYNTHETIC]` |

Read enough of each source to assess what it actually supports. A filename or source tag is not proof. Identify copies of the same source and state where provenance or independence is unknown. Follow `references/evidence-tiers.md` for the distinction between observations, decisions and hypotheses.

## 2. Map support and consequential gaps

Keep existing brief headings. For each, choose:

- **Supported:** write the relevant claim and source, within the source's actual scope.
- **Partial:** write only what is supported and identify the unresolved part. A single account can support that person's experience without proving a segment-wide pattern.
- **Needed but missing:** put the specific material request on the collection plan. State which decision or work it blocks.
- **Deferred:** the missing detail does not affect the current decision. Keep a short reason under the heading; do not create a research task merely to fill it. An explicit user request for deeper research may make it relevant.

For ticket-level readiness, Problems and Target group need relevant support from tiers 1 to 5, not simply a file containing the team's choice or an assumption. Expected outcome and its check, owned scope exclusions, and confirmed decisions required by Now must be present. Blocking questions remain blockers until the right person answers. Name what the brief is ready for: collecting evidence, deciding an experiment, or implementation planning. Acceptance of an untested risk cannot substitute for evidence of the problem and users.

## 3. Record what the session actually provides

Use existing material before asking. When the participant describes a personal experience that is absent from the sources, you may save a concise dated account under `${research}/interviews/`, using the interview-note shape below. Keep their words separate from your interpretation, attribute the role, and state the limits of the account. A belief about other people is an assumption, not an interview finding about those people. Quote only words actually supplied. Reflect back any consequential ambiguity before using it.

Record an agreed vision, scope, target, rule or non-goal under `${research}/decisions/`, naming the human who confirmed it. Preserve whether it began as the agent's recommendation. A statement of belief can accompany that decision without becoming an observed fact. Unconfirmed choices stay proposals in the draft; do not invent an active decision record for them. A single captured choice may be referenced by multiple rows without repeating its full prose.

These accounts and confirmed decision records may be written before the final brief confirmation because they preserve supplied material. They contain only what the user supplied or agreed, with interpretation clearly separated. They do not authorize writing or publishing a complete product brief before step 7.

## 4. Collection plan

Create one entry per consequential missing piece of material, combining requests when the same interview or export answers them. Do not invent interview quotas, deadlines or owners to complete this shape.

```markdown
### {question the material must answer}

- What decision or work needs it: {specific choice or blocker}
- Who can answer it: {role, with relevant experience}
- How: {specific interview, workshop, data request or benchmark check}
- Owner and by when: {confirmed person and date or review point; otherwise unknown}
- Template: `{research}/templates/{interview-note|workshop-export|data-request|benchmark-check|decision-record}.md`
```

Write only the referenced capture templates that do not already exist. Reuse supplied files, accessible exports or material captured in this conversation; do not ask the user to transcribe facts the agent can read. The plan and final report state which requests block which next steps. A collection plan is a useful outcome even when no brief can yet be written.

## 5. Continuing with assumptions

If the user explicitly chooses to proceed from beliefs, draft those as `[ASSUMPTION]`, with the consequential ones in Riskiest assumptions. Say what would test them, or leave the test decision open. A user's acceptance is a decision about risk, not evidence. The summary and readiness addendum preserve that limit. Do not extend the interview merely to turn every unknown into a formal decision.

## Capture templates

`interview-note.md`:

```markdown
# Interview — {role}, {date}
- Recent situation or task the person described:
- What they did, step by step:
- What worked, what did not, and any consequences they described:
- Other approaches they tried and how those worked:
- The outcome they were trying to achieve and what happened:
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

`benchmark-check.md`:

```markdown
# Benchmark — {reference product}, checked {date} by {role}
- Link:
- What it does for our users' job, in one paragraph:
- What it does well:
- Where it falls short for our users:
- Pricing or model, as shown on the date checked:
- Screens worth keeping as references (paths beside this file):
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
