# Keep each panel invocation's evidence

Step 2 of `om-synthetic-users` reserves the artifact directory after the user
confirms the flow and panel, before any subagent, transcript or screenshot work.
Step 9 writes the completed report into that same directory.

## Allocate one new session

Resolve the repository-relative research directory under the setup's path and
security rules. Derive a safe lowercase kebab-case slug from the confirmed flow.
The session directory is
`${research}/walkthroughs/{YYYY-MM-DD}-{flow-slug}-session-{NNN}/`, starting at
`001`. Inspect existing directories for this date and flow, including incomplete
sessions; choose the next unused number and create the directory exclusively.
If another invocation already created it, advance the number and retry. Never
reuse an existing session directory, even when its report is missing.

The first panel on a brief and a later walkthrough of its prototype are separate
invocations. On the same day and flow they get different session numbers. The
internal `--runs` repetitions belong to one session; their `run-{n}` names do
not allocate another session.

## Files and provenance

- `${session}/report.md`: the complete report with the exact subject path, flow,
  source files and the session's persona snapshot.
- `${session}/personas.md`: an immutable snapshot of every panel used, separated
  by internal run number with stable persona ids and their source tags. Keep it
  even when the shared `${research}/personas.md` is refreshed later.
- `${session}/transcripts/run-{n}-P{nn}.md`: one transcript per persona and run.
- `${session}/screenshots/`: browser evidence for this session only.

Use these paths from the first write. Retain partial files when a run stops and
report the limitation; never call an incomplete session complete. Existing
flat reports and their transcript directories remain untouched and readable.
Append calibration entries with the exact session/report path so same-day runs
remain distinguishable. The shared `personas.md` may still provide the latest
panel for other skills; it is not the source of historical panel claims.

Emit the exact `${session}/report.md` as `Walkthrough:`. Consumers use that
returned path and its snapshots, never reconstruct a report name from a date
and flow. Discovery refresh reads both the first-panel report and the optional
prototype-walk report without replacing one with the other.
