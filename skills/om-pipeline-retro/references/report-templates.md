# Report templates

The report is this skill's whole deliverable. Fill these shapes exactly and expand them with detail — a reader who did not watch the run must understand from the report alone what the pipeline cost and why. Every table keeps its final prose column in full sentences; a bare number with no explanation is a defect.

Percentages and hours come from the classifier's summary. Never restate a figure the classifier did not produce.

## Header

```markdown
## 🔍 Pipeline Retro — {window}

Examined {examined} finished runs of {total} in the window ({since} → today), {markers} of which carry agent run markers. {degradation}

| Outcome | Runs | Share | Median time to merge | p90 |
|---------|------|-------|----------------------|-----|
| ✅ Clean single pass | 131 | 66% | 1.9h | 22.8h |
| ⚠️ Hard recovery | 45 | 23% | 19.1h | 102.7h |
| 🔁 Loop checkpoints (by design) | 2 | 1% | 4.9h | 6.8h |
| ⛔ Second pass, cause not stated | 36 | 18% | 8.0h | 18.5h |

{in-flight line}
```

`{in-flight line}` appears only when the classifier reports requests in flight: `2 requests are still in flight and were not classified: [#812](url), [#815](url).`

When the run was given `--sessions`, the header gains one sentence naming how many saved sessions verified and how many runs their evidence explained: `12 saved sessions verified; 3 of them recovered a cause for a run whose own record stated none.` When `--sessions` was not given, say nothing about sessions here — an absent evidence source is not a degradation.

`{degradation}` states what weakened the classification, or is omitted when nothing did: `labels.enabled` false (classified from timestamps, reviews, and CI alone), or `--limit` truncating the window. When the classifier reports `timestampCoverage.reliable` as false, that sentence comes first and quotes the classifier's own note — with no timestamps at all the class counts are an upper bound that must not be compared against a timestamped window, and saying so is more useful than the table beneath it.

## Saved sessions

Only when the run was given `--sessions`. Omit the whole section otherwise — never print an empty one.

**When any session verified `unsafe`, this block comes first in the report, ahead of the header table.** A transcript that the repository tracks, or that sits inside it un-ignored, is a live exposure of whatever that run touched, and it outranks every retro figure:

```markdown
### ⚠️ Saved sessions that must not be where they are ({count})

`session-2026-08-01.jsonl` is tracked by this repository. Its contents were deliberately not read. A saved agent transcript can carry credentials, private prompts, absolute paths, and full tool output; committing one publishes all of it to everyone with repository access and to every clone already taken. Remove it from the index, ignore the saved-session paths, and rotate any credential the run touched. I have changed nothing — this skill is read-only.
```

Then the ordinary block:

```markdown
### 🔒 Saved sessions verified ({count})

| Session | Records | Run it explains | Verification |
|---------|---------|-----------------|--------------|
| `session-2026-08-01.jsonl` | 412 | [#123](url) | Safe to read — outside the repository. Opens an `om-auto-review-pr` run and states that the base moved under the change, which is the cause the request itself never recorded. |
| `session-2026-08-02.jsonl` | 96 | belongs to no request in this window | Safe to read — ignored by the repository. Opens an `om-auto-continue-pr` run and records no completion marker, so the run did not finish; it carries 2 secret-shaped strings and must not be exported or quoted. |
```

Rules for this section:

- **Sessions appear by basename only.** A path names a machine and a user, so it is not reproduced.
- **Never quote a transcript.** Every cell comes from the verifier's derived fields; the raw content was never read into context and must never reach the report.
- The secret-shaped count is reported as a count with the "do not export or quote" instruction attached, never as a matched string and never as a location.
- Close with the runs the tracker cannot see at all: `{n} verified sessions belong to no pull request in this window — runs that left no readable trace anywhere in the tracker.` That number is the measurement of how much of the pipeline history is invisible from the tracker alone; give it a sentence even when it is zero.

