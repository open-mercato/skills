# Unified PR body template (step 5)

The one PR body shape every pipeline skill uses. `om-auto-create-pr`'s
`references/pr-body-template.md` is the inline-fallback copy of this contract —
the two files must stay in sync (see the cross-skill contract in this repo's
AGENTS.md). Sections marked *conditional* appear only when their input exists.

Title: `<prefix>(<area>): <one-line summary>${issueId:+ (#issueId)}` — prefix
from the category (`bug` → `fix`; else the category name; `feat` for features).

```markdown
Closes #{issueId}                       <!-- issue-driven implementing PR; use
                                             `Refs #{issueId}` for a spec-only
                                             design PR so merging it does not
                                             close the issue; omit when no issue -->
Tracking plan: {RUNS_DIR}/{DATE}-{SLUG}.md   <!-- conditional: --plan; MUST be
                                                  present when a plan exists so
                                                  om-auto-continue-pr can resume -->
Source doc: {SPECS_DIR}/{spec}.md            <!-- conditional: spec-driven runs -->
Status: in-progress                          <!-- flip to `complete` when every
                                                  Progress step is checked -->

## 🎯 Goal
- {one-line summary of the task, issue, or spec}

## 🔍 Problem                                <!-- bug fixes only -->
{one-paragraph summary of the issue}

## 🔍 Root Cause                             <!-- bug fixes only -->
{why the bug occurred — from the om-fix summary}

## External References                       <!-- only if --skill-url was used -->
- {url — what was adopted, what was rejected}

## What Changed
- {bullet list of changes, phase-level for planned runs}

## 🧪 Tests
- {unit tests added or updated}
- {validation gate results — note any skipped commands}

## 💥 Breaking Changes
- {None | describe affected contracts and migration notes}

## 📋 Progress                               <!-- conditional: --plan -->
See the Progress section in the tracking plan.
```
