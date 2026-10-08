# Report templates

Artifact, fragment, delegation, and final-report shapes for `om-auto-sec-report-pr` steps 9 and 12. The report is the product: keep every finding, vector outcome, and next step; omit optional sections that would be empty. The disclosure policy in `references/agentic-setup.md` applies to every shape below.

## Paths

```bash
DATE=$(date -u +%Y-%m-%d)
OUT_DIR="$SEC_TMP/$SLUG"                              # scratch in the primary checkout, git-ignored
REPORT_MD="$OUT_DIR/sec-report-pr-${SLUG}-${DATE}.md"
REPORT_HTML="$OUT_DIR/sec-report-pr-${SLUG}-${DATE}.html"
WITHHELD="$WITHHELD_DIR/${SLUG}-${DATE}.md"           # never published
```

In `pr` publish mode `om-auto-create-pr` copies the two report files to `${ANALYSIS_DIR}/` under the same names.

## Finding entry (shared by report and fragment)

```markdown
### [Major] A01 Broken Access Control — `path/to/file.ext:42`

- **What:** {one sentence — the weakness class and the affected behavior}
- **Why:** {one sentence — the consequence}
- **Fix:** {one sentence — the direction of the fix}
- **Apply elsewhere:**
  - `path/to/other.ext:88` — same pattern, same risk — {one-line justification}
  - None found
```

### Withheld placeholder (replaces a withheld finding on every published surface)

```markdown
### [Major] A01 Broken Access Control — withheld

Details withheld for private disclosure: this weakness is live on the base branch. No location is published until it is fixed.
```

The placeholder names no path, symbol, line, endpoint, or apply-elsewhere candidate. The full entry, in the shape above, goes to `$WITHHELD` under a `# Withheld findings — {target caption} ({DATE})` heading, with a closing line naming the private channel. The file ends with one `disclosure-tokens` block that the pre-publish gate reads (`references/agentic-setup.md` → Disclosure check):

```markdown
<!-- disclosure-tokens
src/path/to/file.ext
src/path/to/file.ext:42
ClassName::methodName
/api/route/that/is/affected
-->
```

One fixed string per line, no blank lines inside the block: every path, `file:line`, symbol, and endpoint of every withheld finding, plus the paths of its apply-elsewhere candidates. A withheld finding without tokens is invalid — the gate fails closed on an empty block.

## Standalone report (`$REPORT_MD`)

```markdown
# Security report (single unit) — {target caption}

Target: **{pr:123 | spec:<path> | branch:<name>}** · Base: `{base}` · Analysis ref: `{sha}` · Date: {DATE}

## Executive summary

- {count} findings: {N blocker, M major, L minor, K nit, I info}; {W} withheld for private disclosure.
- Top OWASP categories: {A01, A10}.
- Deep vectors surfaced: {TOCTOU, cache-key scope leakage, SSRF redirect chain, …}.
- Recommended next run: `om-auto-sec-report-pr {target}` — {one sentence}.

## Findings

{finding entries, blocker first, then major, minor, nit, info — withheld ones as placeholders}

## Deep vectors — what was checked

| Vector | Outcome | Location or note |
|---|---|---|
| TOCTOU on money-moving flows | risk surfaced | `path/to/file.ext:200` |
| Cache-key scope leakage | covered | scope key present in every key |
| JWT algorithm confusion | not applicable | no token surface changed |

## Next steps — go deeper

Ordered highest-impact first; exactly one is marked **[recommended]**.

- **[recommended]** `om-auto-sec-report-pr pr:1234` — {why this is the biggest remaining risk}.
- `om-auto-sec-report-pr spec:<path>` — {why}.
- `om-auto-sec-report-pr pr:1234 --deep-scan` — {why the area-scoped sweep was not enough}.
- Audit `<area>` for {vector} — {why}.

## Limits

- Classification is heuristic: deep-vector findings can be false positives and need a human to confirm.
- Apply-elsewhere and next-step candidates are suggestions, not verified vulnerabilities.
- {Spec targets only:} findings reflect the spec's intent; real behavior depends on the implementation.

## Appendix — inputs

- Changed files: {count} (first 20, then `…`).
- PR/spec body excerpt: {N} lines read, secrets redacted.
- Commits inspected: {SHAs, PR and branch targets}.
- Knowledge sources applied: {securityChecklist path, CODE_REVIEW.md, knowledge.sources entries — or "built-in baseline only"}.
```

