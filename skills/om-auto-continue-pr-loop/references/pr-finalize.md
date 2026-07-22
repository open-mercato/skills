# PR finalize — update the existing PR, labels, lock release (step 11)

This step **updates the existing PR** — it never opens a new one. The point is **one** implementation of PR updating + labeling, reused rather than copied, and never a second PR for work that already has one.

## Never open a duplicate PR

Before touching anything, remember the reuse guard: when a PR already exists for this branch (in a resume it always does — it is the `{prNumber}` argument), **reuse it** — push new commits to its head branch and update its body/labels — never open a second PR. Only the skill that first opened the PR owns opening it; everyone else updates that same PR.

## Prefer the `om-open-pr` skill when installed

**Prefer the `om-open-pr` skill when installed** — reuse its push + label normalization instead of duplicating it. `om-open-pr` is an **optional** enhancement: when it is absent, perform the mechanics inline via the tracker operations below so this skill works standalone. Behavior is identical either way — the same PR, the same labels.

## Reframe a doc-originated PR (spec → feature)

When this PR was opened as a **spec/design-only PR** (by `om-auto-write-spec` / `om-open-pr`, then continued here by `om-auto-implement-spec` as a Spec-implementation run) but this run — or an earlier resume — has landed implementation code, its original title and body no longer describe it. A PR still titled `docs(specs): …` with a body that reads `Breaking Changes: None — design only` misrepresents a branch that now carries the feature (the concrete failure this guard fixes). Reframe it, and preserve the original wording **for the record** — the same non-destructive rewrite `om-auto-manage-issues` applies to laconic issue bodies.

Reframe when **both** hold:

- **Doc origin.** The PR title starts with `docs(specs):`, or the body carries a `Source doc:` line together with the `documentation` category label / a `None — design only` Breaking Changes line.
- **Now implements code.** The branch diff against `origin/$BASE_BRANCH` (via **get-pr-files** / **get-pr-diff**) touches files outside the specs and runs directories (`$SPECS_DIR`, `$RUNS_DIR`) — real implementation landed, not just the spec, plan, and run-folder docs.

Idempotency: skip if the body already contains the `Original spec-PR description (for the record)` marker — a prior resume already reframed it. A genuine docs-only PR that never grew code is never reframed. (This applies to Spec-implementation runs continuing a spec PR; a Simple run over an already-feature PR has nothing to reframe.)

To reframe, through the **update-pr** operation:

1. **Title** — rewrite `docs(specs): ${TITLE}` to the implementing-PR framing: the conventional type the change actually is (`feat:` for a new feature, `fix:` for a bug fix, etc.) plus the same subject, aligned with the spec's goal.
2. **Body** — replace the spec-PR body with the implementing-PR body: keep the `Refs #{issueId}` / `Closes #{issueId}` line (`om-auto-implement-spec` sets `Closes` when an issue drives the run) and the `Source doc:` / `Tracking plan:` lines, describe the shipped work under `## 🎯 Goal` / `## What Changed` / `## Tests`, and state the real `## 💥 Breaking Changes` assessed from the diff (no longer `None — design only` by default). Append the untouched original body verbatim in a collapsed section:

   ```markdown
   <details><summary>Original spec-PR description (for the record)</summary>

   {the spec PR's original title + body, unchanged}

   </details>
   ```

Post a one-line PR comment recording the reframe (old title → new title) so the change is auditable. Do this rewrite once, before the label normalization below — the label swap depends on it.

## Update the PR body

- If every row in the Tasks table now has `Status: done`, flip the PR body's `Status: in-progress` to `Status: complete` **and flip the PR from draft to ready via mark-pr-ready** — `om-auto-create-pr-loop` leaves the PR a draft while unfinished, so completing the resume is what promotes it. A resume that stays `in-progress` leaves the PR a draft the user can watch and re-enter.
- Extend the `What Changed` / `Tests` sections with the new work from this resume.

## Label normalization (resume state machine)

Labels — every mutation goes through the `apply_label`/`label_exists` guards from the tracker descriptor; when `labels.enabled` is `false`, skip every label operation and say so in the summary comment:

- **When the PR was reframed above (spec → feature):** its labels were set for a design-only doc and no longer fit. Replace the `documentation` category label with the category the implementation actually is (`feature`, `bug`, `chore`, …) and remove `skip-qa` — a spec PR's `skip-qa` no longer holds once runtime behavior ships (then apply `needs-qa` per the user-facing rule below). Re-assess the risk label: `risk-low` was assigned for a design-only change; a shipped feature is rarely still `risk-low` — raise it per the taxonomy when the code touches real surfaces. Comment the rationale for each change as usual.
- If the PR is still in a non-terminal pipeline state (`review`, `changes-requested`, `qa`, `qa-failed`, `merge-queue`, `blocked`, `do-not-merge`), keep it. Do NOT move a PR already in `merge-queue` back to `review` just because a resume happened.
- If the PR has no pipeline label (shouldn't happen, but may after an override), apply `review`.
- Add `needs-qa` if the resume introduces user-facing behavior. Add `skip-qa` only for clearly low-risk changes. Never both. If the resume newly introduces user-facing behavior on a PR previously in `merge-queue`, add `needs-qa` and drop any stale `qa-approved` — the QA sign-off no longer covers the new work; when `qaGate` is on, the QA-approval gate re-blocks the merge until QA re-approves. Do not set the `qa` pipeline label yourself; `qa` is applied manually by a QA reviewer when they re-test.
- Preserve the priority label; raise it only when the resume materially widens scope (e.g. now touches auth, money, data scoping, or a release-blocking area) and comment why. If the PR somehow has no priority label, infer and apply one per the config taxonomy.
- Preserve the risk label; raise it only when the resume materially widens the blast radius (e.g. now touches auth, money, data scoping, migrations, encryption, event reliability, shared contracts, or spans more areas) and comment why. If the PR somehow has no risk label, infer and apply one per the config taxonomy.
- Never add `qa-approved` and never set the `qa` pipeline label from this skill. When `qaGate` is on, a `needs-qa` PR may sit in `merge-queue` while the QA-approval gate blocks the merge until a QA reviewer adds `qa-approved`; when `qaGate` is off, `needs-qa` is advisory only.
- After any label change, post a short PR comment explaining why.

## Final tracking-file updates before releasing the lock

- Rewrite `HANDOFF.md` one last time with either "complete" or "still in-progress — next Step: X.Y".
- Append a closing `NOTIFY.md` entry with the final status, PR URL, and any carry-forward notes.
- Commit and push as `docs(runs): finalize handoff for ${SLUG}` (or a similar message).

## Release the lock

Release the in-progress lock — **always**, even on failure (use a trap/finally): when `$LABELS_ENABLED` is `true`, remove the `in-progress` label via **unlabel-pr**; then post the completion comment via **comment-pr** (preserve multi-line formatting; `${STATUS}` is the final PR status):

```text
🤖 `om-auto-continue-pr-loop` completed. Status: ${STATUS}. Lock released.
```

## Cleanup

```bash
cd "$REPO_ROOT"
if [ "$CREATED_WORKTREE" = "1" ]; then
  git worktree remove --force "$WORKTREE_DIR"
fi
git worktree prune
```

## Marker emission

End the run's final report with the chaining reference lines, one per line, exact shape — include `Issue:` only when the run has a subject issue:

```
Issue: #<issue number> (link: <full issue URL>)
PR: #<PR number> (link: <full PR URL>)
```

Chained consumers (`om-auto-review-pr`, `om-auto-qa-pr`, orchestration scripts) parse these exact text markers — never rename, translate, or decorate them.
