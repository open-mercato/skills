# PR linkage and labels for an FR implementation

The FR-specific PR body and label choices `om-auto-implement-issue` uses when it
opens the draft PR (step 4 of the spec-first flow) and when it marks it ready
(body step 6). This builds on `om-auto-create-pr`'s `pr-body-template.md` and
`label-normalization.md` — reuse those; this file only adds the issue linkage and
the feature-category defaults.

## The issue-linkage line — `Closes` vs `Refs` (read this first)

The linkage keyword depends on **what the PR will contain when it merges**, because
merging a PR with a `Closes`/`Fixes`/`Resolves` keyword auto-closes the FR:

- **Implementing PR** (the normal full run — spec commit *and* implementation land
  on the same branch) → use `Closes #{issueId}`. Merging it ships the feature and
  correctly closes the FR.
- **Design-only spec PR** (a `--spec-only` run, including the one `om-prepare-issue`
  opens) → use `Refs #{issueId}` (a plain reference, **no** closing keyword). The
  feature is not implemented yet, so merging the spec must **not** close the FR —
  it stays open until the implementing PR merges. Using `Closes` here would both
  close the FR prematurely and make a later `om-auto-implement-issue {issueId}`
  resume abort (its triage stops on a closed issue).

## PR body

Same shape as `om-auto-create-pr`'s template, plus the linkage line (per the rule
above) and the `Source doc:` line that lets a spec-reviewer find the design:

```markdown
Closes #{issueId}        <!-- implementing PR; use "Refs #{issueId}" on a --spec-only design PR -->
Tracking plan: {RUNS_DIR}/{DATE}-{SLUG}.md
Source doc: {SPECS_DIR}/{DATE}-{SLUG}.md
Status: in-progress

## Goal
- {one-line feature summary from the FR}

## Design
- Spec: `{spec path}` — landed as the first commit on this branch.

## What Changed
- {bullet list of phase-level changes; "spec only" until implementation lands}

## Tests
- {unit/integration tests added or updated}

## Breaking Changes
- {None | describe affected contracts and migration notes}

## Progress
See the Progress section in the tracking plan.
```

Open the PR as a **draft** in step 4 (spec only, no implementation yet). On a full
run, the same PR becomes the implementing PR, so it carries `Closes #{issueId}`
from the start. During implementation the continuation (`om-auto-continue-pr` /
`-loop`) changes the body `Status:` to `complete` once every Progress step is
checked; then **step 6 of this skill promotes the PR out of draft via
mark-pr-ready** (the continuation does not leave draft). Keep the `Closes` line
intact throughout (removing it breaks auto-close). On a `--spec-only` run the draft
PR carries `Refs #{issueId}` and stays a design PR — the FR closes later, when the
implementing PR merges.

## Labels

Apply the full `om-auto-create-pr` step-10 taxonomy through the `apply_label`
guard, with these FR defaults:

- Always add the `feature` category label (this skill only ships features).
- Apply the `review` pipeline label when the PR is ready for review (not on a
  `--spec-only` draft that is still design-only — use `review` there too only if
  the team reviews spec PRs; otherwise leave it in draft with no pipeline label).
- Exactly one priority label and exactly one risk label, inferred from the FR and
  the diff (a broad new subsystem touching auth/data/contracts → `risk-high`; an
  isolated additive feature with tests → `risk-medium`).
- `needs-qa` when the feature adds user-facing behavior (most FRs do); `skip-qa`
  only for non-user-facing capability (internal API, tooling, CI). Never both. On
  the `--spec-only` path, skip both — there is nothing to QA until implementation
  lands.
- After each applied label, post a short PR comment explaining why. When
  `qaGate` is `true`, a `needs-qa` PR stays unmergeable until QA signs off — never
  add `qa-approved` from this skill; state in the summary that manual QA is
  pending.
