# Run log — dated steps, handoff, resume

Every run documents itself in a run folder, like `om-auto-create-pr-loop`'s
`PLAN.md` / `HANDOFF.md` / `NOTIFY.md`, so a person can see what the run did and
when, and the next invocation can resume a run that died. The tracker stays the
source of truth for each PR (labels plus the status comment). The run folder
holds the run-level state that the tracker does not have: the queue order, the
PR and stage in flight, attempt history and the window.

## Layout

```
${RUNS_DIR}/merge-buddy/<YYYY-MM-DD>-<HHMMSS>-<RUN_ID>/
├── RUN.md       # header + append-only Steps table: every executed step, UTC-dated
├── HANDOFF.md   # rewritten after every visit and at run end: where to resume
└── NOTIFY.md    # append-only UTC log: run start/resume/end, blockers, decisions
```

- `RUNS_DIR` is `paths.runs` (default `.ai/runs`). `RUN_ID` is `<YYYYMMDD>-<HHMMSS>-<4 random hex>` in UTC, created once when the folder is created; the status comments' `run <RUN_ID>` uses the same value.
- **Local, never committed.** This skill has no branch of its own and never pushes to the base branch, so the folder stays in the working copy that runs the skill. Operators should ignore `${RUNS_DIR}/merge-buddy/` in version control. A CI schedule that wants resume across jobs persists that directory between jobs (cache or artifact); without it, each job starts fresh and the tracker state still carries every PR forward.
- Keep secrets, tokens and raw logs out of all three files. Link a run or PR instead of pasting output.

## RUN.md

Created at step 1; header fields are written once (a resume appends a session
row). The Steps table is append-only — one row per executed step, written when
the step finishes. Never rewrite an earlier row.

```markdown
# Merge buddy run — <RUN_ID>

**Mode:** <prepare-to-merge | prepare-and-merge>
**Started:** <UTC ISO-8601>
**Status:** <running | finished | resumed-elsewhere>

## Sessions
| # | Started (UTC) | Window | Ended (UTC) | Ended because |
|---|---|---|---|---|
| 1 | <ts> | <minutes> | <ts or —> | <queue empty | deadline | crash (detected by session 2) | …> |

## Steps
| # | UTC time | PR | Step | Result |
|---|---|---|---|---|
| 1 | <ts> | — | queue built | 5 PRs: #12, #9, #31, #40, #41 |
| 2 | <ts> | #12 | claim | in-progress applied, head abc1234 |
| 3 | <ts> | #12 | read state | signals: CR ✅ QA ✅ CI — |
| 4 | <ts> | #12 | stage 3 CI (`om-auto-fix-pr`) attempt 1/3 | RESULT: pushed def5678 |
| 5 | <ts> | #12 | outcome | waiting-ci on def5678 |
```

Step names are fixed so a resume can parse them: `queue built`, `queue refreshed`,
`claim`, `read state`, `signal check <CR|QA|CI>`, `stage <1 CR|2 QA|3 CI> (<skill>) attempt <k>/<MAX_ATTEMPTS>`,
`finish`, `outcome`, `poll`, `resume`. The Result cell quotes a sub-skill's
`RESULT:` line verbatim (redacted) and names the head SHA whenever it changes.

## HANDOFF.md

Rewritten in place after every visit's outcome, before each stage starts (so a
crash mid-stage still names the stage in flight), and at run end.

```markdown
# Handoff — <RUN_ID>

**Last updated:** <UTC ISO-8601>
**Status:** <open | closed>
**Window:** <used>/<window> min, deadline <UTC ISO-8601>

## In flight
- <#n — stage 3 CI (`om-auto-fix-pr`) attempt 1/3 since <ts>, head <sha> | none>

## Queue remaining (in order)
- #<n> — <fresh | waiting-ci since <ts> | waiting-human>
- …

## Done this run
- #<n> — <outcome> at <ts>

## Next concrete action
- <e.g. "resume #12: re-read state, then continue the ladder at CI" | "check CI on #9 first">

## Blockers / decisions
- <or "none">
```

`Status: closed` is written only when the run ends normally — queue empty,
deadline reached with every PR parked, or a clean stop. A crashed run leaves
`open`; that is what the next invocation looks for.

## NOTIFY.md

Append-only, one `## <UTC ISO-8601> — <event>` heading per entry: `run started`,
`run resumed from session <k>`, `blocked #<n>`, `decision #<n>` (each most
reversible default the run chose), `run finished`. No per-step chatter — that is
`RUN.md`'s Steps table.

## Resume (SKILL.md step 1)

Unless `--fresh` is passed, look for the newest folder under
`${RUNS_DIR}/merge-buddy/` whose `HANDOFF.md` says `Status: open`.

1. **Live or dead?** `Last updated` within the last 120 minutes (the same staleness bound as the status-comment heartbeat, `references/claim-pr.md`) → another run is probably still working: do not touch its folder; start a new run folder, and let the per-PR claims keep the two runs apart. Older → the run is dead: resume it.
2. **Resume in the same folder.** Append a `Sessions` row and a `resume` step, append `run resumed from session <k>` to `NOTIFY.md`, and open a fresh window (`START` = now). Keep the original `RUN_ID`.
3. **The PR in flight first.** If `In flight` names a PR, start the queue with it. Its `in-progress` claim is this skill's own stale claim, so recover it through `references/claim-pr.md`, then re-read state and re-check signals against the current head before continuing the ladder — a stage that died mid-run may have pushed. Never assume the dead stage's result. The status comment's attempt record is authoritative; the Steps table explains it.
4. **Then the remaining queue** in the recorded order, merged with a fresh **list-prs** read: drop PRs that lost `AUTOMERGE_LABEL` or were merged or closed, and append newly labeled ones in the usual queue order (`references/window.md`).
5. A `HANDOFF.md` that cannot be parsed is reported, left in place, and ignored — start a new run folder; the tracker state still carries every PR forward.

`--pr <n>` runs also log to a run folder but only resume a dead run whose
`In flight` PR is `<n>`.
