# Release report

The release entry is the product. Link it and state coverage, verification,
and remaining editorial work. Preserve entry/credit formats and the credit audit.

## Final report (step 10)

Usually 3–6 lines plus the contract line:

```markdown
🚀 `om-auto-update-changelog` drafted {version}: {N shipped PRs}, {M contributors}, {sinceDate} → {date}.
Coverage: {release ref and reachability result; disclose fallback/incomplete window}.
Credits: {N verified; unresolved attribution or material corrections, if any}.
Review {linked CHANGELOG block}; fill Highlights before merge.
PR: #<number> (link: <full PR URL>)
```

Do not paste a preview or enumerate routine author verification. Keep attribution
corrections inspectable in the PR's collapsed audit detail; surface unresolved
credits in the summary. An open docs PR is not a shipped release.

## Dry run (step 9)

Print the full drafted entry, followed by the per-PR audit in collapsed detail:

```markdown
<details><summary>Credit and categorization audit</summary>

| PR | Category | Line emoji | Primary author | Via | Path | Commits by credited author | Notes |
|---|---|---|---|---|---|---|---|
| {PR} | {category} | {entry emoji} | {author} | {via when present} | {A–E/fallback} | {credited/total} | {evidence or unresolved correction} |

</details>
```

Retain every row, `Path`, and `Commits by credited author`: they prove each credit
choice. End with one sentence saying this was a preview and no files or PRs
changed. A dry run emits no `PR:` line.
