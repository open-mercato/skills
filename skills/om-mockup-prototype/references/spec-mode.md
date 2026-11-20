# Spec mode (`--spec`)

`om-spec-writing` calls this skill to give a feature spec a clickable mockup of
the UI it proposes. Everything in `references/prototype-format.md` and
`references/quality-gate.md` applies; this file lists only what differs from the
discovery mode.

## Source

- `--spec <path>` is the source document: an existing repository-relative file
  that passes the step-0 path and containment checks. It need not sit under
  `SPECS_DIR` — without config, `om-spec-writing` writes specs into the repo's
  own design-doc area. A missing or unsafe path is an input error.
- Read the spec's TLDR, UI/UX, Edge Cases & Failure Scenarios, Data Model (for
  realistic fictitious fields), Decisions in play, and Open Questions or
  `Resolved assumptions (autonomous defaults)`. When `${SPECS_DIR}/product-brief.md`
  exists, read its Business rules, Non-goals and Decisions as binding constraints.
- **Flow selection.** `--flow` names the flow; otherwise take the primary
  user-facing flow of the UI/UX section and cover every new or materially changed
  screen it reaches. A spec with several unrelated UI flows gets one revision
  whose start screen links to each flow. Standard CRUD the spec calls standard
  stays out of the simulation.
- No panel report applies. Do not run or cite synthetic panels.

## Simulation boundary

- **Interactive** (`--spec` without `--autonomous`): step 2 confirms the
  boundary with the user as in discovery mode.
- **`--autonomous`**: do not ask. Record the actor, start, success outcome,
  screen/state list and every interaction the spec leaves open as `[ASSUMPTION]`
  entries (`A1`, `A2`, …) in the context record, each pointing at the spec
  section or resolved assumption it relies on. A choice that would set business
  policy the spec does not settle is not simulated — label that control as
  outside this prototype and list it as an assumption for the spec's caller to
  surface. A spec assumption marked `⚠ NEEDS HUMAN CONFIRMATION` keeps that marker
  in the context record.

## Output

- Revision directory: `${PROTOTYPES_DIR}/specs/<slug>/revision-<NNN>/`, where
  `<slug>` defaults to the spec filename's kebab title (without the date).
  Ownership, refresh and preservation rules are those of the discovery root,
  applied to this root, with these spec-mode differences:
  - **Slug collision.** When `specs/<slug>/` already exists for a different spec
    (its manifest's `spec` differs), choose a new unused slug by appending the
    spec's date (`<slug>-<YYYY-MM-DD>`, then `-2`, …) and state it; under
    `--autonomous` never ask. The same spec path means a refresh — under
    `--autonomous` write the next revision without asking.
  - **Refresh source.** The spec is the required source; the product brief is
    optional. Stop only when the spec cannot be read.
  - **Context record.** `README.md` records the spec path (and the brief path
    only when one was read) in place of the brief path.
- `prototype.json` keeps `format: "discovery-prototype-v1"` and adds
  `"source": "spec"` and `"spec": "<repo-relative spec path>"`; `brief` holds the
  product-brief path when one was read, otherwise `null`. Discovery manifests
  without `source` mean `"source": "brief"`.
- Browser evidence goes in the revision's `evidence/` as in discovery mode; the
  caller may reuse those screenshots as spec evidence.
- Report as usual. `Next:` is always `none` in spec mode — the caller owns what
  happens next. The spec writes nothing back to this skill's files.
