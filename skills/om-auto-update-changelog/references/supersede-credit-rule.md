# Supersede Credit Rule

The credited-author resolution algorithm `om-auto-update-changelog` runs in
step 4 to compute `primaryAuthor` and optional `viaAuthor` for every merged PR.

The problem: when `om-auto-review-pr` carries a fork contributor's PR forward, the **merged** PR's author field is the reviewer, not the original contributor — who did the work and must get the credit. Three detection paths, in priority order:

## Path A: `Supersedes #N` in the PR body

`om-auto-review-pr` writes this template when it carries a fork PR forward. Regex (anchored to the first 20 lines of the body, case-insensitive):

```
^Supersedes\s+#(\d+)\b
```

When matched, resolve the superseded PR's author via the tracker operation **get-pr** (field `author`) for `{supersededPrNumber}`. Set `primaryAuthor` to that author and `viaAuthor = mergedPrAuthor`. Emit `(supersedes #M)` in the summary text.

## Path B: `Credit: original implementation by @user` in the PR body

Same template, also written by `om-auto-review-pr`. Regex:

```
Credit:\s+original\s+implementation\s+by\s+@([A-Za-z0-9][A-Za-z0-9-]{0,38})
```

When matched, set `primaryAuthor` from the captured handle and `viaAuthor = mergedPrAuthor`. No `supersedes #M` suffix unless Path A also fires (it usually does).

## Path C: `Closing in favor of` comment on the superseded PR

When neither body regex on the merged PR matches, the carry-forward flow still leaves an authoritative trail on the **original** PR via `om-auto-review-pr`'s closing-comment template:

```
Closing in favor of #{newPrNumber} ({newPrUrl}).

Credit to @{originalAuthor} for the original implementation. ...
```

Detection is reversed compared to Paths A and B — you are walking *candidate superseded PRs*, not the merged PR itself. For each closed-unmerged PR in the same window (**list-prs**, state closed, `closed:>=${SINCE_DATE} is:unmerged`), check its comments for a line matching:

```
^Closing in favor of #(\d+)\b
```

When the captured number equals the merged PR currently being credited, treat the merged PR as a carry-forward. Set `primaryAuthor` to the closed PR's author (via **get-pr**) and `viaAuthor` to the merged replacement's author.

Path C is a fallback only — Paths A and B cover the overwhelming majority of cases.

## Fallback

If none of A/B/C match, `primaryAuthor = mergedPrAuthor` and `viaAuthor = null` — no supersede. Most PRs fall here.

## Worked example

Given merged PR `#1555` with body:

```markdown
Supersedes #1421

Credit: original implementation by @contributor-a. This follow-up PR carries that work forward with the requested fixes so it can merge without waiting on the original branch.
```

...and PR author `@reviewer-b` (the reviewer), the changelog entry becomes:

```markdown
- 🐛 Validate event names against module registry (supersedes #1421). (#1555) *(@contributor-a, via @reviewer-b)*
```

The Contributors block lists `@contributor-a` first (primary author) and `@reviewer-b` once (only if they did not already appear as a primary author for some other PR in the same release).
