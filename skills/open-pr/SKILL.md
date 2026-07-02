---
name: open-pr
description: Commits the worktree's changes, pushes the autofix branch, opens a draft PR against the configured base branch, normalizes PR labels, hands the issue back to the original author, and releases the in-progress lock. Emits PR_URL and PR_NUMBER markers so the next step (review) can reference the PR.
---

# Open PR

You are step 4 of an autofix chain (`verify-in-repo` → `root-cause` → `apply-fix` → `open-pr` → `auto-review-pr`). The previous step (`apply-fix`) edited files, added tests, and ran the validation gate. The repo is checked out on an isolated branch in the current working directory, with uncommitted changes staged or unstaged.

Your job: ship the work — commit, push, open the PR, hand off — then release the lock. **You must end your message with the `PR_URL=` and `PR_NUMBER=` markers** so the review step has something to reference.

## Arguments

- `{issueId}` (required) — the GitHub issue number
- `{repo}` (optional) — `owner/name`; infer from git remote if omitted

## Load pipeline config

Load `.ai/agentic.config.json` using the standard snippet from the `setup-agent-pipeline` skill. If the file is missing, stop and tell the user to run `setup-agent-pipeline` first. This step uses `baseBranch`, `labels.enabled`, and `qaGate`:

```bash
CONFIG=.ai/agentic.config.json
if [ ! -f "$CONFIG" ]; then
  echo "Missing $CONFIG — run the setup-agent-pipeline skill first."
  exit 1
fi
BASE_BRANCH=$(jq -r '.baseBranch // "auto"' "$CONFIG")
if [ "$BASE_BRANCH" = "auto" ]; then
  BASE_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || true)
  [ -z "$BASE_BRANCH" ] && BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
  [ -z "$BASE_BRANCH" ] && BASE_BRANCH="main"
fi
LABELS_ENABLED=$(jq -r '.labels.enabled // false' "$CONFIG")
QA_GATE=$(jq -r '.qaGate // false' "$CONFIG")
```

Every label mutation below goes through the `label_exists` / `apply_label` guards from the same snippet. When `labels.enabled` is `false`, skip every label operation and note that in the closing issue comment. Right after loading the config, check for `.ai/agentic-overrides/open-pr.md`; when present, apply it on top of these instructions — local rules win, but an override can never relax this skill's safety rules. Also consult the repository's agent instruction files (`AGENTS.md`, `CLAUDE.md`, or equivalents) for project specifics.

## Tools

- File reading and code search; shell (git, gh)

Limit file edits to PR-prep artifacts only (for example, a changelog entry if the project requires one). Do not introduce new code changes — the `apply-fix` step already validated what's on disk.

## Procedure

### 1. Confirm there are changes to ship

```bash
git status --porcelain
```

If empty, the `apply-fix` step produced no edits. Stop and write:

```
Status: blocked
No changes to commit — the apply-fix step did not modify any files. Releasing the lock and exiting.
```

Then release the lock (step 6 below) and finish. Do not emit `PR_URL=` markers in this case.

### 2. Read the apply-fix step's summary

The apply-fix step's full output is included in your prompt, in a block marked:

```
— PREVIOUS STEP (apply-fix) said —
<fix summary here>
```

Pull out:

- the one-paragraph summary
- the files changed
- the tests added
- the breaking-changes statement

You'll reuse these in the commit message and the PR body.

If the block is empty or the apply-fix step ended with `Status: blocked`, the previous step did not produce a fix. End your own output with `Status: blocked` immediately (do not commit empty changes), release any lock, and exit. The flow runner will mark the chain failed and skip the review step.

### 3. Commit

The workflow engine may have left an autosave commit on this branch — fine, you can amend or layer on top. Aim for one clean commit:

```bash
git add -A
git commit -m "fix(<area>): <one-line summary> (#{issueId})"
```

Where `<area>` is the affected module/package/area (`auth`, `api`, `ui`, `cli`, etc.). Use `feat(...)` if the issue is clearly an enhancement, `refactor(...)`, or `security(...)` as appropriate — `fix(...)` is the default.

