# Autonomous Open Questions — resolve with defaults, post for override

How `om-auto-implement-issue` clears `om-spec-writing`'s Open Questions gate in an
**autonomous** run without stopping. Autonomous means `--autonomous` was passed,
the run is unattended (no interactive user to answer), or a driving auto-skill
(e.g. `om-auto-fix-issue`) delegated it. Interactive runs never reach this file —
they stop at the gate for the human.

The rule the interactive path enforces ("never answer your own gate questions")
is deliberately inverted here **only** because a stalled autonomous run is worse
than a documented, reversible assumption a human can override before merge. It is
not licence to invent scope: defaults stay conservative and are always surfaced.

## 1. Choose a default per question

For each numbered Open Question, pick the answer that is **most reversible and
lowest-blast-radius**, biased toward the smallest scope that still ships something
working:

- Prefer the option that adds the least new surface (no new public contract, no
  new dependency, no schema change) — those are the expensive-to-undo choices.
- Prefer reusing the project's existing primitives/conventions over inventing new
  ones (per the repo's agent instructions).
- When the question is "should this also do X?", default to **no / defer X** and
  let a follow-up add it.
- When a question genuinely cannot be defaulted without risking a large rewrite or
  touching a protected/`BACKWARD_COMPATIBILITY.md` surface, still pick the most
  reversible option but mark it **NEEDS HUMAN CONFIRMATION** and treat the run as
  high-stakes (see step 4).

Write one short rationale sentence per default. Never default in a way that
weakens security, data scoping, or a documented compatibility contract — those are
never "assume and proceed"; mark them NEEDS HUMAN CONFIRMATION instead.

## 2. Resolve the spec's Open Questions block

Apply each default into the spec so the document is internally complete: replace
the `Open Questions` block with a `## Resolved assumptions (autonomous defaults)`
section listing, per question, the chosen answer, its rationale, and a
`⚠ NEEDS HUMAN CONFIRMATION` marker where it applies. The spec must read as a
coherent design under those assumptions — do not leave dangling references to an
unanswered question.

## 3. Post the questions + defaults as a comment

So a human can override before anything merges, post one comment via
**comment-issue** on the FR issue (it always exists at this point) and, once the
PR is open in step 4, the same content via **comment-pr** on the PR:

```markdown
🤖 `om-auto-implement-issue` — Open Questions answered with autonomous defaults

This spec had open questions and the run is autonomous, so I applied conservative
defaults to keep moving. **Please review and override before merge if any is wrong.**

| # | Question | Applied default | Why | Confirm? |
|---|----------|-----------------|-----|----------|
| Q1 | {question} | {default} | {one-line rationale} | {ok / ⚠ needs human} |
| Q2 | … | … | … | … |

To change any answer: reply here (or edit the spec) and re-run
`om-auto-continue-pr {prNumber}` / `om-auto-implement-issue {issueId}`.
```

Use a stable marker (`🤖 om-auto-implement-issue — Open Questions`) so a re-run
detects an existing defaults comment and updates it instead of posting a duplicate.

## 4. High-stakes guard

If **any** question was marked `⚠ NEEDS HUMAN CONFIRMATION`, do not present the run
as fully merge-ready on defaults alone: keep the PR a **draft** (or apply
`needs-qa`), state in the PR body and the step-12 summary that merge is gated on a
human confirming those specific assumptions, and never add `qa-approved`. Ordinary
low-risk defaults do not require this — the review comment is enough for them.
