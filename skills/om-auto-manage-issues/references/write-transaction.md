# Short per-issue write transaction

Keep read-only scanning and expensive analysis outside ownership. All labels,
body changes, understanding/prep/spec/readiness comments and links use this
transaction, including `--relabel-only`. No content delta means no housekeeping
claim, audit comment, assignment or label.
`--dry-run` also prevents spec delegation. When only spec authoring remains, go
directly to step 6 without acquiring a housekeeping claim.

1. **Prepare without writes.** Compute the desired body, classifications and
   marker-idempotent comments. Record the source body/revision. Read **get-lock**,
   **get-issue**, **get-claim-reset** and the complete **list-issue-comments**;
   skip foreign/uncertain claims, foreign assignment or human-hold labels. A
   shared login is not ownership. Never take over stale claims in this skill.
2. **Acquire before writing.** Apply `references/claim-pr.md` with kind `issue`.
   GitHub/GitLab/Forgejo use **acquire-lock**; retain exact SHA/run/actor and
   register ownership-aware `finally` cleanup immediately. A losing fresh run
   writes no issue comment, assignment, label or body. Linear/Jira issue
   descriptors explicitly return `UNSUPPORTED`: only those issues use the
   shared complete-list **claim-winner** / **withdraw-claim** election. Their PRs
   still delegate to GitHub. Never infer fallback from missing operations,
   permission/API errors or failed reads; report the blocker instead. Comment
   election retains its documented visibility race and is not an atomic mutex.
3. **Re-read and recompute.** Read the issue and every comment again after
   ownership acquisition. Recheck state, assignees, human holds, reset history,
   current body, label groups and each marker. Discard obsolete proposals: a
   previous winner may already have applied them. On Git hosts, if no delta
   remains, release the acquired ref without posting a claim or changing the
   issue. Otherwise finish the shared audit/assignment/verified `in-progress`
   steps before the first content write. A disabled/missing/unverifiable
   secondary label blocks writes. Preserve the original assignee set and all
   unrelated human labels; clean up only state this run added.
4. **Apply only the fresh delta.** Before every mutation verify the exact atomic
   ref SHA/run/actor, or fallback elected comment/run, plus reset history. Check
   the latest labels before adding a missing group; find comment markers from
   the complete fresh list and update in place instead of posting duplicates.
   Before a body update compare the current body/revision with the analyzed
   source. A human edit invalidates that proposal: release, recompute outside
   the claim and retry only with fresh evidence. Never overwrite new text with
   an earlier proposal. Do not hold ownership through screenshot/code analysis,
   spec authoring, polling or another issue.
5. **Release on every exit.** Success, failure and an empty recomputed delta all
   run `finally`. Reverify ownership; clean only the owned secondary label and
   assignment, then **withdraw-claim** on the original audit comment with
   `Claim-State: released` (when one was posted). Call **release-lock** LAST on
   atomic claims with the exact expected SHA and owner identity; verify absence
   or a preserved successor. Fallback cleanup terminates only its own comment.
   Never delete or rewrite another run's claim, remove its label, or report a
   failed cleanup as released. Retain the exact claim evidence and blocker for
   retry if cleanup fails; a successor is never a retry target.
6. **Delegate after release.** When `--write-missing-specs` selected authoring,
   first verify the housekeeping claim is released (or none was acquired), then
   invoke `om-auto-write-spec`. It rechecks/owns its own claim. After its release, link
   the result only through a fresh short transaction and fresh spec/marker
   checks; concurrent authoring or a new human hold means skip, never override.

Update the existing label-rationale comment for this transaction's final label
state. Audit comments describe ownership; the normal per-issue report describes
only actual content changes, skips and retained cleanup blockers.
