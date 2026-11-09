# Claim handling

## Run identity and compatibility

Generate an unpredictable `CLAIM_RUN_ID` once per top-level run (for example a UUID);
pass it unchanged, with the item and original claim comment id, to every chained
skill. Persist it in the execution plan or local run state for crash recovery.
A shared login, assignee, branch or skill name is never proof of re-entry, for
human accounts or bots. Require the same run id and comment id. A legacy claim
without these fields remains a foreign/uncertain claim until explicitly recovered.
Read-only skills inspect claims without posting candidates; aliases and staged
wrappers pass the driver's identity and never claim independently.

This procedure overrides inline assign/label/comment ordering and non-fatal claim
failure instructions elsewhere in the skill. No work product, assignment or label
mutation is permitted before atomic acquisition (or supported fallback election) succeeds. A claim blocker is a clean stop.

## Primary ownership — atomic when supported

Before the three-signal check, call **get-lock** for this repository/kind/item.
A live ref is an additional authoritative blocker even before its owner posts a
comment or applies `in-progress`. Read-only/skip-only roles inspect it and back
off without acquiring or releasing. An absent label/comment never cancels a ref.

GitHub, GitLab and Forgejo issues and PRs MUST use **acquire-lock**; GitHub
PRs under Linear/Jira delegate to GitHub. Create the descriptor's reserved ref
exactly once, pointing to a unique metadata commit binding run id, actor and item.
GitHub/Forgejo use `refs/om-locks/{kind}-{number}`; GitLab uses
`refs/heads/om-locks/{kind}-{number}` because arbitrary namespaces are not assumed.
A 422 is not itself proof of a conflict;
read the exact ref to identify the winner. Same-login contenders still have
different run ids and SHAs. Persist `CLAIM_LOCK_SHA` and pass it with the run id
and comment id through every chain step. Re-entry requires matching ref SHA,
actor and run, plus the original comment id once posted. A lost acquisition or
uncertain read stops before comments, assignment, labels or work.

Only providers explicitly returning `UNSUPPORTED` select comment election below.
Missing Git-host operations, repository-write permission, authenticated Git transport
or API availability are upgrade/permission blockers, NEVER permission to run two
lock protocols against one item. Older custom descriptors must be upgraded first
for GitHub/GitLab/Forgejo; non-atomic trackers retain complete-list/edit fallback. Do not invent
an automatic capability probe that silently changes Git-host claims to comment mode.

After atomic acquisition, post the normal claim comment once, retaining its
legacy first line and `Claim-Run`, `Claim-Actor`, `Claim-State` fields. Also record
`Claim-Lock` (full ref) and `Claim-Lock-SHA`. These ids are audit evidence; the ref
owns the item. Reconcile a lost comment response by run/SHA before reposting.
Only then assign when supported, apply/read back `in-progress` as the mandatory
second check, and re-read the exact lock before work. Comment or label failure
aborts acquisition with ownership-aware cleanup and exact-SHA release. Register
cleanup as soon as the ref is acquired, including if comment creation fails.

Hold the ref through every skill hand-off, stage and cleanup. Reverify the exact
SHA/owner and reset history before each mutation, phase, commit/push or staged
publication. After owned label/assignment cleanup and marking the comment
released through **withdraw-claim**, call **release-lock** LAST. It uses Git's
explicit expected-SHA lease to compare-and-delete; never use unconditional REST
DELETE or force-update a lock ref. Changed/malformed ownership blocks cleanup.
No caller-worktree refs or existing project branches change during lock operations; this
narrow housekeeping exception does not authorize publishing staged project work.

### Atomic stale/force/UI recovery

