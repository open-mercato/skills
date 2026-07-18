# Opening / reusing the PR — prefer `om-open-pr`, fall back inline

The single procedure for the "commit → push → open (or reuse) the PR → normalize
labels" mechanics, shared by `om-auto-create-pr` (step 9), `om-auto-continue-pr`,
`om-auto-continue-pr-loop`, `om-auto-implement-issue`, `om-auto-write-spec`, and
`om-auto-implement-spec`. The point is to have **one** implementation of PR
opening + labeling, reused rather than copied, and to never open a second PR for
work that already has one.

## Never open a duplicate PR

Before opening anything, check whether a PR already exists for this branch (or, in
an issue-driven run, one that references the issue) via **search-prs** / **get-pr**.
If one exists, **reuse it** — push new commits to its head branch and update its
body/labels — never open a second PR. This is the collision that alignment across
the create/continue/implement skills exists to prevent: only the skill that first
opens the PR owns opening it; everyone else updates that same PR.

## Prefer the `om-open-pr` skill when installed

`om-open-pr` already implements exactly this: it commits the worktree, pushes the
branch, opens a **ready-for-review** PR against `$BASE_BRANCH` (draft only with
`--draft`) with the unified body template, applies the full SDLC label set
(pipeline `review`, category, QA meta, one priority, one risk) through the
descriptor guards with rationale comments, posts the caller's summary comment,
and (in an issue-driven run) hands the issue back and releases the `in-progress`
lock — emitting `PR_URL=` / `PR_NUMBER=` markers. When it is installed,
**delegate to it** instead of re-deriving the steps:

- Issue-driven run (an `{issueId}` is in scope — e.g. `om-auto-implement-issue`):
  invoke `om-open-pr {issueId} {category}` (add `--plan <path>` when an execution
  plan exists, `--draft` for a spec-only design PR) and capture its
  `PR_URL` / `PR_NUMBER`.
- Brief- or spec-driven run (no issue — e.g. `om-auto-create-pr`): invoke it
  without `{issueId}`; the issue-handback and lock-release parts don't apply.

## Graceful fallback when `om-open-pr` is NOT installed

`om-open-pr` is an **optional** enhancement — a repo may install `om-auto-create-pr`
(or the continue/implement skills) without it, and they must still work. When
`om-open-pr` is absent, perform the mechanics inline:

1. Commit the worktree changes with a conventional-commit subject; push the branch.
2. Open the PR via the tracker operation **create-pr** against `$BASE_BRANCH` —
   **ready for review** unless the caller explicitly wants a draft (spec-only /
   interrupted work) — with the caller's PR body template
   (e.g. `references/pr-body-template.md`), which **must** carry the
   `Tracking plan:` line so `om-auto-continue-pr` can resume.
3. Normalize labels via `references/label-normalization.md` — the full set:
   pipeline `review`, category, QA meta, exactly one priority, exactly one risk —
   each through the `apply_label` guard (missing label → logged skip;
   `labels.enabled:false` → skip all), with the short per-label rationale comments.

Detect availability simply: if invoking `om-open-pr` is not possible in this
environment (skill not present), take the inline path. Behavior is identical either
way — the same PR, the same labels — so a repo's choice to install `om-open-pr` only
removes duplication, it never changes the outcome.