## Ranked causes

```markdown
### 🎯 What the second passes cost

| Cause | Runs | Hours beyond a clean run | Why this cause is ranked here |
|-------|------|--------------------------|-------------------------------|
| Base moved under the change | 20 | 613h | Twenty runs finished their work and then had to reconcile with a base branch that had advanced; the conflict resolution, not the original change, is what kept them open. |
| Review could not be recorded | 28 | 417h | The reviewing step could not record a formal verdict, so the request waited for a human to notice that an approval existed only as a comment. |
```

Rank by hours, ties by run count, exactly as the classifier ordered them. When one cause dominates, say so plainly rather than presenting the table as a flat list.

A request carrying several causes has its excess split evenly between them, so the column sums to the time actually lost rather than double-counting it — say so beneath the table. When the window holds no clean run there is no baseline, the classifier reports every `excessHours` as null, and the table ranks by request count with a sentence saying why the hours column is empty.

## Runs that state no cause

```markdown
### ⛔ Second passes with no recorded cause ({count})

| # | Title | Signals | Hours | What the record does not say |
|---|-------|---------|-------|------------------------------|
| [#456](url) | Add search filters | Second review round | 14h | The pipeline reviewed this request twice and the record shows no conflict, no changes-requested review, and no interruption — the second review's reason was never written down. |
```

This section is the point of the retro even when it is short: it measures how much of the pipeline's own history is unreadable. Close it with the count and the single sentence that follows from it — that these runs cost measurable hours whose cause nobody can now recover.

When the run was given `--sessions`, close it with a second sentence naming what was recoverable and what was not: `{n} further second passes were unexplained by the tracker and a saved session recovered the cause; {m} remain unexplained by either source.` A run that neither the tracker nor a session can explain is the honest floor of this measurement, and it is a stronger argument for a machine-readable outcome line than the tracker-only number.

## Recovered runs

```markdown
### ⚠️ Runs that recovered, with the reason on the record ({count})

| # | Title | Cause | Hours | What happened |
|---|-------|-------|-------|---------------|
| [#463](url) | Prompt templates | Base moved under the change | 21h | The branch went conflicting against its base, a resume run reconciled two files, and the request merged once the gate re-ran green. |
```

When the run was given `--sessions`, this table gains an **Evidence** column reading `tracker` or `tracker + session`, and every row the classifier marked `explainedBy: session` says so in its final cell — *the request itself recorded no reason; the saved session for that run states it*. Those rows are the whole argument for reading sessions at all, so never present them as though the tracker had explained them.

## Size

```markdown
### 📋 Recovery by change size

| Added lines | Runs | Hard recovery | Share |
|-------------|------|---------------|-------|
| 0–200 | 76 | 7 | 9% |
| 200–600 | 63 | 9 | 14% |
| 600+ | 59 | 29 | 49% |
```

State the gradient in one sentence when it is monotonic, and say when it is not — a flat distribution here is itself a finding, because it rules out change size as the driver.

## Closing

```markdown
### 🔁 Next

Top cause: **{cause}** — {runs} runs, {hours}h beyond a clean pass. Say the word and I will file it with `om-prepare-issue`; it will deduplicate against existing issues and label the result itself.
```

## Empty results

- No finished run in the window: `No run finished between {since} and today, so there is nothing to classify. Widen --since or check that the window covers a release.`
- Runs finished but none carries an agent marker: `{count} runs finished in the window and none carries an agent run marker, so this pipeline's history cannot be classified. Runs become classifiable once the skills that drive them post their standard marker comments.` When `--sessions` still verified usable sessions, add what they show — `{n} saved sessions did verify, so those runs happened; they simply left nothing on any pull request.`
- `--sessions` given and nothing verified: `No file in {locations searched} verified as a saved run of this pipeline, so the classification below rests on tracker evidence alone.` Name the locations searched — an empty result and a location nobody looked in read identically otherwise.
