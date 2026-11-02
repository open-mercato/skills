# One final merge-summary comment

Run this only for a PR this skill is about to merge in effective
`prepare-and-merge` mode, after all final gates in `references/stages.md` hold.
It is one additional comment after the latest status update, not another status
or claim comment. Never post it for prepare-only, waiting, blocked, obsolete,
closed or externally merged items. It never grants a signal or approval.

## Before the merge

1. Reconstruct the important completed work across the entire process, including
   earlier visits/runs and any credited original/replacement chain. Read linked
   review/QA reports, fix commits, CI evidence, status history and available run
   logs. Current logs alone may omit earlier work. Include only verified facts;
   distinguish work the buddy performed from pre-existing evidence it reused.
   Historical fixes must still be present in the final diff. Verification claims
   must cover the final head under the normal signal rules; do not present stale
   tests as current. Link the decisive commit, report, run or comparison for each
   bullet. Unknown history is not permission to invent work.
2. Refresh the existing status comment with current readiness and next action.
   Then find the merge-summary marker via **list-issue-comments**, accepting the
   canonical backticked marker and its legacy bare-skill spelling. Verify authorship
   as this automation account or a trusted prior automation account; a copied
   outsider marker is never authoritative. Search the full comment history on
   resume/retry, not just a saved comment ID. Incomplete or unreadable history
   stops creation and merging; never infer that no prior summary exists. Create once via **comment-pr** with
   a body file; otherwise rewrite the existing comment via **update-comment**.
   If an existing trusted comment cannot be updated, do not post a duplicate.
   Failed/unknown comment writes must be reconciled through a fresh read before
   retrying; inability to confirm the one summary parks the PR `ready` without
   merging, with the concrete blocker in its status. Do not spend a stage attempt.
3. Immediately after the confirmed summary write, re-read head/target, queue and
   modifier labels, human vetoes/approvals and signal evidence. Apply all final
   gates again, including CI baseline proof when applicable. Recheck fenced
   ownership. Only then invoke **merge-pr** with the checked head SHA. No new
   producing stage or unrelated work belongs between summary and merge. The
   comment says merging is about to happen, never that it has already happened.
4. Confirm the merge via **get-pr**. On success, rewrite the same summary's bold
   action line to `🚀 Merged <head> into <target> — <merge commit link>.` Retain
   the evidence bullets. A refusal, changed head/mode, removed queue label, lost
   ownership or new blocker instead updates that same line to
   `⛔ Not merged: <specific reason>. Next: <action / owner>.` Reconcile under the
   normal finish rules. If the mutation result is unknown, read tracker state
   before any retry and say confirmation is pending until proved. A crash after
   posting is recovered by checking tracker state and updating this same comment;
   never append another summary on the next visit. A failed post-merge edit is
   reported as pending comment cleanup, never a reason to retry a confirmed merge.

## Comment template

Marker: `` 🤖 `om-auto-merge-buddy` — merge summary ``.

~~~markdown
🤖 `om-auto-merge-buddy` — merge summary

**🚀 Merging now: `<head>` into `<target>` — squash merge.**

- 🔍 Fixed <specific defect or review finding and resulting behavior> ([commit](url)).
- 🧪 Verified <named scenarios/commands and actual results> on `<head>` ([report](url)).
- 🧪 CI: <N checks passed, or precise baseline failures waived with proof> ([checks](url)).
- ⚠️ <Material risk override, protected approval or remaining limitation and its evidence; omit when none>.
- 📋 Deferred <specific remaining work> to <issue link>; it does not block this merge. {Omit when none.}
~~~

Use 2–6 short factual bullets, ordinarily under 150 words total. Keep only
important actions and final evidence; omit unused template bullets, generic
“reviewed/fixed everything”, stage counts, timestamps and process narration.
Name concrete defects, tests and outcomes. Include conflict/base integration or
replacement credit only when material. If nothing was changed, say which existing
review/QA evidence was verified and reused; never claim a fix. Distinguish QA
not required from QA passed. Never call waived red CI green. Include material
risk/CI waivers and required human approvals when used. Link evidence instead
of copying findings, logs, screenshots or the PR body. If an important deferred
item has no issue yet, say filing is pending and link its source; never invent
a tracking link or claim the follow-up was filed. Preserve useful bullets
from earlier attempts only after verification; update their final-head evidence.

The existing status, scheduler checkpoint and signal-record formats remain
unchanged. The summary has no machine authority and is never a merge gate
substitute. A bare summary marker is matched only for idempotent comment reuse.
