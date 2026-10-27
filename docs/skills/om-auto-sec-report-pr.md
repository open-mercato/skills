# om-auto-sec-report-pr

> 🤖 Autonomous — runs end-to-end without supervision

Runs a paranoid, OWASP-oriented security analysis of one unit of work — a pull request (open or merged), a spec, or a branch diff. It walks the OWASP Top 10 baseline plus your repository's own security checklist, then a catalogue of non-obvious attack vectors (TOCTOU races, cross-scope cache leakage, JWT algorithm confusion, SSRF redirect chains, webhook replay, and more), sweeps the codebase for the same pattern elsewhere, and ends with concrete "go deeper" follow-up runs, one of them marked recommended. The analyzed target is never modified or commented on. The report stays local by default, ships as a docs-only PR through `om-auto-create-pr` when `securityReport.publish` is `pr`, or becomes a fragment for the `om-auto-sec-report` driver. A finding that is exploitable in code already on the base branch is withheld from everything published and kept in a local file for private disclosure. Exploit detail is never published.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{target}` | Required | `pr:<n>` (or a bare number), `spec:<path>` under the specs directory, or `branch:<name>`. |
| `--base <branch>` | Optional | Base ref for branch and spec analysis and the liveness check. Defaults to the configured base branch; a PR's own base wins. |
| `--out-fragment <path>` | Optional | Sub-unit mode: write a markdown fragment under `.ai/tmp/` instead of shipping a report. The driver sets this. |
| `--deep-scan` | Optional | Widen the apply-elsewhere sweep to the whole repository. |
| `--slug <kebab-case>` | Optional | Override the artifact slug. Defaults to one derived from the target. |
| `--force` | Optional | Forwarded to `om-auto-create-pr` when taking over a report slot a previous run left behind. |

Optional config: `securityChecklist` (your repository's security hotspot checklist), `securityReport.publish` (`pr` or `local`), `securityReport.disclosure` (`withhold-live` or `full`), and the shared `knowledge.sources` slot.

## Works with

Delegates the report PR to [om-auto-create-pr](om-auto-create-pr.md), which is required in `pr` publish mode and emits the `PR:` line this skill relays. It is also the per-unit engine behind [om-auto-sec-report](om-auto-sec-report.md). A target can come from a previous skill's `PR:` or `Spec:` line.

---
*Source: [`skills/om-auto-sec-report-pr/SKILL.md`](../../skills/om-auto-sec-report-pr/SKILL.md)*
