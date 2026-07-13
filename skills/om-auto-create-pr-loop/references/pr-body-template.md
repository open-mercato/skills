# PR body template (step 9)

The PR body `om-auto-create-pr-loop` opens the PR with in step 9. It **MUST**
include the `Tracking plan:` line so `om-auto-continue-pr-loop` can resume.

PR title convention: conventional-commit prefix scoped to the primary area.
Examples: `feat(ui): add accessible confirmation dialog wrapper`,
`refactor(pricing): extract shared resolver`,
`security(auth): harden session validation`,
`docs(skills): add om-auto-create-pr-loop and om-auto-continue-pr-loop`.

```markdown
Tracking plan: {RUNS_DIR}/{DATE}-{SLUG}/PLAN.md
Tracking run folder: {RUNS_DIR}/{DATE}-{SLUG}/
Status: in-progress

## Goal
- {one-line task summary from brief}

## External References
- {url — what was adopted, what was rejected}  <!-- only if --skill-url was used -->

## What Changed
- {bullet list of phase-level changes}

## Tests
- {unit tests added or updated}
- {other checks}

## Breaking Changes
- {None | describe affected contracts and migration notes}

## Progress
See the Tasks table in the plan — that is the authoritative Step-status source (`todo` / `done`).

## Handoff & Notifications
- Live handoff: `{RUNS_DIR}/{DATE}-{SLUG}/HANDOFF.md`
- Notifications log: `{RUNS_DIR}/{DATE}-{SLUG}/NOTIFY.md`
```

Flip `Status:` to `complete` on the PR body once every row in the Tasks table has `Status` = `done`.
