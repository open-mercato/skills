# om-discover

> Interactive: reads available material, asks about consequential unknowns, and records the user's choices.

Use `om-discover` to establish or refresh product context: who has the problem, what the evidence supports, what to do now, and what could change that decision. It writes `product-brief.md` in the configured specs directory. A short Decision summary opens the brief; detailed sections preserve source references, business rules, non-goals and decision history for later skills.

The conversation normally asks two or three independent questions at a time. Questions about real experiences and the supplied interview-note fields leave room for a successful current approach or no problem at all. Recommendations are used for decisions when the alternatives and their tradeoff are clear. You can describe an event, answer “I don't know”, or stop with a collection plan. Missing optional details do not automatically become research tasks.

The brief distinguishes observations, decisions and hypotheses. Choosing a segment or accepting a risk does not prove demand. Its Coverage line preserves the existing tagged-line count for compatibility; the source summary describes independent material and important limitations. Synthetic hypotheses remain separate and never establish implementation readiness.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{topic}` | No | Product, area or idea. If absent, the skill asks what the brief is for. |
| `--mode existing\|client\|own` | No | Discovery context. Otherwise inferred and confirmed with the opening decision frame. |
| `--refresh` | No | Update the existing brief, retaining ids and superseded decisions. |
| `--research <dir>` | No | Raw material directory. Defaults to the research folder within the configured specs directory. |
| `--quick` | No | One small interview round and an inline skeptical check. Uses available material and keeps the same evidence, coherence and compression checks. Further questions require choosing to extend the session. |

## What to expect

Start with the decision you need to make and any available material. The skill reads before asking, uses the mode to identify relevant concerns, and keeps the current decision in view. It can capture a direct personal account or a confirmed choice so the brief has a durable source. It does not invent measurements or mark a proposal active without confirmation.

The final report gives the decision, its basis, the important uncertainty and the next action in a few paragraphs. It links the detail instead of repeating it. The brief retains the existing section headings and source tags. Full rule wording has one canonical home; other sections refer to it. The Decision summary aims to stay under 900 words and is much shorter when little is known. An incomplete brief says what it supports next, such as collecting evidence or choosing an experiment, instead of claiming readiness to implement.

When the direction is open, the conversation connects a real situation to the desired outcome and compares relevant ways to achieve it. It keeps interpretations separate from observations and records the choice in the existing brief. A proposed prototype answers a specific learning question. These methods fit within the usual rounds and existing brief sections.

## Works with

The existing sections remain readable by [om-brainstorm](om-brainstorm.md), [om-spec-writing](om-spec-writing.md), [om-prepare-issue](om-prepare-issue.md) and [om-backlog](om-backlog.md). The summary is optional for older briefs. Readiness depends on relevant source support and resolved consequential choices, not the aggregate Coverage count.

After confirmation, the skill offers the next useful action. A ready brief can go to a backlog dry run. An optional [om-synthetic-users](om-synthetic-users.md) panel requires a concrete Key flow; its output enters the brief through a confirmed refresh. Without a flow, the panel is skipped. A running-product check passes `--app`; a brief walkthrough is explicitly narrative. The selected flow and research directory are passed with the handoff. After a completed panel, an optional [om-mockup-prototype](om-mockup-prototype.md) handoff can make the chosen flow clickable. A screen walkthrough requires a verified prototype and separate authorization. Findings enter the brief through one confirmed refresh; declining an update leaves the brief unchanged. Companion skills run only when authorized. `Next:` names an authorized action still waiting to run; declined, unaccepted and completed actions yield `none`. A completed backlog dry run does not authorize issue filing. On refresh, new tracker decisions enter before drafting and review. Tracker access is read-only, and this skill does not commit or publish files.

---
*Source: [`skills/om-discover/SKILL.md`](../../skills/om-discover/SKILL.md)*
