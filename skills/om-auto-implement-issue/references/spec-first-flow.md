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
  including its skeleton-first drafting and its **Open Questions gate**. Handle the
  gate by mode (this skill is **autonomous by default**):
  - **Autonomous** (the default — no `--interactive`): do **not** stop. Resolve each
    Open Question with a conservative, reversible default and continue, following
    `references/autonomous-open-questions.md` — which also posts the questions +
    applied defaults as an issue/PR comment inviting a human to override before
    merge.
  - **Interactive** (only when `--interactive` was passed): the gate is a genuine
    human checkpoint — present the skeleton with numbered Open Questions and STOP
    until the user answers; never answer your own gate questions to keep moving.

  Save the spec at `$SPECS_DIR/{YYYY-MM-DD}-{slug}.md` — the naming shape
  `om-followup-issue-from-pr` recognizes.

The spec's **Implementation Plan** (Phases → testable Steps) is what step 5
executes, so make sure it exists and each step leaves the app working.

## 3. Commit the spec, choose the engine, and write the execution plan

- Commit the spec as the first code commit:
  `docs(specs): add spec for {slug} (FR #{issueId})`.
- **Choose the implementation engine now** (`om-auto-continue-pr` vs
  `om-auto-continue-pr-loop`) per `references/implementation-engine-selection.md`,
  because the plan format depends on it.
- Write the plan under `$RUNS_DIR`, referencing the spec as `Source doc:` and
  deriving its steps directly from the spec's Phases/Steps:
  - For `om-auto-continue-pr` (default): the Progress-tracked execution plan in the
    `om-auto-create-pr` step-3 format (`{DATE}-{slug}.md` with the `## Progress`
    checklist), so the continuation resumes from the first unchecked step.
  - For `om-auto-continue-pr-loop` (large spec): the run-folder format
    `om-auto-create-pr-loop` defines (`PLAN.md` Tasks table + `HANDOFF.md`/`NOTIFY.md`).
- Commit the plan: `docs(runs): add execution plan for {slug}`.

## 4. Push and open (or reuse) the draft PR

Push the branch, then open a **draft** PR following
`om-auto-create-pr/references/pr-open-reuse.md` — prefer the `om-open-pr` skill when
installed, fall back to the **create-pr** tracker operation inline when it is not,
and never open a duplicate PR if one already exists for the branch. Title:
conventional-commit (`feat({area}): {feature}`). Use the PR body from
`references/pr-linkage.md`, with the correct linkage line: a full run's PR will
implement the feature, so it carries `Closes #{issueId}` from the start; a
`--spec-only` design PR carries `Refs #{issueId}` (no closing keyword — see step 5).
It also carries `Source doc:`, `Tracking plan:`, and `Status: in-progress`. Opening
the PR now is what puts "the spec on a PR first": reviewers see the design commit
before any implementation commit exists.

## 5. `--spec-only` branch

If `--spec-only` was passed, stop here: the PR is a **design-only spec PR**, so its
body carries `Refs #{issueId}` (not `Closes` — merging the spec must not close the
still-unimplemented FR). Leave the PR in draft with `Status: in-progress`, apply
the `feature` category label plus one priority and one risk label (skip
`needs-qa`/`skip-qa` — there is no behavior to QA yet), and post the label
rationale comments.

Lock handoff on the `--spec-only` stop: this is a deliberate hand-off, not a
crash, so the run intentionally **keeps** the `in-progress` label and assignee and
leaves a `🤖` comment stating the spec is ready and implementation resumes with
`om-auto-continue-pr {prNumber}` (or `om-auto-implement-issue {issueId}`, which
reuses the merged spec). This retained lock is the resume marker, not a leak — the
resuming run owns releasing it. (Contrast the failure `trap`, which *does* release
the lock, because an aborted run is not a hand-off.) Otherwise continue to body
step 5 (implement).
