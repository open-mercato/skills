# om-discover

> 🧑‍💻 Interactive — acts once, may ask questions, reports, and hands control back

Runs the product-level discovery and define session that comes before `om-brainstorm` has anything to route. Its primary artifact is `product-brief.md` in the specs directory, which the other skills read: the problem and who has it, stakeholders, domain rules, key flows, a benchmark, success criteria, scope (now, later, not doing), business rules, non-goals, decisions with owners, the riskiest assumptions with tests, and open questions marked blocking or not. It runs in one of three modes — existing product, client idea, own idea — because the truth lives in a different place in each. It gathers real material before writing: a section with no interviews, data, or documents behind it becomes a collection plan with capture templates, never prose. Every claim carries an evidence tag and a source; synthetic personas and assumptions never count as evidence; every decision carries a human's name. Use it for "discovery", "define the product", "write the product brief".

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{topic}` | No | The product, area, or idea to discover; when omitted the skill opens by asking. |
| `--mode existing\|client\|own` | No | The discovery mode; auto-detected from the repository and confirmed when omitted. |
| `--refresh` | No | Update an existing `product-brief.md`; decisions are superseded, never deleted. |
| `--research <dir>` | No | Where the raw material lives. Default `${SPECS_DIR}/research`. |
| `--quick` | No | A bounded first pass: one round of at most eight questions, inline skeptic, critical gate items only, ticket-level sections written and the rest on the collection plan. |

## Works with

Writes the brief that [om-brainstorm](om-brainstorm.md) reads in its Frame step, [om-spec-writing](om-spec-writing.md) reads for its Problem Statement and Open Questions, and [om-prepare-issue](om-prepare-issue.md) reads to fill the ticket-level tier of the Definition of Ready in `SDLC.md`. Its Non-goals, Business rules, and Decisions become a protected contract that [om-code-review](om-code-review.md) and [om-ux-review-pr](om-ux-review-pr.md) enforce, per `SDLC.md`. Loads the design contract from [om-ux-setup](om-ux-setup.md) when present. Tracker access is read-only; it never files, comments, or claims anything — its `Next:` line routes to the skill that does. After the brief is written it offers the next step itself, one yes/no at a time: another decision round when a blocking question is still open, otherwise the first *now* slice routed to the skill that fits it. Housekeeping (where the brief lands, who owns it) is settled in one line, never as a round question. Questions are asked in the user's language and in plain words, one concrete thing each with an example answer and the reason it is asked; the skeptic's findings come back the same way, never as severity labels.

---
*Source: [`skills/om-discover/SKILL.md`](../../skills/om-discover/SKILL.md)*
