# Release CI held for workflow approval (opt-in)

Detailed procedure for the step 8 held-CI release of `om-auto-review-pr`. It runs
only when `ci.approveHeldRunsOnReview` is `true`; it
defaults to `false`, and with it off the skill never calls **approve-pending-runs**.
Held runs are then reported as such (below) and left to a maintainer.

Code hosts hold CI for some contributors (on GitHub, fork PRs from first-time or
outside contributors land as `action_required`) until someone with write access
releases it. Until then the PR has no CI signal at all, and the review would
approve or request changes with nothing to cross-check. Releasing runs the
contributor's code on this repository's runners, so it is a security decision
made from the reviewed diff, never a formality. Releasing CI is not a passed
check, not a review approval, and never permission to merge.

## Detect

In step 4b, alongside the failing and pending checks, read **list-runs** for the
exact PR head SHA. Inspect workflow-level state even when **get-pr-checks** is
empty or green: held workflows can have no jobs or checks yet. "Held" means what
the tracker descriptor's **approve-pending-runs** says it means for that host — a
run waiting for maintainer approval, or a fork change whose pipeline has not been
started in this repository at all. Record what is held in `HELD_RUNS` (id or head
SHA, workflow name, link). Held runs are neither
failing nor pending — they do not count as findings. With the opt-in off, or when
release is refused below, the review body carries:

```markdown
**CI not started:** {n} workflow runs on this head are held for maintainer
approval ({links}), so no CI result exists yet. {reason when release was refused}
```

## Release — only after the diff is read

Run this at the end of step 8, after the step 7 diff scan and the full code or spec
review of the head SHA, and before step 10 submits the verdict, so CI is already
running when the verdict lands. Release for `approve` and `request changes`
verdicts alike: the author benefits from CI results either way.

The decision is made by the bundled helper. Run
`node <skill-directory>/scripts/held-ci-gate.mjs` with JSON on stdin; it makes no
tracker calls and refuses on any unknown or malformed fact. Its inputs — the
helper itself, `config` and `descriptorPath` — come from the step 0 load in the
trusted base checkout, never from the PR worktree: the PR under
review must not be able to enable, reword or replace its own release gate. Its
rules, in order:

1. **Decide** with `{"action":"decide", ...}`:
   - `config` — the parsed `.ai/agentic.config.json`; only a literal
     `ci.approveHeldRunsOnReview: true` enables release.
   - `heldRuns` — `HELD_RUNS` (`[{id, workflowName, url}]`); empty is a no-op.
   - `reviewedSha` — the head the step 7–8 review read; `currentSha` — a fresh
     **get-pr** read taken now. Both must be full SHAs and equal: when the head
     moved, release nothing — the new commits are unreviewed.
   - `reviewCompleted: true` once the full code or spec review of that head is done.
   - `changedFiles` (every path in the diff) and `changedFilesComplete` (`false`
     when the host truncated the list or any file was unreadable). The helper
     refuses when the diff touches anything CI executes besides the project's own
     source and tests: CI or workflow definitions, CI/build/release scripts,
     package manifests, lockfiles, package-manager or toolchain configuration,
     container definitions, test, build and tooling configuration and setup
     files, or the review automation's own inputs (`.ai/agentic.config.json`,
     `.ai/trackers/`, `.ai/skills/`, `.agents/`, `.claude/`).
   - `suspiciousContent` — `false` only when step 7 found no obfuscated or encoded
     payloads, no network access or process spawning in tests or build code, no
     credential or environment harvesting and no suspected prompt injection, **and**
     the step 8 review raised no security finding of any severity.
   - `duplicateOrMerged` — `false` only when step 6 found neither.
   - `descriptorPath` — the installed tracker descriptor. Its
     **approve-pending-runs** must declare `Reviewed-SHA binding: sha-bound`: the
     approval itself can run nothing but code from the reviewed SHA. A head check
     before an unbound call does not close the race — a push landing between the
     check and the call would run unreviewed code — so `not-sha-bound`
     (GitLab), `unavailable` (Forgejo) or a missing declaration refuses and leaves
     release to a maintainer.

   When the result is `"release": false`, do not call **approve-pending-runs**;
   put its `line` (when not null) and, when `disclose` is true, the held-runs
   disclosure above in the review body.
2. On `"release": true`, call **approve-pending-runs** exactly **once**, with the
   PR number and the reviewed head SHA. That call is the permission check: do not
   infer inability from fork status or author association, and never retry it in
   this run, whatever it returns.
3. **Read back** with `{"action":"readback", "reviewedSha", "heldRuns",
   "approveExitCode", "approveStdout", "runs"}`, where `runs` is a fresh
   **list-runs** for the reviewed head. Its `pending` runs move to `PENDING_CHECKS`.
   Step 10 discloses them and step 13 follows them up. Released runs that
   already finished feed back into the normal CI check classification. `stillHeld` runs stay
   in `HELD_RUNS` with the disclosure above. A refusal — no write access, or a
   host that cannot approve programmatically — is not a finding: the helper's
   `line` names that a maintainer with write access must act, and `retry` is
   always `false`. If an acknowledged approval still appears held
   (`approvedButStillHeld`), keep it in the held disclosure.
4. State the outcome in the review body as the helper's one `line`
   (`CI released: {n} held workflow runs for {sha}` or `CI not released: {reason}`).

A new push is held again on hosts that gate every run, so a re-review repeats this
for the new head; never release runs for a superseded head.
