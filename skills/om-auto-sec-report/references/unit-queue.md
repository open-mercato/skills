# Unit queue and run ledger

How `om-auto-sec-report` turns `{windowSpec}` into an ordered queue (step 1) and keeps a resumable local ledger (step 2).

## Classify the window

```bash
BASE="${BASE_OVERRIDE:-$BASE_BRANCH}"          # --base wins
DATE=$(date -u +%Y-%m-%d)
case "$WINDOW_SPEC" in
  "")                                   MODE=default ;;
  [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]) MODE=date ;;
  *[!0-9]*)                             MODE=ref ;;      # spec path or branch, decided below
  *)                                    MODE=floor ;;    # all digits → PR number floor
esac
# ref: a path ending in .md inside $SPECS_DIR that exists at origin/$BASE → spec; otherwise a branch
# name matching ^[A-Za-z0-9._/-]+$ that exists as origin/<name> → branch; anything else → stop and report.
SINCE_DEFAULT=$(date -u -d '7 days ago' +%Y-%m-%d 2>/dev/null || date -u -v-7d +%Y-%m-%d)
```

| Mode | Queue | Default slug |
|---|---|---|
| `default` | merged PRs since `SINCE_DEFAULT` | `last-7d-<DATE>` |
| `date` | merged PRs since the date | `since-<date>` |
| `floor` | merged PRs with number ≥ floor; the lower date bound is the floor PR's `createdAt` (**get-pr**) | `from-pr-<n>` |
| `branch` | one unit, `branch:<name>` | `branch-<name with / → ->` |
| `spec` | one unit, `spec:<path>` | `spec-<basename without .md>` |

## List merged PRs (date, floor, default)

Run **list-prs** with state merged, search `merged:>=${SINCE} base:${BASE}`, fields `number,title,url,mergedAt,baseRefName,author,labels`, limit 250.

- **Truncation:** a result count equal to the limit is truncated. Split the window into date chunks (`merged:>=A merged:<B`), run **list-prs** per chunk, and dedupe by number until every chunk returns under the cap. A silently truncated window produces a report that looks complete and is not.
- **Other bases:** PRs merged in the window into a base other than `BASE` are not analyzed; count them (same listing without the `base:` qualifier) and name the count on the report's window line.
- **`--include-open`:** also run **list-prs** with state open against `BASE`, drop drafts, and queue them flagged `not yet merged`.

## Exclusions

Drop from the queue, counting each exclusion for the window line:

- Prior security-report PRs — titles starting `docs(analysis): add security report`.
- PRs whose changed files (**get-pr-files**) all live under `RUNS_DIR` or `ANALYSIS_DIR` — execution plans and reports, no product code.
- Floor mode: PRs numbered below the floor.

## Order and cap

Sort PR units newest-first by `mergedAt` (open PRs after merged ones, newest first) so the most recent risk surfaces first. Keep at most `--max-units` (default 50). The residue — every unit past the cap — is listed by number in the report's appendix with the invocation that covers it (the same window re-run with a higher `--max-units`); it is never dropped silently.

## Run ledger (`$RUN_DIR/queue.md`)

Local, git-ignored, and the resume point before the PR exists. One line per unit, in queue order:

```markdown
# Security report run — {window caption} (base: {BASE}, slug: {SLUG})

- [ ] `om-auto-sec-report-pr pr:1456 --base {BASE} --slug pr-1456 --out-fragment {RUN_DIR}/fragments/pr-1456.md` — {title}
- [x] `om-auto-sec-report-pr pr:1450 …` — complete · withheld: 0
- [x] `om-auto-sec-report-pr pr:1447 …` — ⚠ partial — {reason} · withheld: 1 `.ai/tmp/om-auto-sec-report-pr/withheld/pr-1447-2026-09-29.md`
```

- Write the ledger before the first unit runs; flip each line as soon as its fragment is read back.
- The withheld count and file come from the fragment's third line, `<!-- sec-unit-withheld: {W} {path | -} -->` (pattern in `om-auto-sec-report-pr`'s fragment contract); copy the path verbatim. A fragment without that marker, or with a count above zero and `-`, is recorded as `⚠ partial — withheld marker missing` and fails the step-6 gate until the unit is re-run.
- Re-run with the same `--slug` (the default slug is stable for the same window on the same day): units whose fragment already starts with `<!-- sec-unit-status: complete` on its second line are skipped; partial, failed, and pending units run again.
- Once the report PR exists, resumability belongs to that PR (`om-auto-continue-pr`); the ledger is then disposable.
