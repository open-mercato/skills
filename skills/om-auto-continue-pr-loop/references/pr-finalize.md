# Update the PR, normalize labels, release the lock (step 9)

This step **updates the existing PR** — it never opens a new one (the duplicate-PR collision `om-auto-create-pr/references/pr-open-reuse.md` guards against). Its commit/push and label-normalization mechanics follow that shared reference: **prefer the `om-open-pr` skill when installed** (reuse its push + label normalization instead of duplicating it), falling back to the inline tracker operations below when it is not — so this skill works standalone.

Update the PR body:

- If every row in the Tasks table now has `Status: done`, flip the PR body's `Status: in-progress` to `Status: complete`.
- Extend the `What Changed` / `Tests` sections with the new work from this resume.

Labels — every mutation goes through the `apply_label`/`label_exists` guards from the tracker descriptor; when `labels.enabled` is `false`, skip every label operation and say so in the summary comment:

- If the PR is still in a non-terminal pipeline state (`review`, `changes-requested`, `qa`, `qa-failed`, `merge-queue`, `blocked`, `do-not-merge`), keep it. Do NOT move a PR already in `merge-queue` back to `review` just because a resume happened.
- If the PR has no pipeline label (shouldn't happen, but may after an override), apply `review`.
- Add `needs-qa` if the resume introduces user-facing behavior. Add `skip-qa` only for clearly low-risk changes. Never both. If the resume newly introduces user-facing behavior on a PR previously in `merge-queue`, add `needs-qa` and drop any stale `qa-approved` — the QA sign-off no longer covers the new work; when `qaGate` is on, the QA-approval gate re-blocks the merge until QA re-approves. Do not set the `qa` pipeline label yourself; `qa` is applied manually by a QA reviewer when they re-test.
- Preserve the priority label; raise it only when the resume materially widens scope (e.g. now touches auth, money, data scoping, or a release-blocking area) and comment why. If the PR somehow has no priority label, infer and apply one per the config taxonomy.
- Preserve the risk label; raise it only when the resume materially widens the blast radius (e.g. now touches auth, money, data scoping, migrations, encryption, event reliability, shared contracts, or spans more areas) and comment why. If the PR somehow has no risk label, infer and apply one per the config taxonomy.
- Never add `qa-approved` and never set the `qa` pipeline label from this skill. When `qaGate` is on, a `needs-qa` PR may sit in `merge-queue` while the QA-approval gate blocks the merge until a QA reviewer adds `qa-approved`; when `qaGate` is off, `needs-qa` is advisory only.
- After any label change, post a short PR comment explaining why.

Final tracking-file updates before releasing the lock:

- Rewrite `HANDOFF.md` one last time with either "complete" or "still in-progress — next Step: X.Y".
- Append a closing `NOTIFY.md` entry with the final status, PR URL, and any carry-forward notes.
- Commit and push as `docs(runs): finalize handoff for ${SLUG}` (or a similar message).

Release the in-progress lock — **always**, even on failure (use a trap/finally): when `$LABELS_ENABLED` is `true`, remove the `in-progress` label via **unlabel-pr**; then post the completion comment via **comment-pr** (preserve multi-line formatting; `${STATUS}` is the final PR status):

```text
🤖 `om-auto-continue-pr-loop` completed. Status: ${STATUS}. Lock released.
```

Cleanup:

```bash
cd "$REPO_ROOT"
if [ "$CREATED_WORKTREE" = "1" ]; then
  git worktree remove --force "$WORKTREE_DIR"
fi
git worktree prune
```
