# Author a spec and land it on a PR when none exists

The step 2b branch of `om-prepare-issue`: when the duplicate/spec search (step 2)
finds no covering spec — neither in `$SPECS_DIR` / the repo's design-doc areas nor
in any open PR — and the task is a **feature that warrants a spec** (a substantial
new capability where guessing the architecture would be irresponsible), this skill
produces the design instead of just recommending it. This is the only path on
which `om-prepare-issue` creates a PR, and the PR contains a **spec document only**
— never implementation.

## When this branch applies

All of these must hold:

- The task is a feature/enhancement (not a bug — bugs get inline analysis in step 3).
- No covering spec exists in the repo **and** none is in flight in an open PR.
- The change surface is non-obvious enough that a step-level inline analysis would
  be guesswork (large blast radius, new subsystem, unresolved architecture). A
  small feature with an obvious change surface stays in step 3 (inline analysis).

If any fails, do not open a spec PR — fall back to step 3's inline guidance.

## Procedure

1. **Create the tracking issue first** (step 4) so there is a stable number to
   link the spec and PR to. Use the normal `Implement: <feature>` title and body;
   in the `## Spec` section, leave a placeholder noting a spec PR is being authored.
2. **Delegate spec authoring to `om-auto-implement-issue`** with the new issue
   number and `--spec-only`. Follow that skill's workflow verbatim: it confirms the
   feature is not already implemented, writes the spec by following `om-spec-writing`
   **including its Open Questions hard gate**, commits the spec as the first commit,
   and opens a **draft spec PR** against the base branch. Because this is a
   design-only PR, its body references the issue with `Refs #{issueId}` (**not**
   `Closes` — merging the spec must not close the still-unimplemented FR), plus
   `Source doc:` and `Status: in-progress`. It stops after the spec lands (no
   implementation). Never answer the Open Questions gate yourself; when running
   unattended with no user to answer, report that the spec needs the questions
   resolved and stop rather than inventing answers.
3. **Link the spec back onto the issue** via **comment-issue**: post the spec path
   and the spec PR link, and update the issue body's `## Spec` section to reference
   them. The issue now points at a real, reviewable design.

## After this branch

The issue links a design a human can review, and the spec PR carries the design
commit. Implementation resumes later with `om-auto-continue-pr {specPrNumber}` (to
continue the same PR) or `om-auto-implement-issue {issueId}` (which reuses the
now-existing spec). Report both the issue and the spec PR in step 5.

## Guardrails

- The PR is design-only. Do not let the delegated run implement the feature here —
  `--spec-only` is mandatory on this path.
- Everything else about `om-prepare-issue` stays tracker-first: duplicate search,
  compatibility flagging, and the label rules (category `feature`; no pipeline or
  `in-progress` labels on the issue) are unchanged.
