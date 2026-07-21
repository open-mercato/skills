# om-close-fixed-issues

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Reconciles a window of recent pull requests against the issue tracker. Where a merged PR authoritatively closes an issue — via `fixes`/`closes`/`resolves` keywords or the tracker's `closingIssuesReferences` — it closes the issue with a linked comment; where a PR was closed without merging (or merged into a non-base branch), it leaves an informational comment instead of closing. It never acts on bare `#N` mentions and respects `do-not-close`, `blocked`, and claim locks. Use it for post-merge housekeeping and release prep.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--since <value>` | Optional | Lower bound for `mergedAt` / `closedAt` — an ISO date, a git ref, or `last-release` (default), which resolves to the latest changelog release date, falling back to the last 7 days. |
| `--limit <n>` | Optional | Maximum number of PRs to process. Defaults to 100. |
| `--dry-run` | Optional | Print planned mutations only — post no comments and close no issues. |
| `--repo <owner>/<name>` | Optional | Override repo detection. Defaults to the tracker's inferred repo. |

## Works with

Consumes recently merged and closed-but-unmerged PRs and mutates only issue state (closes or comments) — it never modifies repository files and does not delegate to [om-auto-create-pr](om-auto-create-pr.md). It pairs well at release time with [om-auto-update-changelog](om-auto-update-changelog.md), which consumes the same PR window.

---
*Source: [`skills/om-close-fixed-issues/SKILL.md`](../../skills/om-close-fixed-issues/SKILL.md)*
