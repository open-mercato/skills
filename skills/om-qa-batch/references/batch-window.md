# Batch window: which PRs the batch holds (steps 1-2)

A batch is only as good as its PR list. Every rule here exists so the list
is exact, never short.

## Find the batch (step 1)

1. `{target}` given → **get-pr** with `number,title,url,state,author,headRefName,headRefOid,baseRefName,labels,assignees,createdAt`.
   Its head branch must start with `qaBatch.branchPrefix`; otherwise stop
   and say it is not a batch PR.
2. No target → **list-prs** state open, limit 20, and keep PRs whose head
   branch starts with the prefix. None → tell the tester there is no open
   batch and offer `--range` or `--since`. More than one → the process keeps
   one open batch at a time: take the oldest, list the others, and warn.
3. `TO` = the batch PR's head SHA. Record it: every output and the verdict
   name this exact SHA, because the batch can still move (stabilization
   fixes land on it).
4. Fetch the batch branch and the base branch from the remote so the range
   is computed on current history.

## Find where the previous batch ended

`FROM` is the newest of these that exists, in this order:

1. The `Range: <from>..<to>` line in the `` 🤖 `om-qa-batch` — batch verdict ``
   comment of the most recent earlier batch PR (closed or merged, same head
   prefix, found with **list-prs** state closed). Use its `<to>`.
2. The newest tag starting with `qaBatch.greenTagPrefix` that is an
   ancestor of `TO` (`git merge-base --is-ancestor`).
3. `--since <date>`; otherwise stop and ask the tester for `--range`.

Print which source was used. When `FROM` is not an ancestor of `TO`, stop:
the range would be wrong.

`--range <from>..<to>` skips the search; both ends must resolve to commits.
`--since <date>` skips the git range: run **list-prs** state merged with
search `merged:>=<date>` and base `BASE_BRANCH`, split into date chunks while
a chunk returns the limit, and mark every output "approximate (date-based)".

## Enumerate (step 2)

```bash
git log --first-parent --format='%H%x09%s' "$FROM..$TO"
```

For each commit:

- Subject ends with `(#<n>)` (squash merge) or starts with
  `Merge pull request #<n>` → PR `<n>`.
- Otherwise **search-prs** with the commit SHA. Still nothing → keep the
  commit in the list as `(no PR found)` with its subject.
- Deduplicate by PR number. A merge commit that brings an earlier batch back
  into the base also lists that batch's stabilization PRs; they were tested
  in that batch and go to the covered appendix as "earlier batch".

PRs whose base is the batch branch are this batch's stabilization fixes.
They matter for `--retest`, not for the first checklist.

## Per-PR facts (step 3)

For each PR:

- **get-pr** with `number,title,url,author,baseRefName,headRefOid,labels,mergedAt,body`;
- **get-pr-files** for path and status (added, modified, removed, renamed);
- **list-issue-comments** for author, body and time; keep only comments that
  carry a `<!-- qa-triage v1` block or the review automation's QA test
  instructions (a comment whose marker names `om-auto-review-pr` and
  🧪 QA test instructions), plus the PR body's own testing notes.

A PR whose metadata cannot be fetched stays in the checklist appendix as
`(metadata unavailable)` and is counted; never guess its bucket.
