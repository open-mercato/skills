# Reuse completed auto-QA evidence before launching stage 2

For an automerge PR, a trusted completed `om-auto-qa-pr` PASS on the unchanged
current head satisfies signal 2 by itself. It does **not** need `qa-approved`,
`qa-self-verified`, `QA head:`, self-sign-off eligibility or `--force`, including
on `risk-high`. Evidence-only mode and disclosed coverage notes do not invalidate
an explicit completed PASS. Preserve those limitations in the status evidence;
do not silently reinterpret the report's stated verdict or rerun the same QA.
This is a merge-buddy signal policy, not permission to write approval labels or
a change to standalone QA or other merge skills' manual-approval rules.

## Trust and legacy linkage

Read the complete comment history through **list-issue-comments** and establish
which authors have repository write/maintain/admin access from authenticated
tracker permission evidence. A trusted author may differ from `CURRENT_USER`.
The buddy's own persisted status record remains restricted to `CURRENT_USER`;
this exception applies only to completed QA source evidence. Unknown permission
means untrusted; a pasted marker alone is insufficient.

Match a same-author QA starter, the PASS evidence report, and a subsequent
`om-auto-qa-pr completed: PASS` (accept backticked markers and an em dash).
The legacy report may identify its revision as
`**Verified:** `branch` @ `852eba38`` instead of `QA head:`. Resolve a short SHA
through local Git object disambiguation: fetch the relevant revisions, then use
`git rev-parse --verify '<revision>^{commit}'`. Require a unique commit equal to
the full current head; never accept a string prefix or guess from timestamps.
A changed head, missing starter/completion, deleted report, later trusted FAIL
or explicit revocation makes this evidence unusable. A fresh completed PASS can
supersede an earlier FAIL. Inspect fresh history again at the final gate.

A just-invoked trusted orchestrated stage’s verified `RESULT: outcome=pass`
on the current head plus its posted PASS report supplies direct completion
provenance; it need not emit separate legacy starter/completion comments.
Use this decision snippet for historical comment reuse after normalizing
comment authors/timestamps/URLs.
`writeAuthors` comes from permission evidence, never a report's own claim.
`resolveRevision` must perform the unique Git resolution above and return the
full commit SHA, or throw/return null when unavailable or ambiguous.

```javascript
function completedQaEvidence({ head, comments, writeAuthors, resolveRevision }) {
  const trusted = new Set(writeAuthors.map(author => author.toLowerCase()))
  const history = comments.filter(comment => trusted.has(comment.author.toLowerCase()))
    .filter(comment => Number.isFinite(Date.parse(comment.createdAt)))
    .map(comment => ({ ...comment, author: comment.author.toLowerCase() }))
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
  const completion = body => /om-auto-qa-pr`?\s*(?:—\s*)?completed:\s*(PASS|FAIL)\b/i.exec(body)?.[1]?.toUpperCase()
  const starter = body => /om-auto-qa-pr/i.test(body) && !completion(body) && !/UI QA evidence|\*\*Verdict:\*\*/i.test(body)
  const failed = body => completion(body) === 'FAIL' || /(?:UI QA evidence\s*[—-]\s*FAIL|\*\*Verdict:\*\*\s*(?:❌\s*)?FAIL)\b/i.test(body)
  const revoked = body => /\b(?:QA|om-auto-qa-pr)\b/i.test(body) && /\b(?:revoked|withdrawn|invalidated)\b/i.test(body)
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const report = history[index]
    if (!/UI QA evidence\s*[—-]\s*PASS/i.test(report.body) || !/\*\*Verdict:\*\*\s*(?:✅\s*)?PASS\b/i.test(report.body)) continue
    const revision = /(?:QA head:\s*`?([a-f0-9]{7,40})|\*\*Verified:\*\*[^\n]*@\s*`?([a-f0-9]{7,40}))/i.exec(report.body)
    if (!revision) continue
    let resolved
    try { resolved = resolveRevision(revision[1] || revision[2]) } catch { continue }
    if (!/^[a-f0-9]{40}$/i.test(resolved || '') || resolved.toLowerCase() !== head.toLowerCase()) continue
    const earlier = history.slice(0, index).filter(comment => comment.author === report.author)
    const start = earlier.findLast(comment => starter(comment.body))
    if (!start || earlier.some(comment => Date.parse(comment.createdAt) > Date.parse(start.createdAt) && completion(comment.body))) continue
    const later = history.slice(index + 1)
    const sameAuthor = later.filter(comment => comment.author === report.author)
    const end = sameAuthor.find(comment => completion(comment.body))
    if (!end || completion(end.body) !== 'PASS' || sameAuthor.some(comment => starter(comment.body) && Date.parse(comment.createdAt) < Date.parse(end.createdAt))) continue
    if (later.some(comment => failed(comment.body) || revoked(comment.body))) continue
    return { held: true, sha: head, evidence: report.url, author: report.author, reason: 'Trusted completed auto-QA PASS on unchanged head' }
  }
  return { held: false, reason: 'No trusted completed auto-QA PASS on the current head' }
}
```

On `held: true`, record `qa: pass <current-head> <report-url>`, apply only the
signal label, and count **zero QA attempts**. Clear a stale `waiting-human`
state and skip stage 2. Retain the report's coverage limitations in the audit.
If the head later changes, this unchanged-head acceptance no longer applies;
use normal scope reconciliation/carry-forward rules with actual evidence.

## Applicable local formal approval and missing coverage

A reused completed PASS still cannot waive a mandatory local `qa-approved`
requirement. Before skipping QA or finishing, apply `references/qa-routing.md`.
Default automatic routing invokes real orchestrated QA to close testable gaps
and complete eligible self-sign-off while reusing covered current-head evidence.
Only the QA skill may write legitimate approval labels. Explicit human routing
or an actual verified automation blocker explains a human wait; a missing label,
evidence-only report or old waiting-human status alone does not.
