# Issue body and final report

The issue is the durable explanation. Aim for 150–300 words for substantive
work, less for a small fix; retain necessary evidence and acceptance criteria
when they need more. Omit unused optional sections and do not repeat a linked
spec. The ticket-level Definition of Ready in `SDLC.md` is required: problem,
user, checked outcome, explicit non-goals, classified open questions, and human
confirmation of any autonomous assumptions. A spec cannot supply missing human
input.

## Issue body (step 5)

```markdown
## 🎯 Change

{Who encounters what problem, and what should become possible. For a bug,
describe reported behavior → expected behavior and say what you verified.}

## 📋 Scope

{Affected area and smallest proposed change. State explicit non-goals from the
user or product brief. Mention shared components, permissions, stored data, or
public contracts only when material.}

## ✅ Done when

- {Observable outcome proving the request is met.}
- {Relevant regression, permission, or failure case.}

## 📝 Spec

{Covering spec and PR link, or the gap that the new spec must resolve.}

## 🔍 Implementation notes

{Only without a covering spec: real entry points, likely mechanism marked as
a hypothesis when unverified, and a few testable implementation steps. For a
repository with no product code, say so; cite brief ids and acceptance criteria,
and name the brief or spec as design authority instead of inventing paths.}

## ⚠️ Open questions

{Each unresolved question — blocking / non-blocking. If none remain, state that
only when the human input confirms it. Include any autonomous assumption and
its human-confirmation status; an unconfirmed one prevents readiness.}

{Material protected contract and required migration/deprecation path, when any.
Do not call a hypothesis a confirmed defect.}
```

Use the user brief and, when present, `${SPECS_DIR}/product-brief.md` from
`om-discover`: Problems, Target group, Goals, Non-goals, and Open questions.
Cite ids such as `D03` or `N01` when they bound the ticket. For a missing problem,
user, outcome, or scope decision, write "unknown" and mark the question blocking;
do not invent an answer or omit the field to make the ticket appear ready.

A handoff brief's problem, direction, resolved unknowns, and non-goals must all
survive in the issue, in collapsed detail when substantial. Use a small Mermaid flow only
when it explains reach or behavior better than prose; distinguish observed from
proposed connections. Attach supplied images with captions under `## 📸 Evidence`.

## Final report (step 6)

Usually 3–6 lines plus the contract lines:

```markdown
✅ `om-prepare-issue` filed {title}: {the requested outcome in one sentence}.
{When reused: existing issue and new detail added or awaiting confirmation.}
{When relevant: missing ticket-level input or unconfirmed assumption, spec status, or evidence-upload failure.}
Next: {useful next action and matching skill invocation when helpful}.
```

Link the issue for its explanation and label rationale. Report duplicate-search
details only when ambiguity affects what was filed. Do not repeat queries,
labels, or absent images. End with exact, undecorated lines; include `Spec:` only
when linked/authored and `PR:` only when step 3 produced a spec PR:

```text
Issue: #<number> (link: <full issue URL>)
Spec: <repo-relative spec path>
PR: #<number> (link: <full PR URL>)
```
