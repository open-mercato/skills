# PR linkage and labels for an FR implementation

The FR-specific PR body and label choices `om-auto-implement-issue` uses when it
opens the draft PR (step 4 of the spec-first flow) and when it marks it ready
(body step 6). This builds on `om-auto-create-pr`'s `pr-body-template.md` and
`label-normalization.md` — reuse those; this file only adds the issue linkage and
the feature-category defaults.

## PR body

Same shape as `om-auto-create-pr`'s template, plus the two linkage lines that make
the FR auto-close on merge and let a spec-reviewer find the design:

```markdown
Closes #{issueId}
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

Open the PR as a **draft** in step 4 (spec only, no implementation yet). Flip it
out of draft (**mark-pr-ready**) and change `Status:` to `complete` in step 6,
once every Progress step is checked. Keep the `Closes #{issueId}` line intact —
removing it breaks auto-close.

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
