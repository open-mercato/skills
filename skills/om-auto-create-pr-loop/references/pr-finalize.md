# PR finalize — open, labels, summary comment, markers

The single procedure for the "commit → push → open (or reuse) the PR → normalize labels → summary comment → chaining markers" mechanics (steps 11, 13, and 15 of the skill body). The point is **one** implementation of PR opening + labeling, reused rather than copied, and never a second PR for work that already has one.

## Never open a duplicate PR

Before opening anything, check whether a PR already exists for this branch (or one that references the run folder) via **search-prs** / **get-pr**. If one exists, **reuse it** — push new commits to its head branch and update its body/labels — never open a second PR. Only the skill that first opens the PR owns opening it; everyone else updates that same PR. (The step-2 slot check already routes an existing-PR run to `om-auto-continue-pr-loop`; this is the last line of defense.)

## Opening the PR (inline, via **create-pr**)

This skill always opens the PR inline — it does not delegate to `om-open-pr`, because it owns the three-signal lock lifecycle and the run-folder contract itself (see specifics below):

1. Commit the worktree changes with a conventional-commit subject; push the branch.
2. Open the PR via the tracker operation **create-pr** against `$BASE_BRANCH`, with the body template below.
3. Normalize labels per the section below.

## Ready vs draft

Open the PR **ready for review**. Draft only when the run is explicitly handing off incomplete work (an interrupted run leaving `Status: in-progress`).

## PR body

Use the template in `references/pr-body-template.md` — a conventional-commit-prefixed title scoped to the primary area, and a body that **MUST** include the `Tracking plan:` line so `om-auto-continue-pr-loop` can resume. Flip `Status:` to `complete` on the PR body once every row in the Tasks table has `Status` = `done`.

## Label normalization (step 11)

Apply labels from the config's taxonomy after opening the PR, always through the `apply_label` guard from the tracker descriptor (missing labels degrade to a logged skip; `labels.enabled: false` skips everything — note that in the summary comment). This is the canonical label contract for every PR-opening skill; `om-open-pr` carries the same rules and the two must stay in sync.

- Apply the `review` pipeline label. New PRs always start in `review` unless the run terminated early with an explicit blocker.
- Add `skip-qa` **only** for clearly low-risk non-user-facing changes (docs-only, dependency-only, CI-only, test-only, trivial typos, single-file maintenance).
- Add `needs-qa` when the run touches UI or other user-facing behavior that requires manual exercise.
- Never add both `needs-qa` and `skip-qa`.
- Add additive category labels when they clearly apply: `bug`, `feature`, `refactor`, `security`, `dependencies`, `documentation`.
- Apply exactly one priority label. Infer it from the brief and the diff: outage, data loss, or a security incident → `priority-extreme`; security hardening or a release-blocking regression → `priority-high`; ordinary bug or feature → `priority-medium`; cosmetic, docs, dependency bumps, or cleanup → `priority-low`. Never open the PR without a priority.
- Apply exactly one risk label. Infer it from the diff: changes to auth, session handling, data scoping, money, DB migrations, or shared contract surfaces, or broad cross-cutting edits → `risk-high`; an ordinary single-area change with tests → `risk-medium`; docs, dependency bumps, test-only, or isolated cleanup → `risk-low`. Never open the PR without a risk label.
- After each applied label, post a short PR comment explaining why.
- When `qaGate` is `true`, a `needs-qa` PR will not be mergeable until QA signs off with `qa-approved`. Do not add `qa-approved` from this skill — it is earned by manual QA or the self-QA exception. State in the PR summary that manual QA is still pending.

Suggested label comments:

- `review`: `🏷️ Label set to \`review\` because the PR is ready for code review.`
- `skip-qa`: `🏷️ Label set to \`skip-qa\` because this is a docs-only / low-risk change.`
- `needs-qa`: `🏷️ Label set to \`needs-qa\` because this touches {area} and must be manually exercised.`
- `priority-*`: `🏷️ Priority set to \`priority-{level}\` because {one-line rationale}.`
- `risk-*`: `🏷️ Risk set to \`risk-{level}\` because {one-line rationale}.`

## Summary comment

Every run ends with a single comprehensive summary comment the human reviewer can read top-to-bottom without clicking into the diff. Post it via the tracker operation **comment-pr** with a body file so multi-line formatting is preserved. Full structure and rules: `references/summary-comment-template.md`. Never post it before the automated review loop (step 12) finishes, never claim a completion you did not reach, and never paste secrets into it.

## Marker emission

End the run's final report with the chaining markers on their own lines:

```
PR_URL=<full PR URL>
PR_NUMBER=<PR number>
```

Chained consumers (`om-auto-review-pr`, `om-auto-qa-pr`, orchestration scripts) parse these exact text markers — never rename, translate, or decorate them.

## om-auto-create-pr-loop specifics

- **Claim immediately after opening.** As soon as **create-pr** returns a PR number, claim the PR with the three-signal lock (assign-pr + label-pr `in-progress` via the guard + claim comment) and wire the release into a `trap`/finally — full sequence and comment strings: `references/claim-pr.md` (PR lock lifecycle).
- **Flush deferred checkpoint evidence.** Right after the PR opens, for each checkpoint that captured screenshots before the PR existed, post one **attach-image-evidence** comment per checkpoint — marker `` 🤖 `om-auto-create-pr-loop` — checkpoint <N> evidence ``, slug `checkpoint-<N>` — per `references/checkpoint-pass.md`.
- **Final run-folder update lands under the lock.** If the PR was opened, write a final `HANDOFF.md` + `NOTIFY.md` entry (closing timestamp + PR URL), commit, and push **before** releasing the `in-progress` label so the final update lands under the same lock (step 14).
- **Simple runs** open the PR directly with a short body — summary + test plan + rollback; no `Tracking plan:` line, no `Status:` field, no linked run folder (`references/run-mode-contracts.md`). Label normalization and the lock lifecycle still apply in full.