Read the exact prior lock and establish the existing stale/force authorization or
the audited human `claim-reset` cutoff; UI recovery requires the server metadata
commit time strictly before the reset. Same-second/unknown age stays blocking.
GitLab/Forgejo return unknown server creation time (`createdAt: null`);
`metadataCreatedAt` is diagnostic, never authorization for time-based/UI recovery.
Without an authenticated server creation-time audit, those recovery paths block;
only explicitly authorized force recovery with verified stopped workers remains.
Check local reservations/delegated workers are stopped, never just old. Record
the prior owner/run/SHA in the takeover note. Call **release-lock** with that
observed prior owner record only under this authorized recovery; its SHA lease
prevents two recovering runs from deleting a newly acquired successor. Then
compete through create-only **acquire-lock**; recovery does not grant ownership.
If release sees a different SHA, stop or re-read and report that new owner; never
retry against the replacement. Old runners whose SHA disappeared stop without
editing successor comments or labels. Historical resets do not retire newly
created metadata commits. Reuse an old `in-progress` only after acquiring the
new ref and proving all previous signals belong to the recovered owner.

Normal Git-host acquisition is atomic. Recovery still relies on correct human/stale
liveness decisions; an already running command cannot be remotely cancelled by
a ref or label. Stop the stalled runner first. Comment-only trackers retain the
visibility race below. Upgrade all claimers together: old versions ignore refs.

## Bot accounts with blocked assignment

When `CURRENT_USER` ends in `[bot]` and assignment is confirmed unavailable (an
explicit assignability result or assignment-specific rejection), omit assignment.
A generic 403 does not prove an assignment restriction. Do not change credentials.
The atomic ref owns Git-host claims; the elected comment owns fallback claims; verified `in-progress` remains
the second check. Preserve existing assignees. Do not assign or restore anyone on
release unless this run changed that assignment. Comment/label failures still
block work; this exception relaxes only assignment, never foreign-claim checks.

## GitHub UI recovery — `claim-reset`

If a runner stalls, a human with label-management permission first stops that
runner (including delegated workers), then adds `claim-reset` in the issue/PR's
GitHub **Labels** menu. Do not merely remove `in-progress`: its active ref/comment
still blocks. No bot ever applies `claim-reset`. The next invocation calls
**get-claim-reset** and reports the verified human actor/time and retired claim ids.
A request does not itself restart a runner or clear local scheduler leases.
Retired foreign comments remain unchanged, even if they still say
`Claim-State: active`; the audited cutoff and takeover note record retirement.

Use the latest audited reset cutoff even if the label was later removed. Claims
created strictly before that cutoff are retired, including old legacy claims;
same-second or unknown timestamps stay uncertain. Never ignore comments created
after the reset: concurrent replacement runs still elect exactly one candidate.
An existing `in-progress` may be reused as the second check only when every
previous claim owning it is verified retired and no unrelated owner signal
remains; unrelated human assignees still block. Preserve existing assignees.
Keep the label as a recovery breadcrumb; remove and reapply it for a later reset.

Every active owner checks reset history and re-verifies its candidate before
starting another phase/stage, tracker mutation, commit/push, release or staged
publication. A reset newer than its comment candidate or atomic metadata commit revokes ownership: stop, report
superseded, and leave the new owner's labels/comments untouched. No cleanup of
another run's state. This is cooperative fencing, not cancellation of an already
running shell command; stop the stalled runner before applying the reset. A
staged handoff's claim is also revoked; publication must reacquire and revalidate.

Missing **get-claim-reset**: if `claim-reset` is present, stop with a descriptor
upgrade blocker. Without a requested reset, ordinary election uses the legacy
listing/editing fallback. An unsupported provider cannot promise UI recovery;
never treat failed event/permission reads as no reset. `--force` and UI reset
never waive live local reservations, QA, review, CI or merge gates.

## Applying the fallback claim — only non-atomic providers

Run this section only when the provider explicitly lacks an atomic primitive.
GitHub, GitLab and Forgejo use the primary procedure above, never comment candidates.

1. Read **get-claim-reset** and apply the UI recovery rules above, then re-read
   the item and **list-issue-comments**, including every page. Apply the
   three-signal check and the skill's existing stale windows. Live or uncertain
   foreign claims block, including legacy `🤖 Claiming this …`, `autofix started`,
   take-over/hand-off and skill status claims. For legacy candidates only, respect later release/abort records from the same
   owner; explicit `Claim-State: active` remains live until its own terminal
   state or a verified reset/recovery. A summary cannot release a new candidate. Summary, review, label
   and evidence comments are not claim candidates. Never use a truncated PR
   `comments` field or a failed read as an empty claim list.
