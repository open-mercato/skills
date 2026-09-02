# Parity check against real interviews (step 6)

When the research directory holds real interview notes on the same questions, the panel is run on the same script and the two sets are compared. The deviation is the finding: the panel's blind spots tell you where its material is thin, and the panel's extra themes are questions for the next real interview. This is also how the panel is calibrated over time.

## When it runs

Automatically, whenever **held-out** notes tagged `[INTERVIEW]` exist for the same problem or flow — notes the panel was not built from (`--hold-out`, or the newest note per flow when two or more exist). A note that fed a persona's lines is excluded: scoring the panel against it measures recall of its own source, and the leaked overlap would be recorded as calibration. With only one note for a flow, the personas use it and the check is skipped for that flow, with the reason stated. It never runs on assumption-only material; there is nothing to compare.

## Method

1. From the real notes, extract the themes each interviewee raised (a theme is a distinct concern, need, or behaviour, in the interviewee's words, normalised once). Do the same for the panel transcripts of this run.
2. Build three lists: themes in both, themes only real people raised, themes only the panel raised.
3. For the themes in both, compare the sentiment and the concreteness: do real people and the panel feel the same way about it, and does the panel reach the specific (a named workaround, a number they mentioned) or stay generic?
4. Compute the overlap as the share of held-out real themes the panel also raised, and record it in `${research}/calibration.md` with the date, the run, the panel size, which notes were held out, and the two exclusive lists. A row is written only for a genuine hold-out; a skipped check is one line saying why.

## Reading the result

- **Real-only themes** are the panel's blind spots. Each one names material to gather or a persona line to add; a persona built from richer notes will raise it next time. This is the calibration loop, and it is the only way the panel gets better.
- **Panel-only themes** are hypotheses real people did not volunteer. Some are the panel inventing; some are things the real interviews did not ask about. Each becomes a question for the next real interview, never a finding.
- **Generic where real is specific** is the most common gap: the panel says "integration is hard", the person says "the CSV export drops the second address line". A follow-up question in the script usually closes it; a persona line with the specific closes it for good.
- The overlap number is a trend to watch across `calibration.md` entries, never a score to publish and never a licence to skip real interviews. A panel that reaches the same themes as ten real people is a cheaper way to prepare the eleventh interview, not a replacement for it.

## What is written

```markdown
# Calibration — {product}

| Date | Run | Panel | Held-out notes | Overlap | Real-only themes | Panel-only themes |
|---|---|---|---|---|---|---|
| … | … | 3 | 2 notes (which) | 7 of 10 | {list} | {list} |
```
