# om-auto-sec-report

> 🤖 Autonomous — runs end-to-end without supervision

Produces one security report for a window of work: every PR merged into the base since a date or a PR number (the last 7 days by default), or a single branch or spec. It runs `om-auto-sec-report-pr` on each unit, then combines the results into one report. The report has totals by severity, an OWASP risk heatmap, a deep-vector coverage matrix, the per-unit findings unchanged, and one deduplicated "go deeper" list with exactly one recommended next run. It stays local by default, or ships as a docs-only PR through `om-auto-create-pr` when `securityReport.publish` is `pr`. Findings that are exploitable in live code appear only as withheld placeholders. A partial unit never stops the batch. An interrupted run resumes from a local ledger when re-run with the same slug.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{windowSpec}` | Optional | A date `YYYY-MM-DD`, a PR-number floor, a branch name, or a spec path. Omitted means the last 7 days of merged PRs. |
| `--base <branch>` | Optional | Base branch for the window and every unit. Defaults to the configured base branch. |
| `--include-open` | Optional | Also analyze open non-draft PRs, flagged "not yet merged". |
| `--deep-scan` | Optional | Forwarded to every unit, so apply-elsewhere sweeps cover the whole repository. |
| `--max-units <n>` | Optional | Cap on units per run (default 50). The residue is listed, never dropped silently. |
| `--slug <kebab-case>` | Optional | Override the run slug. Defaults to one derived from the window. |
| `--force` | Optional | Forwarded to `om-auto-create-pr` when taking over a report slot a previous run left behind. |

## Works with

Every unit runs through [om-auto-sec-report-pr](om-auto-sec-report-pr.md), which is required. Delivery goes through [om-auto-create-pr](om-auto-create-pr.md), which is required in `pr` publish mode and emits the `PR:` line. After the PR exists, [om-auto-continue-pr](om-auto-continue-pr.md) resumes it.

---
*Source: [`skills/om-auto-sec-report/SKILL.md`](../../skills/om-auto-sec-report/SKILL.md)*
