# Record a direct automerge decision

Use this procedure in A6. The summary explains the merge to maintainers. The
A4 status comment remains the machine-readable signal record.

## Before the merge

1. Gather the decisive evidence across the run and any earlier visits. Link
   review, QA, local validation and the latest host check snapshot for the head
   A6 is about to merge. Name material fixes only when verified in the final
   diff. Include the activation source and target. Record QA as passed or not
   required, with the actual reason. Include the commands and results in the
   linked local validation evidence. If the existing link lacks command
   results, add them to the status prose and link that comment. Report host
   checks by their observed states (passed, pending, skipped or no checks
   reported). An unreadable check query blocks the merge. A local pass only
   vouches for the configured local commands.
2. Refresh the A4 status prose with the current readiness and next action. Use
   **list-issue-comments** to search the full PR conversation for either direct
   merge summary marker: `` 🤖 `om-auto-fix-issue` — merge summary `` or
   `` 🤖 `om-auto-fix-pr` — merge summary ``. Match the first nonempty line
   exactly, accepting legacy bare-skill spelling for lookup. Accept the current
   automation account or an explicitly trusted prior automation author. A copied
   outsider marker has no authority.
   If one trusted summary exists, keep its skill name and use **update-comment**.
   If none exists, create it via **comment-pr** using the invoking skill's
   canonical marker. Use a body file for both writes. Incomplete history,
   multiple trusted summaries, or inability to update an existing summary
   blocks the direct merge. Never create a duplicate to recover from an edit
   failure. After a failed or ambiguous write, read the full history again
   before any retry. Confirm the intended body and unique trusted comment ID
   before returning to A6's final gate.
3. When A6 rechecks the gates, compare the decision evidence with the summary.
   If it changed but all gates still hold, refresh the same summary and
   repeat the final gate once. If it changes again, leave the PR armed and
   record why. For the plain guarded fallback, update the merge method in the
   same comment and run the final gate again before calling **merge-pr**.

## After the attempt

Use **get-pr** after each mutation to resolve its outcome. Confirm
the merged state, target, head and merge commit. On confirmation, update the
same summary with the commit link. Name the actor and method only when the
mutation response or tracker evidence proves them. If the merge cannot be
attributed to this run, record the observed merge and describe the bullets
as the earlier attempt's evidence. On a definite refusal or a newly blocked
gate, record the exact reason and the next action. If ownership was lost,
report the reason without editing the PR and leave reconciliation to the
claim owner. If the result is still
unknown, say confirmation is pending and leave it for reconciliation. Retry
only for the documented missing-bypass-rights refusal, after confirming the PR
is still open. A confirmed merge ends all merge attempts.

Keep the A4 status prose and A5 report consistent with the confirmed state.
Preserve the status comment's signal fields. When revisiting a known PR after an
interruption, reconcile its existing unfinished summary from tracker state
before attempting any merge. Reuse the comment and revalidate its evidence for
any new attempt. Never create a summary retroactively for an external merge.
If a post-merge edit fails, report the outstanding comment update with its link
and proceed with claim release. On a confirmed merged PR, a later explicit
`om-auto-fix-pr {prNumber} --automerge-force` can reconcile either route's
unfinished summary after any active claim ends. Check ownership through the
claim procedure, read the tracker result and edit only the existing trusted
summary and the matching status prose. A finished or missing summary needs no
action.

## Comment template

~~~markdown
🤖 `{invoking skill}` — merge summary

**🚀 Merging `<head SHA>` into `<target>` by squash with <host bypass requested / plain guarded merge>.**

- 🎯 Direct automerge was requested by <flag or tracker label>.
- 🔍 `automerge-signal-1-cr` held on this head. [Review evidence](url)
- 🧪 `automerge-signal-2-qa` held because <QA passed / QA was not required and why>. [QA evidence](url)
- 🧪 `automerge-signal-3-passes-local-ci-checks` held after all <N> configured validation commands passed. [Local validation](url)
- 🧪 Hosted CI reported <named checks and states, or counts with links to the check details>. [Hosted checks](url)
~~~

On success use **🚀 Merged `<head SHA>` into `<target>` by squash with
<host bypass / plain guarded merge>. [Merge commit](url)**. On refusal use
**⛔ Direct merge stopped because <reason>. <Next action>.** Use two to six
short factual bullets, omit unavailable links, and link evidence instead of
copying raw logs. Mention pending or missing hosted checks when bypass was used.
The summary provides no authorization, signal or approval.
