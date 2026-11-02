# Deferred findings — automatic follow-up issues

After a stage reports, read its `evidence=` work product through **get-pr**
(reviews), **get-pr-comment** or **get-review-comment** as applicable. Do not
infer findings from the one-sentence `RESULT:` reason alone. The orchestrated
stage keeps a `Deferred follow-ups` section containing each intentionally
unresolved actionable item: stable finding id, source location, concrete ask,
reason for deferral and acceptance criteria. Collect only those explicit items
from stages this run executed, plus pending items already in the handoff.

## Eligibility and bounds

- File actionable deferred nits, nonblocking findings and out-of-scope work. Do not invent work from passing checks, praise, questions or a missing section. An out-of-scope blocker may have a tracking issue, but retains its `blocked` outcome.
- Never use issue creation instead of fixing an actionable blocker or major finding within scope. Issue links do not grant CR, QA or CI; the stage's verdict and signal rules stay authoritative.
- Process the finite candidate list sequentially, with at most one helper invocation per unique finding per run. No retry loop, historical backlog sweep, or extra design-document issue creation is authorized. Stop starting filing when the positive window has no stage reserve; keep the remaining items pending. A zero-window snapshot processes its finite list once.

## Stable source and idempotency

1. Assign a stable key from repository, original PR number, source finding id and source location. Preserve the same key through replacements and resumes; never include a run id or mutable head SHA in the key.
2. Find or create one automation-authored actionable conversation comment per key, using **list-issue-comments**, **comment-pr** and **update-comment**, with marker `` 🤖 `om-auto-merge-buddy` — follow-up <key> ``. State the concrete ask, acceptance criteria, deferral reason and original evidence link; redact secrets. Keep its exact comment URL stable. A native review URL is evidence, not a supported helper input: this dedicated comment supplies the specific actionable comment URL.
3. Before creating an issue, inspect the comment's existing `Issue:` mapping, the handoff and current status comment. Then use **search-issues** on the configured issue tracker in both open and closed states, searching the exact source-comment URL and stable key. Reuse an exact matching issue, even when closed; do not reopen it automatically. Treat an unreadable, truncated or unsupported-state search as incomplete and leave the item pending. An empty open-only search never authorizes creation. Comment-mode dedupe is the orchestrator's responsibility.
4. No match and a complete search → invoke **`om-followup-issue-from-pr <specific-comment-url>`** by exact skill name in comment mode. The concrete linked ask authorizes this one issue; skip optional design-doc tracking in this invocation. Never pass `--orchestrated` to this helper; it is not an `om-auto-*` stage and does not support that flag. It does not acquire or release the PR's claim.
5. Capture the helper's exact `Issue: #<n> (link: <url>)` result and record it immediately in the stable source comment, the PR status comment and `HANDOFF.md`'s Follow-ups section. Cross-link the source evidence and issue; preserve the mapping when the PR is replaced. If a crash happened after issue creation but before this write, the next run's exact open/closed source-link search recovers that issue instead of creating another.
6. A missing helper, ambiguous ask, unsupported URL, missing permission or failed invocation stops this item's filing cleanly: record `pending` with the specific reason and install/recovery action, and continue other items without inventing tracker commands. Missing or malformed `Issue:` output is pending, never assumed success. Do not ask mid-run. Report the limitation and retain it for a later run, even after the source PR merges or closes.

A final handoff with pending filing work is `window-ended`, not `closed`.
Resumption processes that work before dropping closed/merged PRs from the
active merge queue. A successfully filed issue remains linked in the report;
its implementation is future work, outside this merge-buddy run.
