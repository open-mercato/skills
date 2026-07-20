# Enrich one existing issue

The per-issue procedure `om-auto-manage-issues` runs in step 2, for the single id
or for each issue in the batch. Every mutation goes through the tracker
descriptor's named operations and label guards; the whole procedure is idempotent
and claim-aware.

## 1. Fetch and decide whether to touch it

**get-issue** for the issue, requesting `number,title,body,state,author,url,labels,assignees,comments`.
Skip the issue (record the reason for the report, mutate nothing) when:

- A **different actor holds an active claim**: it carries `in-progress` with an
  assignee who is not `$CURRENT_USER` (resolve via **current-user**), or a fresh
  `🤖` claim comment (< ~30 min) from another actor. This is the three-signal
  check of `references/claim-pr.md`, used skip-only. Never collide with active
  work.
- It carries a repo-defined **human-hold** label (e.g. `do-not-close`, or any
  hold label the repo's `SDLC.md` / labels config marks as agent-off-limits).

This skill does **not** take its own `in-progress` lock — it is a fast, additive
housekeeping pass, and taking a lock would fight the very automation it supports.

## 2. Apply missing SDLC labels

Read the issue's current labels. Infer the classification per `SDLC.md` (its
"When no priority label is set" and "When no risk label is set" lists, and the
category group) from the title, body, and any screenshot analysis from step 3:

- **Category** — add exactly one of `bug`, `feature`, `refactor`, `security`,
  `dependencies`, `documentation` when none is present.
- **Priority** — add exactly one `priority-*` when none is present.
- **Risk** — add exactly one `risk-*` when none is present.

Add each through the `apply_issue_label` guard (a missing label degrades to a
logged skip; `LABELS_ENABLED=false` skips all). **Only add what is missing** —
never remove or swap a label a human already set (a present label is treated as
the human's decision). After adding, post one short rationale comment covering the
labels applied (per `SDLC.md`'s "leaves a short comment explaining why"). If the
issue already carries a full category+priority+risk set, add nothing and note it.

## 3. Enrich a laconic issue (skip when `--relabel-only`)

Apply the laconic test and, when it trips, run the screenshot + wording procedure
in `references/screenshot-analysis.md`. In short:

- Analyze any attached screenshot(s) together with the terse text to reconstruct
  what is actually being reported/asked.
- Rewrite the issue body via the **update-issue** operation with a **clarified
  description**, preserving the reporter's original text verbatim in a collapsed
  section (non-destructive).
- Post the agent's **understanding** as a single comment — but **only if** no
  equivalent understanding comment from this skill already exists (scan via
  **list-issue-comments** for the skill's understanding marker). This is what
  makes re-runs a no-op.

## 4. Spec check (feature-category issues)

For an issue whose category is (or becomes in step 2) `feature`, check whether a
covering spec exists — the same approach as `om-prepare-issue` step 2, read-only:

- Read the repo's specs directory (`$SPECS_DIR`, plus the design-doc areas the repo
  uses) and judge by the spec's TLDR/overview whether its scope covers this issue's
  ask — not by filename alone.
- **search-prs** for an open PR that already adds a covering spec (a design/spec doc
  under `$SPECS_DIR` or the repo's design-doc areas) — a spec in flight counts as
  covered; note that PR.

Record `SPEC_STATUS` = `covered` (spec path or spec-PR link) | `missing`. A
`bug`/non-feature issue is `n/a`. This check mutates nothing on its own.

## 5. Author a missing spec (only with `--write-missing-specs`)

Default **OFF**: when the flag is not set, do nothing here — the `missing` status is
carried into the report so a human can decide.

When `--write-missing-specs` is set **and** `SPEC_STATUS` is `missing`: delegate to
**`om-auto-write-spec {issueId}`** verbatim — it claims the issue, writes the spec
via `om-spec-writing --autonomous`, opens the spec PR (`Refs #{issueId}`), and emits
`SPEC_PATH` + `PR_NUMBER`. Then link the result back on the issue via
**comment-issue** (spec path + spec-PR link), idempotently (skip when a spec-PR link
from this skill already exists). Under `--dry-run`, record the intent and mutate
nothing. This is the one place this housekeeping pass produces a PR — a design-only
spec PR, never implementation.

## Idempotency summary

Running this procedure twice on the same issue must change nothing the second
time: labels already present are left alone, the understanding comment /
clarified-body markers are detected and not duplicated, and a spec-PR link this
skill already posted is not re-posted. Design every mutation as "add if missing",
never "post again".
