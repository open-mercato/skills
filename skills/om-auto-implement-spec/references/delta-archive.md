# Delta archive (steps 2 and 4)

A spec written by `om-spec-writing` may carry a `## 📝 Delta` section:
`### Capability: {slug}` blocks holding `#### ADDED Requirement:`,
`#### MODIFIED Requirement:`, and `#### REMOVED Requirement:` entries, with
`Frozen by:` lines on the last two. This skill makes sure the implementation PR
does two things with it. It freezes changed behavior before changing it, and it
archives the Delta into the living capability specs under
`${SPECS_DIR}/capabilities/`.

## Engine brief addition (step 2)

When the spec carries a Delta and its Implementation Plan does not already hold
these steps, append this to the engine brief verbatim, with the placeholders
filled:

> For each MODIFIED or REMOVED requirement in the spec's Delta, the first Step of
> its phase is a characterization test: assert today's behavior, run it green on
> the unchanged code, commit it alone. The Step that changes the behavior updates
> that test to the new scenarios, or deletes it with a removed behavior. The
> final Step archives the Delta into `${SPECS_DIR}/capabilities/` per the merge
> rules below. Commit it as `docs(spec): archive delta of {spec slug}`.

Then add the merge rules and the capability file shape below to the brief.

## Merge rules

Apply each `### Capability: {slug}` block to `${SPECS_DIR}/capabilities/{slug}.md`.
A requirement section runs from its `## Requirement:` heading to the next one or
to the end of the file. Delta headings shift up two levels when copied
(`#### … Requirement:` → `## Requirement:`, `##### Scenario:` → `### Scenario:`).

- **File missing** → create it with the header from the shape below.
- **ADDED** → append the section. If a requirement with that name already
  exists, the spec is stale: do not overwrite. Stop the step and report the
  conflict on the PR.
- **MODIFIED** → replace the section of the same name in full. If it is not
  there yet (the behavior predates the capability file), append it as new.
- **REMOVED** → delete the section. If it is not there, nothing is removed.
  Say so in the run summary.
- Every written section ends with `Source: {spec path}`.
- Never edit the spec file. Its Delta stays as the record of this change.

## Capability file shape

```markdown
# Capability: {capability-slug}

{One sentence: what this capability lets whom do.}

## Requirement: {Requirement name}
The system SHALL {observable behavior}.

### Scenario: {Scenario name}
- WHEN {condition}
- THEN {observable outcome}

Source: {spec path}
```

## Finish check (step 4)

When the spec carries a Delta, the implementation PR's files (**get-pr-files**)
must include every `${SPECS_DIR}/capabilities/{slug}.md` the Delta names, and a
test file for every `Frozen by:` path that is not `none`. This skill stays a thin
orchestrator, so it does not fix a gap itself, a resumed run included. It posts
the gap once on the PR, inside the run summary or as its own
`` 🤖 `om-auto-implement-spec` — 📝 delta archive `` comment, and names it as the
outstanding action in the report.
