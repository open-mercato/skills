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

`FROM` is the first usable source, in this order. A source is usable only
when it resolves to a commit that is an ancestor of `TO`
(`git merge-base --is-ancestor`); an unusable one counts as missing and the
next is tried:

1. The `Range: <from>..<to>` line in the `` 🤖 `om-qa-batch` — batch verdict ``
   comment of the most recent earlier batch PR that was merged (same head
   prefix, found with **list-prs** state closed; skip any closed without
   merging, it never reached the base). Use its `<to>`. A batch that was
   squash-merged leaves a `<to>` outside `TO`'s history: use
   `git merge-base <to> TO` instead, the base commit that batch was cut
   from, and say so — the squash commit then appears in the range as an
   earlier batch PR (see Enumerate).
2. The newest tag starting with `qaBatch.greenTagPrefix` that is an
   ancestor of `TO`. A tag left on a squash-merged batch branch is not an
   ancestor; source 1 already covers that batch, so this case needs
   `--since` only when source 1 found no verdict comment.
3. `--since <date>`.

Print which source was used and why any earlier one was skipped. Stop and
ask the tester for `--range` only when none is usable.

`--range <from>..<to>` skips the search; both ends must resolve to commits
and `<from>` must be an ancestor of `<to>`, otherwise stop: the range would
be wrong.
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
- Deduplicate by PR number.
- **Earlier batch PRs.** A mapped PR whose head branch starts with
  `qaBatch.branchPrefix` (read `headRefName` with **get-pr**) is an earlier
  batch merged back into the base, by squash or merge commit — not a change
  to test. Remove it from the PR list, so it never reaches the classifier or
  `candidates`, and put it in the covered appendix as "earlier batch #<n>".
  Expand it: **list-prs** state merged with base = its head branch gives its
  stabilization PRs; they were tested in that batch and go to the same
  appendix.

PRs whose base is the batch branch are this batch's stabilization fixes.
They matter for `--retest`, not for the first checklist.

## Per-PR facts (step 3)

For each PR:

- **get-pr** with `number,title,url,author,baseRefName,headRefName,headRefOid,labels,mergedAt,body`;
- **get-pr-files** for path and status (added, modified, removed, renamed);
- **list-issue-comments** for author, body and time; keep only comments that
  carry a `<!-- qa-triage v1` block or the review automation's QA test
  instructions (a comment whose marker names `om-auto-review-pr` and
  🧪 QA test instructions), plus the PR body's own testing notes.

A PR whose metadata cannot be fetched stays in the checklist appendix as
`(metadata unavailable)` and is counted; never guess its bucket.
