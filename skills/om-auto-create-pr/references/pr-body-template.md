# PR body template (step 10)

The PR body `om-auto-create-pr` opens the PR with in step 10 — the inline-fallback
copy of the unified template owned by `om-open-pr` (its
`references/pr-body-template.md`); the two must stay in sync (see the cross-skill
contract in this repo's AGENTS.md). It **MUST** include the `Tracking plan:` line
so `om-auto-continue-pr` can resume.

PR title convention: conventional-commit prefix scoped to the primary area.
Examples: `feat(ui): add accessible confirmation dialog wrapper`,
`refactor(pricing): extract shared resolver`,
`security(auth): harden session validation`,
`docs(skills): add om-auto-create-pr and om-auto-continue-pr`.

```markdown
Closes #{issueId}                <!-- only in issue-driven runs; `Refs #{issueId}`
                                      for a spec-only design PR -->
Tracking plan: {RUNS_DIR}/{DATE}-{SLUG}.md
Source doc: {SPECS_DIR}/{spec}.md     <!-- only when a spec/design doc drives the run -->
Status: in-progress

## 🎯 Goal
- {one-line task summary from brief}

## External References
- {url — what was adopted, what was rejected}  <!-- only if --skill-url was used -->

## What Changed
- {bullet list of phase-level changes}

## 🧪 Tests
- {unit tests added or updated}
- {other checks}

## 💥 Breaking Changes
- {None | describe affected contracts and migration notes}

## 📋 Progress
See the Progress section in the tracking plan.
```

Flip `Status:` to `complete` on the PR body once all Progress steps are checked.