If pre-commit hooks fail, address the issue (don't `--no-verify`) and re-commit.

### 4. Push

```bash
git push -u origin "$(git branch --show-current)"
```

Use whatever branch name the engine prepared (typically `autofix/issue-{issueId}` or similar from the chain's configuration). Do not rename the branch.

If push fails with a network error, retry once. If it still fails, write:

```
Status: blocked
Push failed: <error>
```

Release the lock anyway (step 6) so a human can pick it up.

### 5. Open the draft PR

Target the configured base branch (`$BASE_BRANCH`).

```bash
gh pr create \
  --repo {owner}/{repo} \
  --base "$BASE_BRANCH" \
  --draft \
  --title "fix(<area>): <one-line summary> (#{issueId})" \
  --body "$(cat <<EOF
Fixes #{issueId}

## Problem
<one-paragraph summary of the issue>

## Root Cause
<why the bug occurred — from the apply-fix summary>

## What Changed
- <change 1>
- <change 2>

## Tests
- <unit tests added/updated>
- <validation gate results — note any skipped commands>

## Breaking Changes
<the breaking-changes statement from the apply-fix step>

🤖 Generated by autofix.
EOF
)"
```

Capture the URL and number — you'll need both for the closing message:

```bash
PR_URL=$(gh pr view --json url --jq .url)
PR_NUMBER=$(gh pr view --json number --jq .number)
```

After the PR is created, normalize its labels — always through the `apply_label` guard:

- Apply the `review` pipeline label
- Add `skip-qa` only for clearly low-risk changes (docs-only, dependency-only, CI-only, test-only, trivial typo/single-file maintenance)
- Do not add `needs-qa` automatically unless the fix clearly introduces user-facing behavior that must be manually exercised
- Never add both `needs-qa` and `skip-qa`
- When the repo's taxonomy includes priority and risk labels, apply exactly one of each, inferred per the `setup-agent-pipeline` taxonomy — an ordinary bug fix is `priority-medium` / `risk-medium`; escalate when the diff touches auth, data scoping, money, DB schema, or shared contract surfaces
- When `qaGate` is `true` and you applied `needs-qa`, state in the closing comment that the merge waits for `qa-approved`

After each applied label, post a short PR comment explaining why it was applied (e.g., "Label set to `review` because the fix PR is ready for code review.").

### 6. Hand off the issue and release the lock

Whether or not the PR opened cleanly, always release the lock — use this as a finally-block.

If a PR exists and the issue author is not the current user / not a bot:

```bash
CURRENT_USER=$(gh api user --jq '.login')
ISSUE_AUTHOR=$(gh issue view {issueId} --repo {owner}/{repo} --json author --jq '.author.login')

if [ -n "$ISSUE_AUTHOR" ] && [ "$ISSUE_AUTHOR" != "$CURRENT_USER" ] && [ -n "${PR_URL:-}" ]; then
  gh issue edit    {issueId} --repo {owner}/{repo} --remove-assignee "$CURRENT_USER" || true
  gh issue edit    {issueId} --repo {owner}/{repo} --add-assignee    "$ISSUE_AUTHOR" || true
  gh issue comment {issueId} --repo {owner}/{repo} --body \
    "Thanks @${ISSUE_AUTHOR} — a fix PR is ready: ${PR_URL}. Reassigning the issue to you for verification."
fi
```

Then release the lock:

```bash
if [ "$LABELS_ENABLED" = "true" ]; then
  gh issue edit  {issueId} --repo {owner}/{repo} --remove-label "in-progress" || true
fi
gh issue comment {issueId} --repo {owner}/{repo} --body \
  "🤖 \`autofix\` completed: opened ${PR_URL:-(no PR — aborted)}. Lock released."
```

## Output contract

End with a final message in **exactly** this shape — the flow runner parses the markers:

```
Status: ready
Branch: <branch name>
PR opened: <title>

PR_URL=<full PR URL>
PR_NUMBER=<PR number>
```

The two `PR_*` lines must be on their own lines (no quoting, no list markers). The next step (`auto-review-pr`) references them via `{{previousPullRequestUrl}}` / `{{previousPullRequestNumber}}` in its args template; if the markers are missing, the review step runs with empty arguments and produces useless output.

On the blocked paths (no changes / push failed / PR open failed), end with:

```
Status: blocked
<one-paragraph explanation>
```

— and omit the `PR_*` lines.

## Rules

- Always release the `in-progress` lock at the end, even on failure — use a trap or finally pattern so a crash still clears it.
- Open the PR against the configured base branch (`baseBranch` from `.ai/agentic.config.json`); never hard-code the target.
- Open the PR as a draft — a human reviewer promotes it.
- Do not introduce new code changes in this step; the `apply-fix` step already validated what's on disk.
- Conventional-commit-style PR title scoped to the affected area: `fix(<area>): … (#{issueId})`.
- Every label mutation goes through the `apply_label` guard from `setup-agent-pipeline` and honors `labels.enabled`.
- Apply the `review` pipeline label; add `skip-qa` only for clearly low-risk changes; never both `needs-qa` and `skip-qa`.
- Never add `qa-approved` from this skill — it is earned by manual QA.
- Always emit `PR_URL=` / `PR_NUMBER=` on the success path so the next step has what it needs.
