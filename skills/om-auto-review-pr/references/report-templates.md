# Report templates — user-facing output (step 13)

How `om-auto-review-pr` reports back to the user. Reporting style contract:
`references/rules.md` (Reporting style) — full sentences, explain the why,
never compress; emojis structure the sections, the text carries the meaning.

## Final run report

```markdown
## 🔍 om-auto-review-pr — PR #{prNumber}: {title}

**Decision:** {✅ APPROVED | ❌ CHANGES REQUESTED} — {one full sentence: which findings drove the verdict, or why the change is safe}
**Mode:** {review | re-review (previous verdict: {…})}
**Autofix:** {ran — {n} findings fixed in {m} commits | skipped (not my PR — re-run with --autofix to fix it here) | n/a — nothing to fix}
**Labels:** {🚀 `merge-queue` + 🧪 `needs-qa` | ❌ `changes-requested` | labels disabled in config} — {why, one sentence}
**Draft state:** {promoted to ready via mark-pr-ready | left draft ({reason}) | already ready}

### 🔍 Findings ({X} blocker · {Y} major · {Z} minor · {W} nit)
- ⛔ {file:line} — {what is wrong and why it matters, full sentence} → {fixed in {sha} | handed back to author}
- ⚠️ {…one line per blocker/major; summarize minors/nits in one sentence}

### 🧪 Validation
{One short paragraph: which validation commands ran and their results; call out any failure and what was done about it.}

### {⚠️ Remaining blockers | ✅ Ready}
{When a blocker needs human judgment: describe it concretely and what decision is needed. When clean: state the PR is ready and what happens next (QA gate, merge hand-off).}
```

End the report with the chaining reference lines on their own lines, exact
shape (the one part never decorated or reworded):

```text
PR: #<number> (link: <full PR URL>)
Issue: #<number> (link: <full issue URL>)   <- only when the run has a subject issue
```

## Completion comment (step 12)

The lock release/retain comment on the PR keeps its exact marker shape from
`references/claim-pr.md` (`🤖 … completed: {VERDICT}. Lock released.` /
`Lock retained — chain continues.`) and carries a one-paragraph summary of the
verdict, the autofix outcome (including `autofix: skipped (not my PR — re-run
with --autofix to fix it here)` when step 11 was skipped), and where the work
stands. Marker-idempotent: a re-run updates its own completion comment via
**update-comment** instead of posting a duplicate.
