# Claim handling

## Bot accounts with blocked assignment

When `CURRENT_USER` ends in `[bot]`, the tracker may reject self-assignment.
If the assignment operation reports that restriction, or a read-only
assignability check confirms it, continue without assigning the bot. Do not
interpret an unrelated authorization error or a failed human assignment as
this exception; record the actual assignment limitation once.

In this case, **use only the `in-progress` label as the claim flag**; keep the
normal claim/status comment for ownership and audit, including the bot login,
run/chain identifier and timestamp. Read back the label and comment through
**get-pr**/**get-issue** before producing work. If labels are disabled, missing,
unwritable or cannot be verified, stop with a claim blocker. Recheck existing
claims immediately before claiming; a competing or uncertain claim means back
off, not overwrite. A matching bot login alone does not prove re-entry: another
run can share it. Require the same run/chain identifier for re-entry or hand-off;
otherwise use the existing conflict/stale-lock rules.

This exception applies to every assignment/verification step below, including
skill-specific claims and chained hand-offs. Preserve existing assignees; on
release remove only this run's label claim and post its completion comment.
Never unassign or restore an assignee this run did not change. Label/comment
failures and all review, QA, merge and inherited-lock gates retain their normal
behavior. Human accounts and successful bot assignments keep the normal path.

## om-fix-issue-multi-optimized specifics

This staged role opens no PR claim. Issue runs invoke `om-fix` for claim acquisition and use the base `om-fix-issue` workflow for hold, abort, and release through named tracker operations. Aliases and the internal runtime never take independent claims.
