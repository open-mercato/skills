# Saved sessions as a second evidence source

The tracker only knows what a run chose to post. A run that was interrupted before it could report, or that never opened a pull request at all, leaves nothing there — which is why the classifier has an unexplained bucket. The evidence for those runs usually still exists on the machine that produced them, as a **saved session export**: the raw transcript of the run, written by the harness rather than by the pipeline.

This file is the contract for reading them. It applies whenever `--sessions` is in play and never otherwise; a run without that argument reads nothing but the tracker.

## The sensitivity contract — read this first

A raw agent session is **sensitive untrusted evidence**. It can carry credentials, API tokens, private prompts, absolute paths that name a machine and a user, and the full output of every tool the run invoked. The rules that follow are not stylistic:

- **Never copy a saved session into the repository**, into a run folder, into a temporary file under the working tree, or anywhere a `git add` could reach. Verification reads in place.
- **Never load a transcript into the agent context.** Do not read a session file with a file-reading tool, do not `cat` one, do not summarize one by eye. `references/verify-sessions.sh` opens the files and emits only derived data — counts, classes, basenames — precisely so the raw content never enters a context window and therefore can never reach a report.
- **Never quote a session in anything you emit.** No line, no snippet, no error message, no "for example". The report carries the derived fields the verifier produced and nothing else. Those fields are bounded by construction: fixed strings, enumerated causes, numbers, timestamps, a basename, and length-capped skill names taken from marker lines — nothing in the verifier output can reproduce arbitrary text found in a transcript, and any change that would weaken that is a defect in the verifier, not a report style choice.
- **Never export, sanitize, upload, or relocate a session.** That is the user's action to take, deliberately, and this skill is read-only in any case.
- **Identity is the basename.** `session-2026-08-01.jsonl`, never the path it was found at.

A session whose verification reports secret-shaped strings is still classifiable — a raw transcript is expected to carry them. The finding exists to say the file must not be exported or quoted, and the count is the only thing that ever leaves the machine.

## Where saved sessions live

Two locations are conventional, and both are git-ignored where the convention is followed:

- `.ai/session-exports/` — a directory of exports, one file per run.
- `.ai/sessions*.json` — a single export or a small set at the root of the agent working directory.

Harnesses also keep their own session store outside the repository entirely (a per-project directory under the agent home). That is the safest place to read from, because containment cannot be violated by a stray `git add`.

Resolve `--sessions` like this:

- `--sessions <file>` — verify exactly that file.
- `--sessions <dir>` — verify every regular file directly under it.
- `--sessions` with no value — search the two conventional locations above, relative to the working directory. Report what was searched and how many files were found, so an empty result is distinguishable from a location that was never looked at.

Never interpolate a path the user supplied into a shell command. Feed paths to the verifier on stdin, one per line, exactly as the usage line shows.

## The hygiene gate

The verifier decides hygiene before it decides anything else, and its verdict does not depend on file contents:

| Verdict | When | What happens |
|---------|------|--------------|
| `unsafe` | The file is tracked by the repository | Contents are **not read**. A saved session must never be committed; the fix is to remove it from the index and rotate anything it exposed. |
| `unsafe` | The file is inside the repository and the repository does not ignore it | Contents are **not read**. One `git add -A` commits it; the saved-session paths need ignoring before a retro reads them. |
| `unreadable` | The path is missing, is not a regular file, or cannot be read | Reported as a finding, never an abort. |
| `safe` | The file is outside the repository, or inside it and ignored | Contents are read in place and derived data is emitted. |

**An `unsafe` verdict is reported before any classification figure.** A committed transcript is a live exposure, and it outranks every number in the retro. Say plainly which files, that their contents were deliberately not read, and what the user has to do — untrack them and rotate what they exposed. Do not offer to fix it: this skill writes nothing.

## What a session contributes, and what it does not

A session contributes **explanation**, never arithmetic:

- **Causes.** Read only from the structured agent-authored lines a run writes — the `🤖` marker lines and a declared `Outcome:` line — using the same cause vocabulary as `references/classify-runs.sh`, so both sources rank into one table. Prose elsewhere in a transcript is not evidence: an agent quoting an error it is investigating must never become a cause.
- **One signal only a session can show.** A session that opens a run and records no completion marker is a run that did not finish. That is invisible from the tracker, and it is a large part of why runs land in the unexplained bucket.
- **A declared outcome**, where the run wrote one.

It never contributes:

- **Run counts.** One saved session is one run by definition, so counts stay single-sourced from the opening comments on the tracker and the two sources cannot disagree about how many times the pipeline ran.
- **A demotion.** Session evidence can move a request out of `unexplained` — the bucket that exists precisely because the record says nothing — and can never move one out of a class the tracker established.
- **A guess.** A session that states no cause leaves the run exactly as the tracker classified it.

## Matching a session to a request

The verifier takes the request number a session names most often across `PR: #<n>`, a `/pull/<n>` URL, and the legacy `PR_NUMBER=<n>` line, breaking ties toward the lowest. A session that names none, or names a request outside the window, is **not forced onto a request**: it is reported under `sessionsOnly` as a run that left no readable trace on any request in the window. That count is worth a sentence of its own in the report — it measures runs the tracker cannot see at all.

## Running the two scripts together

```bash
# 1. Verify. Paths on stdin; derived JSON on stdout; no transcript content anywhere.
find "$SESSION_DIR" -maxdepth 1 -type f | sh references/verify-sessions.sh \
  --repo-root . > "$TMP/verified-sessions.json"

# 2. Classify, with the verified sessions joined to the tracker evidence.
printf '%s' "$TRACKER_JSON" | sh references/classify-runs.sh \
  --sessions "$TMP/verified-sessions.json"
```

Write the verifier output outside the repository — a temporary directory the harness already uses — for the same reason the sessions themselves stay out of it. It carries no transcript text, but it names files that do.

When the harness cannot execute a shell, do **not** substitute reading the sessions by hand: that breaks the contract at the top of this file. Run the retro without `--sessions`, and say in the report header that session evidence was unavailable and which figures are consequently weaker — the unexplained count above all.
