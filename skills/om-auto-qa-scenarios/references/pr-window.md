# PR window — which PRs the report covers

How `om-auto-qa-scenarios` resolves `{windowSpec}` (step 1), enumerates the PRs
(step 2), and gathers per-PR evidence (step 3). The report is only as good as
its coverage, so every rule here exists to stop a window from being silently
short.

## Resolve the window and names (step 1)

```bash
TODAY=$(date -u +%Y-%m-%d)
BASE="${BASE_OVERRIDE:-$BASE_BRANCH}"        # --base wins; "auto" → default-branch
case "$WINDOW_SPEC" in
  '')                        MODE=date;  DATE_FLOOR=$(date -u -d "$TODAY -7 days" +%Y-%m-%d 2>/dev/null \
                                           || date -u -v-7d +%Y-%m-%d) ;;   # GNU || BSD date
  [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]) MODE=date; DATE_FLOOR="$WINDOW_SPEC" ;;
  *[!0-9]*)                  echo "windowSpec must be YYYY-MM-DD, a PR number, or omitted" >&2; exit 1 ;;
  *)                         MODE=pr-floor; PR_FLOOR="$WINDOW_SPEC" ;;
esac
SLUG="${SLUG_OVERRIDE:-qa-scenarios-${TODAY}}"
REPORT_BASE="$SCENARIOS_DIR/$SLUG"          # → $REPORT_BASE.md and $REPORT_BASE.html
```

- Validate `SLUG` against `^[a-z0-9][a-z0-9-]*$` before any path use.
- **PR-number floor:** run **get-pr** on `$PR_FLOOR` for its `createdAt` and use
  that date as `DATE_FLOOR` — a PR numbered at or above the floor was created
  on or after it, so it cannot have merged earlier. Then keep only PRs with
  `number >= PR_FLOOR`. When `$PR_FLOOR` is not a PR (an issue number, a typo),
  stop cleanly naming the value; guessing a floor would mis-window the report.
- The window caption used in the report H1 and PR title is
  `since <DATE_FLOOR>` (date mode), `from #<PR_FLOOR>` (PR-floor mode), or
  `last 7 days` (default) — always followed by the concrete
  `<start> → <TODAY>` range.

## Enumerate (step 2)

Run **list-prs** with state merged and search `merged:>=${DATE_FLOOR} merged:<=${TODAY}`
across **all** base branches (no base filter), requesting
`number,title,url,author,labels,baseRefName,mergedAt,isDraft,closingIssuesReferences`,
limit 250.

- **Pagination — the silent truncation.** A result whose count equals the
  requested limit is truncated. Split the window into date chunks
  (`merged:>=A merged:<B`), run **list-prs** per chunk, and dedupe by PR number
  until every chunk comes back under the limit. Never accept a capped list.
- **Base branches.** PRs into `$BASE` get testing routes. PRs into any other
  base stay in the report — counted separately in the Executive Summary and
  listed in the appendix with their base — so a hotfix merged straight to a
  release branch is never invisible.
- **`--include-open`.** Additionally run **list-prs** with state open, drop
  drafts (`isDraft`), and tag each kept PR "not yet merged". They get routes in
  their areas, visibly marked, and a separate appendix section.

### Exclusions

Drop, and count in the report as excluded:

- prior runs of this skill — PRs that touch only `$SCENARIOS_DIR/` (and their
  execution plan under `$RUNS_DIR/`);
- PRs that touched only `$RUNS_DIR/` — execution-plan commits, not product work;
- branch-sync and release plumbing — titles shaped like
  `^chore:\s*(sync|merge|prepare)\b.*\b(branch|release|back)\b`, or the
  equivalent shape this repo's history uses.

Do not drop docs, test, CI, or tooling PRs: they go to the "no direct manual
QA" bucket so the appendix stays a complete inventory.

## Per-PR evidence (step 3)

For each kept PR:

- **get-pr** with `number,title,url,body,labels,baseRefName,mergedAt,additions,deletions,closingIssuesReferences`;
- **get-pr-files** for the changed-file list (paths + status);
- the diff (**get-pr-diff**) only when title and files leave the area ambiguous
  — read a sample to classify, never quote it.

Extract: title, number, URL, merged date, base; category / `priority-*` /
`risk-*` / QA meta labels (`needs-qa`, `skip-qa`, `qa-approved`,
`qa-self-verified`); issue references (from `closingIssuesReferences` first,
then `#N` tokens in the body — mentions are listed as "mentioned", not
"fixes"); the top-level areas touched, from the file paths.

A PR whose **get-pr** fails stays in the appendix as `(metadata unavailable)`
with only the number and the URL **list-prs** returned. Never fill a gap with a
guess.
