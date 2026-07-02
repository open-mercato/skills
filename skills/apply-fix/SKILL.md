---
name: apply-fix
description: Implements the minimal code change identified by the root-cause step, adds regression tests, and runs the configured validation gate. Claims the GitHub issue at start (assignee + in-progress label + claim comment) so concurrent automation backs off. Does not commit, push, or open a PR — that is the open-pr step's job.
---

# Apply Fix

You are step 3 of an autofix chain (`verify-in-repo` → `root-cause` → `apply-fix` → `open-pr` → `auto-review-pr`). The previous step (`root-cause`) wrote a brief telling you what to change and where. The repo is checked out on an isolated branch in the current working directory.

Your job: implement the proposed change, prove it works, and stop. The next step (`open-pr`) handles commit/push/PR.

## Arguments

- `{issueId}` (required) — the GitHub issue number
- `{repo}` (optional) — `owner/name`; infer from git remote if omitted

## Load pipeline config

Load `.ai/agentic.config.json` using the standard snippet from the `setup-agent-pipeline` skill. If the file is missing, stop and tell the user to run `setup-agent-pipeline` first. This step uses `labels.enabled` (for the claim label) and `validation.commands` (for the gate below):

```bash
CONFIG=.ai/agentic.config.json
if [ ! -f "$CONFIG" ]; then
  echo "Missing $CONFIG — run the setup-agent-pipeline skill first."
  exit 1
fi
LABELS_ENABLED=$(jq -r '.labels.enabled // false' "$CONFIG")

label_exists() {
  gh label list --limit 200 --json name --jq '.[].name' | grep -Fxq "$1"
}
```

## Tools

You have write access:

- File reading, code search, editing, and creation
- Shell: full (tests, typecheck, generators, `gh` for the claim)

Do not run `git commit`, `git push`, or `gh pr create` — those are the next step's responsibility.

## Procedure

### 1. Claim the issue

This is the only step before PR-open that mutates GitHub state. Run the claim once, up front, so any parallel automation sees the lock immediately. The claim carries all three signals: assignee, `in-progress` label, and a claim comment. The label part honors `labels.enabled` and the existence guard; the assignee and comment are applied regardless.

```bash
CURRENT_USER=$(gh api user --jq '.login')
gh issue edit {issueId} --repo {owner}/{repo} --add-assignee "$CURRENT_USER" || true
if [ "$LABELS_ENABLED" = "true" ] && label_exists "in-progress"; then
  gh issue edit {issueId} --repo {owner}/{repo} --add-label "in-progress" || true
fi
gh issue comment {issueId} --repo {owner}/{repo} --body \
  "🤖 \`autofix\` started by @${CURRENT_USER} at $(date -u +%Y-%m-%dT%H:%M:%SZ). Other auto-skills will skip this issue until the lock is released."
```

The lock release happens in `open-pr` (success path) or via an external janitor (failure path). Do not release here.

### 2. Read the analyzer's brief

The analyzer's full output is included in your prompt, in a block marked:

```
— PREVIOUS STEP (root-cause) said —
<analyzer brief here>
```

Identify from that block:

- the file(s) to change
- the approach
- the regression test to add

**Do not invent your own root cause.** If the brief is missing, empty, or contradicts the repo (e.g. names files that don't exist), end your own output with `Status: blocked` and a one-line reason. The chain will stop cleanly — better than shipping a wrong fix.

If the analyzer ended with `LOW_CONFIDENCE`, be extra careful — re-read the affected code yourself before editing.

### 3. Make the minimal change

Edit only the files the analyzer named (plus the test file). Do not refactor unrelated code. Do not broaden scope.

Project-convention rules (apply to every fix):

- Follow the project's data-access conventions in production code — when the surrounding code routes through a helper or wrapper, use it; do not bypass it.
- Preserve public contracts unless the issue explicitly requires a contract change: exported APIs, HTTP routes and response shapes, event names, CLI flags, DB schema, config formats. If the project documents its own compatibility rules, honor them.
- Respect the project's data-scoping and permission-check rules.

### 4. Add regression tests (mandatory, autonomous)

Every fix MUST include test coverage. This is non-negotiable — never skip tests, never ask whether to add them.

- Add or update a unit test that fails without your fix and passes with it
- Add integration tests when the change touches risky flows (permission checks, data scoping, behavior that crosses component boundaries)
- Tests must be self-contained and target the smallest meaningful scope

### 5. Validation loop

Iterate until clean. Per iteration:

1. Run targeted unit tests for every changed package/area
2. Run the typecheck/lint commands from `validation.commands`, scoped to what changed when the toolchain supports scoping
3. If the project generates derived artifacts from the files you changed, run the relevant generator step
4. Re-read the diff and remove any accidental scope creep

Before declaring done, run the full validation gate: every command in `validation.commands` from `.ai/agentic.config.json`, in order. Any non-zero exit fails the gate; fix and re-run until green.

If the full gate is genuinely too expensive in the time available, run the targeted subset for the changed areas and call out in your final summary which gate commands were skipped. The `open-pr` step will surface this in the PR body.

### 6. Self-review

Run the change through the `code-review` skill checks plus a breaking-change review:

- no public contract broken silently: exported APIs, HTTP routes and response shapes, event names, CLI flags, DB schema, config formats
- no API response fields removed
- no data-scoping or permission-check rules weakened; the project's data-access conventions followed in every changed production file
- fix remains minimal — no unrelated churn

If self-review finds new issues, fix them and re-run the validation loop.

## Output contract

End with a final plain-text message in this shape — the next step parses it:

```
Status: ready
Files changed:
- <path/to/file-a.ts>
- <path/to/file-b.ts>
- <path/to/file-a.test.ts>

Summary: <one paragraph — what changed and why it fixes the issue>

Tests: <which tests/checks were added and that the full validation gate passed (or which commands were skipped and why)>

Breaking changes: <"none" OR a short statement of the contract change and the migration/deprecation path>
```

If you cannot complete the fix safely (blocker discovered, change unexpectedly broad, tests can't be made to pass), end with `Status: blocked` instead and explain what's wrong. The lock will remain set so a human can pick it up.

## Rules

- Tests are mandatory and added autonomously — never hand off without them.
- No commit, no push, no PR — leave that to `open-pr`.
- Stay inside the worktree the engine prepared; do not create nested worktrees.
- Keep scope minimal; refactors belong in their own PR.
- Every label mutation honors `labels.enabled` and the existence guard from `setup-agent-pipeline`; a missing label degrades to a logged skip, never a failure.
- Before declaring done, re-check every changed production file against the project's data-access and security conventions.
