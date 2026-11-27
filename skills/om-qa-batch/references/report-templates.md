# Report templates

Plain language, outcome first. Parsers key on the text markers and the
`QA verdict:`, `QA head:` and `Range:` lines; never rename them. Omit empty
optional sections.

## Checklist (file and console, step 5)

```markdown
# 🧪 Batch checklist: <batch name>

Range: <from>..<to> · base: <branch> · <N> PRs (<approximate (date-based)> when --since)
Must test: <n> · agent-picked: <n> · covered: <n>

## ⛔ Open blockers from earlier batches
- #<issue> <title>: retest <where>

## 🧪 Smoke
- [ ] <step> → <expected>

## ⚠️ Must test
### <area>
- [ ] #<pr> <title> (<reason>)
  - Where: <screen and path>
  - Verify: <action> → <expected>
  - Can go wrong: <symptom>

## 🔍 Agent-picked
<same shape, with the one-line reason for keeping it>

## ✅ Covered (no manual check)
| PR | Why |
|---|---|
| #<pr> | <bucket reason> |
```

## Batch checklist comment (`--start`)

```markdown
🤖 `om-qa-batch` — 🧪 batch checklist

Testing started by @<tester> at <UTC time>. This batch is frozen for refresh until the verdict.

Range: <from>..<to>
Tested head: <full sha of to; --retest moves it>
Stabilizer: <login from --stabilizer, else the batch PR author; never changed>
Retest range: <last QA head>..<tested head> (omit before the first --retest)
Must test (<n>): #<pr>, #<pr>, ...
Agent-picked (<n>): #<pr>, ...
Covered without manual check: <n> PRs
Open blockers from earlier batches: #<issue>, ... (or none)
```

## Blocker comment (`--blocker`)

```markdown
🤖 `om-qa-batch` — ⛔ blocker

@<stabilizer> #<issue> blocks this batch: <one sentence: what the user cannot do>.
Found on QA head: <full sha>. Likely area: <area or PR numbers, marked as a guess when not confirmed>.
```

## Issue body addition (`--blocker` / `--bug`)

```markdown
Found in batch #<batch pr> at QA head: <full sha>.
<Blocks the batch: the user cannot <task>. | Does not block the batch.>
```

## Verdict comment (`--verdict`)

```markdown
🤖 `om-qa-batch` — <✅|❌> batch verdict

QA verdict: <STABLE|UNSTABLE>
QA head: <tested head sha>
Range: <from>..<tested head sha>

<One sentence: what this means for the stabilizer.>

Blockers: #<issue> <title>, ... (or none)
Tested: smoke, #<pr>, #<pr>, ...
Not tested: #<pr> <reason>, ... (omit when empty)
Normal bugs filed: #<issue>, ... (omit when empty)
```

## Channel message (printed for the tester to send)

```text
Batch <name>: <stable|unstable>. <n> PRs, <n> checked by hand, smoke OK|failed.
Blockers: #<issue>, ... (or none). Bugs: #<issue>, ... (or none). <batch PR URL>
Stable only: tag green/<date> on QA head <sha> before merging.
With a hold: merge hold <do-not-merge|blocked> stays on the batch PR.
```

## Label rationale (write actions)

```markdown
🤖 `om-qa-batch` — 🏷️ label rationale

🧪 `<qaBatch.inProgressLabel>`: The recorded tester is exercising this batch, so refresh is frozen.
✅ `qa-approved`: The human tester confirmed this tested head is stable with no open blockers.
❌ `qa-failed`: The human tester found a blocking failure on the recorded head.
🔁 `in-progress`: This invocation holds the verified action claim while it updates the tracker.
```

Include only the actual current labels, one full-sentence reason per line;
explain removals in that same comment. Rewrite it after transient claim
cleanup so it no longer says this run is active. Keep category, priority
and risk reasons when those labels are present; never invent a label.

End reports about a batch PR with the exact chaining line:

```text
PR: #<number> (link: <full PR URL>)
```