A vector row whose location belongs to a withheld finding reads `risk surfaced | withheld`.

## HTML mirror (`$REPORT_HTML`)

- A stand-alone `<!DOCTYPE html>` document with inline `<style>` only — no JavaScript, no remote fonts, images, or stylesheets.
- Mirror every section of the markdown report, placeholders included — the HTML never carries more than the markdown.
- Every PR, issue, and CVE link is an `<a>` with `rel="noopener noreferrer"`.

## Sub-unit fragment (`--out-fragment`)

```markdown
## {target caption}
<!-- sec-unit-status: complete -->
<!-- sec-unit-withheld: {W} {withheld file relative to the primary checkout | -} -->

- {count} findings: {N blocker, M major, L minor, K nit, I info}; {W} withheld.
- Top OWASP categories: {…}. Deep vectors surfaced: {…}.
- Recommended next run: `om-auto-sec-report-pr {target}` — {one sentence}.

{finding entries at level 3, placeholders for withheld ones}

**Deep vectors — what was checked**
{the vector table}

**Next steps — go deeper**
{the next-step list, exactly one [recommended]}
```

- The first line is the level-2 heading; the second line is the status marker. A partial run carries a reason: `<!-- sec-unit-status: partial — {reason} -->`. The driver parses exactly `^<!-- sec-unit-status: (complete|partial)`.
- No report-wide front matter, limits, or appendix — the driver owns those.
- The third line is the withheld marker: the count and the path of `$WITHHELD` relative to the primary checkout (e.g. `.ai/tmp/om-auto-sec-report-pr/withheld/pr-1447-2026-09-29.md`), or `-` when the count is `0`. The driver reads the path from here and never reconstructs it. Parse: `^<!-- sec-unit-withheld: ([0-9]+) (\.ai/tmp/om-auto-sec-report-pr/withheld/[A-Za-z0-9._-]+\.md|-) -->$`.
- Withheld detail goes to `$WITHHELD`, never into the fragment; the fragment's summary states the withheld count.

## Delegation brief (`pr` publish mode)

Pass to `om-auto-create-pr` with `--slug sec-report-pr-<slug>`:

```text
Add a security report for {target caption} under {ANALYSIS_DIR}/. Before creating the worktree, read these files in the invoking checkout and copy them verbatim: {REPORT_MD} and {REPORT_HTML}. Only these two files are added — no code, config, or CI changes (docs-only).
PR title: docs(analysis): add security report for {target caption}
Labels: documentation, security, skip-qa, {priority-medium | priority-high | priority-extreme}, risk-low.
Keep finding details in the report files: the plan, PR body, and comments cite only the executive-summary counts and the [recommended] next step, verbatim: {recommended line}.
What can go wrong: findings are heuristic and need human confirmation; apply-elsewhere and next-step candidates are suggestions; {spec target: findings reflect intent only}; {W>0: W findings are withheld and tracked privately — do not ask for them on the PR}.
```

The brief itself contains nothing that is withheld. When the report documents a live exploitable weakness, the PR summary states why the priority was raised.

## Final report (step 12)

3–6 lines plus the machine line (the `←` notes are template guidance, not output):

```markdown
🔍 `om-auto-sec-report-pr` {target caption}: {N blocker, M major, L minor} — top {A01, A10}; {one sentence on the riskiest area}.
🎯 Recommended next run: `om-auto-sec-report-pr {target}` — {why}.
⚠️ NEEDS HUMAN CONFIRMATION: {W} finding(s) withheld — details in `{WITHHELD}` on this machine; disclose via {SECURITY.md channel | the maintainers' private security channel}.   ← only when W > 0
📝 Report: {ANALYSIS_DIR path on the PR | local path in local mode | fragment path in sub-unit mode}.
PR: #<number> (link: <full PR URL>)                                                               ← standalone pr mode only
```

A sub-unit or local run emits no `PR:` line; never emit a nonexistent PR. When the run is incomplete, lead with 🔁, name what is missing, and relay `om-auto-create-pr`'s resume line (`om-auto-continue-pr {prNumber}`).