2. Re-entry updates the original comment via **update-comment**; it never posts
   another candidate. Otherwise post one candidate via **comment-issue** or
   **comment-pr**, preserving the existing first line (including skill-specific
   legacy prefixes), and capture its server-assigned conversation comment id.
   The standard prefix remains:

   `` 🤖 Claiming this {issue|PR} — starting `{skill-name}` run. Started: {ISO-8601 timestamp}. ``

   Append these exact standalone fields (the actor must match the authenticated
   comment author; never accept another actor's self-declared identity):

   ```text
   Claim-Run: {CLAIM_RUN_ID}
   Claim-Actor: {CURRENT_USER}
   Claim-State: active
   ```

   An uncertain post is reconciled by run id through a full read before retrying;
   if zero or multiple matches cannot be resolved, stop rather than create a
   second live candidate. Bind `CLAIM_COMMENT_ID` to this item and repository.
3. Read every comment again and build `LIVE_CLAIM_IDS` from all live candidates,
   including legacy/uncertain claims, not just this login or skill. Explicitly
   `released`/`withdrawn` comments are excluded. Apply the existing stale policy;
   age alone never expires an active owner. **claim-winner** returns the lowest
   server creation-order candidate and its owner. Numeric ids are compared
   numerically, not lexically; opaque ids use creation timestamp then id as the
   deterministic tie-break. Require this candidate to appear in the fresh read.
   Repeat the complete read and election after a short bounded settle interval
   (e.g. 2 seconds, at most 3 attempts). Both reads must select this exact id.
   Disagreement, missing candidates or an unreadable list stops work.
4. A loser calls **withdraw-claim** on only its own candidate, setting
   `Claim-State: withdrawn` and recording the winner's actor/run/id. Keep it as
   an audit record, not an active claim. Report that owner and stop; do not
   assign, label, remove `in-progress`, release the winner or produce work.
   Failed withdrawal is a blocker with the exact outstanding comment id.
5. Only the winner assigns `CURRENT_USER` (unless confirmed bot restriction),
   then applies `in-progress` through the label guard and reads both back. A
   missing/disabled/unwritable/unverifiable label blocks acquisition, for humans
   and bots alike: retaining it as the second check is mandatory. Verify the
   comment id/run/state and winner once more after these writes, before work.
   Register ownership-aware cleanup on every exit; permission failures are never
   non-fatal. If verification fails, withdraw this run's candidate; undo only
   this run's mutations when a fresh read proves no other live owner needs them.
   Never remove a label or assignment when ownership is uncertain.

### Older descriptors and visibility limits

Always route election/withdrawal and fallback reads/edits by item kind and
repository: split-provider PRs use the code-host companion, tracker issues use
the issue provider. Never send a GitHub PR comment id to an issue tracker.
When **claim-winner** is missing, perform its documented election locally from
**list-issue-comments**; when **withdraw-claim** is missing, use **update-comment**
to rewrite the owned candidate with its terminal state. These are named tracker
operations, never inline provider CLI commands. If the descriptor cannot list all
comments or rewrite the owned candidate, stop with an upgrade blocker. Posting a
replacement while leaving an active candidate behind is not a safe fallback.

Comment election is the fallback for providers without an atomic primitive.
Git hosts use create-only refs and repository-write permission; never downgrade
GitHub, GitLab or Forgejo claims silently. Comments and their ids remain additional audit evidence. Comment
reads can miss a competing write through eventual consistency, even after repeated
verification; simultaneous stale recovery has the same residual race. The failure
mode is duplicated work, not data loss. Do not advertise this as an atomic mutex.
Old installed versions do not participate in election; upgrade all claimers together.


## om-harness specifics

This staged role opens no PR claim. Issue runs invoke `om-fix` for claim acquisition and use the base `om-fix-issue` workflow for hold, abort, and release through named tracker operations. Aliases and the internal runtime never take independent claims.
