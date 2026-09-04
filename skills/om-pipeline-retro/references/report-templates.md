# Pipeline retrospective report

Use the classifier's counts and ordering. Follow `references/rules.md`; lead
with the largest recorded delay and a useful next action. This skill is read-only
and emits no chaining fields. Link PRs inline instead.

```markdown
🔍 `om-pipeline-retro` — {window}

{Top recorded cause} accounts for {hours}h beyond the clean-run baseline across
{runs} runs. {cleanShare}% finished in one pass; {unexplained} second passes have
no recorded cause.

{Coverage: examined count/window, marker coverage, truncation, and material data limits.}

| Outcome | Runs | Share | Median time to merge | p90 |
|---|---|---|---|---|
| Clean single pass | {count} | {share} | {median} | {p90} |
| Hard recovery | {count} | {share} | {median} | {p90} |
| Loop checkpoints (by design) | {count} | {share} | {median} | {p90} |
| Second pass, cause not stated | {count} | {share} | {median} | {p90} |

| Recorded cause | Runs | Hours beyond baseline | Evidence |
|---|---|---|---|
| {cause} | {count} | {hours} | {PR links and the concrete event recorded.} |

🔁 {Recommended next investigation or change based on the ranked cause.}
I can pass this to `om-prepare-issue` if you want to file it.
```

The opening must reflect missing data: do not print a null value as zero or
invent a percentage. Rank causes by hours, ties by run count, exactly as the
classifier does. With no clean run, state that there is no baseline and use
request counts. State once that excess hours on a multi-cause request are split
between its causes. These are recorded delays, not proven causal savings.

When `timestampCoverage.reliable` is false, lead with the classifier's note;
without timestamps, class counts are an upper bound and cannot be compared to a
timestamped window. Disclose labels disabled, missing timing/size data, and
`--limit` truncation; do not imply complete coverage. Report in-flight requests
separately with links and exclude them from finished-run counts.

## Supporting detail

Put the per-request lists and size table in collapsible detail below the main
report. Retain every classified row; do not turn each row into a paragraph.
Omit a group with no entries.

```markdown
<details>
<summary>Evidence by PR and change size</summary>

| PR | Recorded cause or missing explanation | Hours |
|---|---|---|
| [#{number}: {title}]({url}) | {Observed event, or second pass with no recorded reason.} | {hours} |

| Added lines | Runs | Hard recovery | Share |
|---|---|---|---|
| {bucket} | {runs} | {recovered} | {share} |

</details>
```

Describe a meaningful size pattern in one sentence, without inferring causation
from correlation. A second pass or a loop checkpoint alone is not a failure.

## Empty results

- No finished runs: say which window was checked and suggest widening it.
- No agent markers: report the count examined and that pipeline history cannot
  be classified from this record.
- No recorded recovery cause: report the unknown-cause count and recommend
  investigating the linked records; do not manufacture a top cause.
