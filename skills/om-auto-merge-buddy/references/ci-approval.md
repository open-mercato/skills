# Release CI held for workflow approval

A workflow awaiting permission to run is an actionable CI prerequisite. When the
current operator can approve it, release it before choosing `waiting-human`,
`blocked`, or a CI repair stage. Approval is not a passed check, a review or QA
sign-off, and does not authorize deployment/environment approvals.

## Detect and release

1. Read **get-pr**, **get-pr-files**, **get-pr-checks** and **list-runs** for the
   exact current head SHA. Inspect workflow-level state even when the check list
   is empty or green: held workflows can have no jobs/checks yet. Use **get-run**
   when needed to distinguish a host workflow-approval hold from another
   `action_required` result. Do not treat missing jobs alone as proof of a hold.
2. Verify current queue authorization, ownership and human vetoes. Apply the
   existing CI-definition restriction: approve only when the complete changed-file
   list touches no CI or workflow definitions; outside-contributor changes to
   those definitions require maintainer inspection. An incomplete diff or state
   read cannot authorize approval. Protected-area human review/QA gates remain
   required for merging; releasing safe CI does not satisfy them.
3. Call **approve-pending-runs** with the current PR number and head SHA. This is
   the permission check: do not infer inability from fork status, author
   association, or the host's phrase “requires human approval.” If the descriptor
   lacks this operation, record the missing capability and an upgrade action;
   never bypass the tracker abstraction. Limit approval to this PR's current
   head; do not approve unrelated or superseded-head runs.
4. Read back **get-pr**, **list-runs** and **get-pr-checks** after the operation,
   including after an empty or partial result. Record released run IDs/links and
   any refusal in the existing status comment and run log. A moved head requires
   fresh reconciliation; an approval for the previous head grants no signal.
   Successful releases normally become `waiting-ci` with `ci-monitoring`, without
   a stage attempt. Reconcile all current-head runs/checks normally: completed
   passes can grant CI, actual failures go to stage 3, and unresolved holds keep
   CI ungranted. Apply the descriptor completeness guard before any CI pass.
5. A verified permission refusal, unsupported host gate, unsafe workflow diff, or
   hold still present after readback needs a concrete blocker: run links, attempted
   operation/result, who can act and what action is required. Do not retry a
   refused approval in a tight loop or spend repair attempts on it. Retry only
   when permissions, head or held-run state changes. Other failures and merge
   gates retain their normal routing.

Run this check at entrance, on CI revisits, and immediately before launching
stage 3 or parking a PR for workflow approval. It is a cheap prerequisite,
not a producing stage; never increment or reset repair attempts merely for an
approval. Pending run duration is measured after release, so days spent awaiting
approval do not immediately classify a newly queued run as a stuck runner.

## Recover an approval-only blocked PR

The normal `automerge-blocked` off switch remains in force. Its sole exception is
a cheap workflow-approval recovery visit when the buddy's own verified status
comment explicitly identifies awaiting workflow approval as the only blocker for
the current head. Unknown, human-added, mixed-reason, unsafe-workflow, attempt-cap
or unrelated blocks stay blocked; do not clear them based on an `action_required`
run alone. A foreign live claim, human veto or removed queue label still stops
recovery. Use the normal scheduler reservation and verified claim for mutations.

After the procedure above, remove `automerge-blocked` through **unlabel-pr** only
when fresh readback proves the approval hold cleared and no other recorded block
remains; verify removal and explain it in the same status comment. Reconcile all
signals and route running CI to `waiting-ci`, rather than merging on the approval.
Preserve review/QA requirements and existing attempt counts. If the hold was
already cleared externally, fresh readback can recover the same approval-only
block without another approval call. No metadata or signal format changes.

## Decision scenarios

- Empty check list, current-head workflows held, unchanged CI definitions and a
  permitted operator: approve, verify release, park `waiting-ci`; zero attempts.
- Green visible checks plus another held workflow: release it; CI stays pending
  until workflow-level completion is verified.
- Fork PR with no CI-definition changes: try the named operation; fork status is
  not a permission refusal. Denied approval records an actionable human blocker.
- Outside-contributor CI-definition changes or incomplete file read: no approval;
  preserve the maintainer-inspection block.
- Partial approval or a head change during the call: read back and reconcile;
  never grant CI or erase an unresolved hold from successful IDs alone.
- Approval-only buddy block with a released current-head run: clear only that
  block, keep attempts and re-check signals. Human, unknown, attempt-cap or
  mixed-reason blocks remain untouched.
- A released run fails, or protected human QA is still missing: the corresponding
  repair/human gate still applies; workflow approval never permits merging.
