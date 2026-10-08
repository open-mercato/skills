# Report templates

Aggregate, HTML, delegation, and final-report shapes for `om-auto-sec-report` steps 4, 5, 7, and 9. The aggregate is the product: keep every unit fragment verbatim; omit optional sections that would be empty. The disclosure policy in `references/agentic-setup.md` applies to every shape below.

## Paths

```bash
AGG_MD="$RUN_DIR/sec-report-${SLUG}.md"
AGG_HTML="$RUN_DIR/sec-report-${SLUG}.html"
```

In `pr` publish mode `om-auto-create-pr` copies both files to `${ANALYSIS_DIR}/` under the same names.

## Aggregate report (`$AGG_MD`, step 4)

```markdown
# Security report — {window caption}

Window: **{start date or PR floor} → {end date} | branch:<name> | spec:<path>** (base: `{base}`) · Units analyzed: {count} ({N PRs, M branches, L specs}) · Excluded: {n} · Merged into other bases: {n} · Residue past `--max-units`: {n}
Partial or failed units: {inline, each with its reason — omit when none}

## Executive summary

- Total findings: {N blocker, M major, L minor, K nit, I info}; {W} withheld for private disclosure.
- Top OWASP categories: {A01, A08, A10}.
- Deep vectors surfaced across units: {TOCTOU, cache-key scope leakage, SSRF redirect chain, …}.
- {One sentence on the riskiest residual area the reviewer should double-check.}

## Consolidated next steps — go deeper

Every per-unit next step, deduplicated on exact command equality (the highest-severity justification kept), ordered by expected impact. Exactly one is **[recommended]** across the whole list.

- **[recommended]** `om-auto-sec-report-pr {target}` — {why}.
- `om-auto-sec-report-pr {target} --deep-scan` — {why}.
- Audit `<area>` for {vector} — {why}.

## Risk heatmap

| OWASP category | Blocker | Major | Minor | Notes |
|---|---|---|---|---|
| A01 Broken Access Control | {n} | {n} | {n} | {one sentence} |
| A02 Cryptographic Failures | {n} | {n} | {n} | {one sentence} |
| … through A10 … | | | | |
| Out of scope (not OWASP) | — | — | — | {n} findings |

Withheld findings count in their row; the notes never describe them.

## Deep vectors — coverage matrix

One row per vector, one column per unit, cells `covered` / `risk surfaced` / `not applicable` / `inconclusive`. With many units, abbreviate to the vectors that surfaced a risk or stayed inconclusive; the full tables stay in the per-unit fragments below.

## Per-unit findings

{Every fragment, verbatim, in queue order — each starts with its own `## {target caption}` heading and status marker. Do not rewrite them.}

## Limits

- Findings are aggregated from per-unit heuristic analysis; confirm before acting.
- Apply-elsewhere and next-step pointers are suggestions, not verified vulnerabilities.
- A large window can hide per-unit context; re-run `om-auto-sec-report-pr` on any unit that looks surprising.

## Appendix — queue

Every unit of the window with the exact invocation that ran, grouped by merge date.

### {YYYY-MM-DD}

- `om-auto-sec-report-pr pr:{n}` — [#{n}]({url}) {title} — {complete | partial — reason | failed — reason}
- `om-auto-sec-report-pr branch:{name}` — {status}

### Residue (not analyzed this run)

- #{n}, #{n}, … — covered by re-running this window with `--max-units {higher}`.
```

## HTML mirror (`$AGG_HTML`, step 5)

- A stand-alone `<!DOCTYPE html>` document with inline `<style>` only — no JavaScript, no remote fonts, images, or stylesheets.
- Mirror every section of the aggregate, placeholders included — the HTML never carries more than the markdown.
- Every PR, issue, and CVE link is an `<a>` with `rel="noopener noreferrer"`.

## Delegation brief (step 7, `pr` publish mode)

Pass to `om-auto-create-pr` with `--slug sec-report-<slug>`:

```text
Add the security report for {window caption} under {ANALYSIS_DIR}/. Before creating the worktree, read these files in the invoking checkout and copy them verbatim: {AGG_MD} and {AGG_HTML}. Only these two files are added — no code, config, or CI changes (docs-only).
PR title: docs(analysis): add security report for {window caption}
Labels: documentation, security, skip-qa, {priority-medium | priority-high | priority-extreme}, risk-low.
The PR body links both files and states the queue size, the blocker/major counts, the top OWASP categories, and the [recommended] next step verbatim so a reviewer can trigger it in one line: {recommended line}. Keep every other finding detail in the report files — the plan, PR body, and comments do not quote findings.
What can go wrong: findings are aggregated heuristics and need human confirmation; pointers are suggestions; a large window can hide per-unit context; {W>0: W findings are withheld and tracked privately — do not ask for them on the PR}.
```

The brief contains nothing that is withheld. When the priority is raised, the PR summary says it is because the report documents a live exploitable weakness.

## Final report (step 9)

3–6 lines plus the machine line (the `←` notes are template guidance, not output):

```markdown
🔍 `om-auto-sec-report` {window caption}: {units} units ({partial} partial, {failed} failed) — {N blocker, M major, L minor}; top {A01, A10}.
🎯 Recommended next run: `om-auto-sec-report-pr {target}` — {why}.
⚠️ NEEDS HUMAN CONFIRMATION: {W} finding(s) withheld across {k} unit(s) — details in `{WITHHELD_DIR}` on this machine; disclose via {SECURITY.md channel | the maintainers' private security channel}.   ← only when W > 0
📝 Report: {ANALYSIS_DIR path on the PR | local path in local mode}.
PR: #<number> (link: <full PR URL>)                                                                ← pr mode only
```

A local run emits no `PR:` line; never emit a nonexistent PR. An interrupted run leads with 🔁 and names either the ledger resume (`om-auto-sec-report {windowSpec} --slug {SLUG}`) or `om-auto-create-pr`'s resume line (`om-auto-continue-pr {prNumber}`).
