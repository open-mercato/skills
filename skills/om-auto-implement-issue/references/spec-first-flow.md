# Spec-first flow — land the spec on the PR before implementing

The procedure `om-auto-implement-issue` follows in step 4: claim the FR, produce
the spec, commit it as the first commit, and open a draft PR so the design is on
the PR before any implementation lands. Runs inside the isolated worktree created
in step 3.

## 1. Claim the issue

Now that triage confirmed real work, take the three-signal claim so concurrent
automation backs off — mirror `om-fix`'s claim exactly:

- **assign-issue** `{issueId}` to `$CURRENT_USER`,
- apply the `in-progress` label through the descriptor's `apply_issue_label`
  guard (a missing label or `LABELS_ENABLED=false` degrades to a logged skip),
- **comment-issue** a `🤖` claim comment naming this skill and the branch.

Register a `trap`/finally that releases the lock on any later failure (remove
`in-progress` via the guard + an abort comment), exactly as `om-auto-fix-issue`
step 8 does.

## 2. Produce the spec

Two paths, decided by triage:

- **A covering spec already exists** (triage found it in `$SPECS_DIR`): reuse it.
  Do not rewrite it. If it only partially covers the FR, extend it minimally and
  note precisely what you added.
- **No spec**: write one by following the `om-spec-writing` workflow **verbatim**,
  including its skeleton-first drafting and its **Open Questions hard gate**. That
  gate is a genuine human checkpoint — present the skeleton with numbered Open
  Questions and STOP until the user answers; never answer your own gate questions
  to keep moving. When running unattended with no user to answer, stop the run and
  report that the spec needs the Open Questions resolved before implementation can
  proceed (do not invent answers). Save the spec at
  `$SPECS_DIR/{YYYY-MM-DD}-{slug}.md` — the naming shape `om-followup-issue-from-pr`
  recognizes.

The spec's **Implementation Plan** (Phases → testable Steps) is what step 5
executes, so make sure it exists and each step leaves the app working.

## 3. Commit the spec and write the execution plan

- Commit the spec as the first code commit:
  `docs(specs): add spec for {slug} (FR #{issueId})`.
- Write the Progress-tracked execution plan under `$RUNS_DIR/{DATE}-{slug}.md`
  using the `om-auto-create-pr` step 3 format, with two FR-specific lines:
  `Source doc: {spec path}` and a note that the Progress phases mirror the spec's
  Implementation Plan. Derive the Progress checklist directly from the spec's
  Phases/Steps so `om-auto-continue-pr` can resume.
- Commit the plan: `docs(runs): add execution plan for {slug}`.

## 4. Push and open the draft PR

Push the branch, then open a **draft** PR via **create-pr** against
`$BASE_BRANCH` with a conventional-commit title (`feat({area}): {feature}`). Use
the PR body from `references/pr-linkage.md` — it already carries `Closes #{issueId}`,
`Source doc:`, `Tracking plan:`, and `Status: in-progress`. Opening the PR now is
what puts "the spec on a PR first": reviewers see the design commit before any
implementation commit exists.

## 5. `--spec-only` branch

If `--spec-only` was passed, stop here: leave the PR in draft with
`Status: in-progress`, apply the `feature` category label plus one priority and
one risk label (skip `needs-qa`/`skip-qa` — there is no behavior to QA yet), post
the label rationale comments, and tell the user the design is ready for review and
implementation resumes with `om-auto-continue-pr {prNumber}`. Do **not** release
the `in-progress` lock on this path if the same actor will resume; release it only
per the normal end-of-run rule when handing off to a different owner. Otherwise
continue to body step 5 (implement).
