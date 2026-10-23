# om-auto-audit-dependencies

> 🤖 Autonomous — runs end-to-end without a user in the loop; safe on a schedule

Audits third-party dependencies for known security advisories in whatever ecosystems the repository uses. It reads every lockfile git tracks, takes advisories from the ecosystem's native audit tool when one is installed and reports fixed versions, and from the OSV database otherwise — so a Flutter/Dart, Go, Ruby, Python, or Rust project gets the same answer an npm project gets from its built-in audit. For each package with an advisory at or above the threshold it computes the smallest version that clears all of them, turns that into the concrete manifest change (or the parent to bump, or an override pin), and files one deduplicated issue carrying that upgrade path. Later runs update those issues in place instead of filing copies.

It never edits manifests or lockfiles and never runs an install. A run never reports a silent zero: an ecosystem it could not scan (no lockfile, no advisory feed, database unreachable) is named in the report with the reason.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--min-severity <low\|moderate\|high\|critical>` | Optional | Lowest severity that gets an issue. Defaults to `dependencyAudit.minSeverity`, else `high`. |
| `--ecosystem <name>` | Optional | Limit the scan to these ecosystems (repeatable). |
| `--dry-run` | Optional | Scan and print the planned issue actions; no tracker mutation. |

Optional config: `dependencyAudit.minSeverity` and `dependencyAudit.ignore` (accepted risks with a required reason and an optional expiry date).

## Works with

Files each issue through [om-prepare-issue](om-prepare-issue.md) (inline fallback when it is not installed) and emits one `Issue:` line per issue, each a valid input for [om-auto-fix-issue](om-auto-fix-issue.md), which performs the upgrade. For a security review of the code itself rather than its dependencies, use [om-auto-sec-report](om-auto-sec-report.md).

---
*Source: [`skills/om-auto-audit-dependencies/SKILL.md`](../../skills/om-auto-audit-dependencies/SKILL.md)*
