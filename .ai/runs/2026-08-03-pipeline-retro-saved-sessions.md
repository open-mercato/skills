# Follow-up to om-pipeline-retro: verify saved agent sessions as a second evidence source

Follow-up to PR #68 (`feat/om-pipeline-retro`), which is its base branch. Nothing here changes what PR #68 already does; it adds one optional evidence source on top.

## Goal

`om-pipeline-retro` currently classifies finished runs from tracker evidence alone — the marker comments, reviews and labels a run left on its pull request. On the validation corpus in PR #68 that leaves 34 second passes costing 222 measured hours whose cause the record does not state, and it cannot see a run that never reached a pull request at all.

The evidence for those runs usually still exists on the machine that produced them, as a saved agent session export. Upstream `open-mercato/open-mercato` PR #4758 established both where those exports live and the contract for handling them: `.ai/sessions*.json` and `.ai/session-exports/` are git-ignored in a generated app, and raw agent transcripts are treated as sensitive untrusted evidence — they can carry credentials, private prompts, absolute paths and tool output, so they are never copied into the repository and never exported except deliberately sanitized.

This change teaches `om-pipeline-retro` to **verify** those saved sessions and fold what they say into the same deterministic classification, without ever loading a transcript's raw content into the agent's context or a report.

## Scope

- `skills/om-pipeline-retro/references/verify-sessions.sh` — new deterministic verifier. Reads session file paths on stdin, opens the files itself, and writes only derived JSON on stdout: a hygiene verdict per session, the skills it names, the pull request it belongs to, its declared outcome, its causes and its wall-clock span. It never emits transcript text.
- `skills/om-pipeline-retro/references/classify-runs.sh` — gains `--sessions <file>`, which folds the verifier's output into the existing per-request rows. The verdict stays single-sourced: the classifier merges, the report does not.
- `skills/om-pipeline-retro/references/sessions.md` — new reference: where saved sessions live, the sensitivity contract, discovery, the hygiene gate, how session evidence merges with tracker evidence, and what may never leave the machine.
- `skills/om-pipeline-retro/SKILL.md` — the `--sessions` argument, one new workflow step between gathering evidence and classifying, and the session-specific rules.
- `skills/om-pipeline-retro/references/report-templates.md` — the session verification section, the evidence column on the two per-request tables, and the section for runs found only in a session.
- `docs/skills/om-pipeline-retro.md`, `UPGRADE_NOTES.md`, `DECISIONS.md` — the documentation card's new parameter, the upgrade note, and the two choices worth recording.

## Non-goals

- **No tracker contract change.** Session evidence is local; no new operation, no new field, no descriptor re-sync. PR #68's four added `get-pr` fields remain the only contract change in this stack.
- **No new config key.** The session location is an argument with documented defaults, not a setting.
- **No write path.** The skill stays read-only, and gains no ability to copy, move, sanitize, or export a session — verification reads in place and reports.
- **No session format standard.** The verifier accepts the three shapes a saved export actually takes (JSON array, JSON object wrapping a record array, JSON Lines) and degrades to an explicit finding on anything else. It does not define a format for anyone to conform to.
- **No run counting from sessions.** One saved session is one run by definition; run *counts* stay single-sourced from the tracker's opening comments, so the two sources cannot disagree about how many times the pipeline ran.

## Design decisions

- **The verifier opens the files; the agent never does.** The whole point of the sensitivity contract is that raw transcript content must not spread. If the skill asked the agent to read a session and summarize it, the credentials, private prompts and absolute paths in that file would enter the agent's context and, from there, plausibly a report. The verifier reads from disk and emits only derived counts, classes and basenames, so the transcript never leaves the machine and never enters a context window.
- **Hygiene is verified before anything is classified.** A session file that git tracks is a contract violation that matters more than any retro number, so it is reported first and its contents are not read at all. A session inside the repository that is merely un-ignored is reported the same way, because one `git add -A` commits it.
- **Session evidence explains; it never invents.** Causes are read only from the structured, agent-authored lines the skills already write — the `🤖` marker lines and a declared `Outcome:` line — using the same cause vocabulary as the tracker classifier, so the two merge into one ranking. Prose elsewhere in a transcript is not evidence: an agent quoting an error it is investigating must not become a cause.
- **One session-only signal is genuinely new**: a session that opens a run and never records a completion marker is a run that did not finish. That is invisible from the tracker, which is exactly why those runs land in the unexplained bucket today.
- **Identity is the basename, never the path.** An absolute path is itself sensitive under the upstream contract (it names a machine and a user), so a session appears in the report as its filename alone.

## Risks

- **False attribution to a pull request.** A transcript can mention several request numbers. Mitigated by taking the most frequent one and breaking ties toward the lowest, by reporting the count of unmatched sessions rather than forcing a match, and by never letting session evidence move a run *out* of a class the tracker established.
- **Cause false positives.** Mitigated by restricting extraction to marker and `Outcome:` lines and reusing the tracker classifier's proven, negation-aware patterns.
- **Large sessions.** A raw export can be hundreds of megabytes. The verifier skips anything past `--max-bytes` with an explicit finding rather than stalling, and the report states how many were skipped.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Verify saved sessions

- [x] 1.1 `references/verify-sessions.sh` — hygiene gate, format tolerance, derived-only output — e93509e
- [x] 1.2 `references/sessions.md` — locations, sensitivity contract, discovery, merge semantics — 2705189

### Phase 2: Fold session evidence into the classification

- [x] 2.1 `references/classify-runs.sh --sessions <file>` — merge, session coverage, sessions-only runs — e93509e
- [x] 2.2 `SKILL.md` argument, workflow step, and rules — 2705189
- [x] 2.3 `references/report-templates.md` — verification section, evidence column, sessions-only section — 2705189

### Phase 3: Document and land

- [x] 3.1 Documentation card, upgrade note, decisions entry — 2705189
- [x] 3.2 `bash scripts/lint.sh` green, and the verifier and classifier exercised against fixtures covering every documented degradation — 2705189
- [x] 3.3 Open the follow-up pull request against `feat/om-pipeline-retro` — PR #70
