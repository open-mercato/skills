# Opening / reusing the PR — prefer `om-open-pr`, fall back inline

The single procedure for the "commit → push → open (or reuse) the PR → normalize
labels" mechanics, shared by `om-auto-create-pr` (step 9), `om-auto-continue-pr`,
`om-auto-continue-pr-loop`, and `om-auto-implement-issue`. The point is to have
**one** implementation of PR opening + labeling, reused rather than copied, and to
never open a second PR for work that already has one.

## Never open a duplicate PR

Before opening anything, check whether a PR already exists for this branch (or, in
an issue-driven run, one that references the issue) via **search-prs** / **get-pr**.
If one exists, **reuse it** — push new commits to its head branch and update its
body/labels — never open a second PR. This is the collision that alignment across
the create/continue/implement skills exists to prevent: only the skill that first
opens the PR owns opening it; everyone else updates that same PR.

## Prefer the `om-open-pr` skill when installed

`om-open-pr` already implements exactly this: it commits the worktree, pushes the
branch, opens a **draft** PR against `$BASE_BRANCH`, normalizes labels through the
descriptor guards, and (in an issue-driven run) hands the issue back and releases
the `in-progress` lock — emitting `PR_URL=` / `PR_NUMBER=` markers. When it is
installed, **delegate to it** instead of re-deriving the steps, so there is no
duplicated PR-opening logic across skills:

- Issue-driven run (an `{issueId}` is in scope — e.g. `om-auto-implement-issue`):
  invoke `om-open-pr {issueId}` verbatim and capture its `PR_URL` / `PR_NUMBER`.
- Brief-driven run (no issue — e.g. `om-auto-create-pr` from a task brief): reuse
  its commit/push/open-draft/label mechanics; skip the issue-handback and
  lock-release parts, which do not apply when there is no issue.

## Graceful fallback when `om-open-pr` is NOT installed

`om-open-pr` is an **optional** enhancement — a repo may install `om-auto-create-pr`
(or the continue/implement skills) without it, and they must still work. When
`om-open-pr` is absent, perform the mechanics inline:

1. Commit the worktree changes with a conventional-commit subject; push the branch.
2. Open the PR via the tracker operation **create-pr** against `$BASE_BRANCH` (as a
   draft when the caller wants spec-first / resumable review), with the caller's PR
   body template (e.g. `references/pr-body-template.md`) — which **must** carry the
   `Tracking plan:` line so `om-auto-continue-pr` can resume.
3. Normalize labels via `references/label-normalization.md`, each through the
   `apply_label` guard (missing label → logged skip; `labels.enabled:false` → skip
   all), and post the short per-label rationale comments.

Detect availability simply: if invoking `om-open-pr` is not possible in this
environment (skill not present), take the inline path. Behavior is identical either
way — the same PR, the same labels — so a repo's choice to install `om-open-pr` only
removes duplication, it never changes the outcome.
