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

`FROM` is the end of what the previous batch's QA actually tested, so
`FROM..TO` is every commit in `TO` that tested build did not contain. It
need not be an ancestor of `TO`: after a squash merge-back it never is, and
git's `FROM..TO` still means "reachable from `TO`, not from `FROM`". A
source is usable when it resolves to a commit (validated as in
`references/trusted-comments.md` §4); the first usable one wins:

1. **The previous green tag** (the release-process spec reads the batch
   range from the previous `green/*` tag once tags exist). The newest tag
   starting with `qaBatch.greenTagPrefix` created before the current batch
   PR (tag `creatordate` earlier than the batch PR's `createdAt`), so a tag
   already put on this batch is never its own start:
   `git for-each-ref --sort=-creatordate --format='%(refname:short) %(creatordate:iso-strict)' "refs/tags/$GREEN_PREFIX"`,
   then `git rev-parse "<tag>^{commit}"`. The tag never moves, so it is the
   exact tested build.
2. **The previous batch's tested head**, while no green tag exists yet: the
   `QA head:` of the newest trusted verdict on the most recent earlier batch
   PR that was merged (same head prefix, **list-prs** state closed; skip any
   closed without merging). Read it only under
   `references/trusted-comments.md`; untrusted verdicts are ignored and
   listed.
3. `--since <date>`.

Never start from the previous batch PR's head (`headRefOid`): a merge-back
conflict is resolved by merging the base into the batch after the green tag
and the verdict, so that head contains base PRs no tester saw, and starting
there would drop them from this checklist. When source 1 and a trusted
verdict both exist and disagree, use the tag and report the difference.

Print which source was used and why any earlier one was skipped. Stop and
ask the tester for `--range` only when none is usable.

`--range <from>..<to>` skips the search; both ends must resolve to commits,
otherwise stop.
`--since <date>` skips the git range: run **list-prs** state merged with
search `merged:>=<date>` and base `BASE_BRANCH`, split into date chunks while
a chunk returns the limit, and mark every output "approximate (date-based)".

## Enumerate (step 2)

Walk every commit in the range, not only the first-parent line: the base
is merged into a batch on a day with no tester (the open batch grows with
the base) and to resolve a merge-back conflict, and the PRs that arrive
through those merges are on a second parent.

```bash
git log --format='%H%x09%P%x09%s' "$FROM..$TO"
```

For each commit:

- Subject ends with `(#<n>)` (squash merge) or starts with
  `Merge pull request #<n>` → PR `<n>`. For a PR merge commit, the commits
  only its second parent brings (`git log "<merge>^1..<merge>^2"`) belong
  to that PR: do not look them up again.
- A merge commit with no PR of its own (the base merged into the batch,
  e.g. GitHub's "Update branch" or a conflict resolution) is not listed
  itself; the PRs it brings in are found through their own commits.
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
