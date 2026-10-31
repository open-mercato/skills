# Orchestrated mode (`--orchestrated`)

An orchestrator passes this flag after it has already claimed this PR and taken
ownership of its labels. Today that orchestrator is `om-auto-merge-buddy`. The
orchestrator decides what happens next. This skill does its core work and
reports a single machine-readable line. Load this file only when the flag is set;
standalone runs never read it.

## Shared contract

- **Precondition.** The PR must carry `in-progress`, which is the orchestrator's live claim. Without it, stop before any work and report `outcome=blocked reason="orchestrated without a held claim"`.
- **Skip** — owned by the orchestrator:
  - the claim check, claim, take-over, completion and release comments;
  - every label mutation, including the label-rationale comment (pipeline, meta, QA, priority, risk, `in-progress`, `ci-monitoring`);
  - assign, unassign and author handoff;
  - draft → ready promotion;
  - every CI wait and CI-result follow-up.
  Never back off from, release, or swap the orchestrator's `in-progress`.
- **Keep** — everything that makes the work trustworthy: the untrusted-content boundary, worktree isolation, the validation gate, the test rules, no force-push, no history rewrites, never going green by weakening a test or disabling a check, secrets hygiene, and this skill's work-product records listed below.
- **Pass it down.** Every `om-auto-*` skill invoked from here also gets `--orchestrated`. Helpers without the flag, such as `om-code-review` and `om-prepare-test-env`, run as usual.
- **Never ask.** Nobody is watching the run. Anything that would otherwise be a question to the user, or a request for guidance in the final report, becomes `outcome=blocked` with that question as the reason.
- **Report.** End the final report with exactly one line, followed by the usual `PR:` line (the replacement's when one was opened):

  ```text
  RESULT: <skill> outcome=<pass|fail|pending|blocked> head=<sha> [replacement=<n>] [evidence=<url>] [selfqa=<eligible|ineligible>] reason="<one sentence>"
  ```

  `head` is the PR head SHA as this run leaves it. `pass` means the work this skill exists for succeeded on that head. `fail` means it ran and did not succeed, and `reason` names the top blocker. `pending` means this run pushed and CI must now run. `blocked` means an agent cannot clear the blocker: a missing credential, an architectural decision, a contract-breaking scope change, or an infra outage.

## om-auto-qa-pr specifics

- **Steps that run:** PR mode 0–1 and 4–12, and step 13's environment and worktree teardown. **Skipped:** step 2 (claim); step 3 (review-first gate — the orchestrator runs QA only after signal 1 holds); step 13's lock handling and every label change except the self-QA sign-off. `--self-qa-signoff` is implied; `--apply-failure` is ignored.
- **Evidence comment (work product).** Post it via **attach-image-evidence** as in step 11.
- **Self-QA sign-off — the one label mutation this mode keeps.** `SDLC.md` names this skill as the only automation allowed to apply `qa-approved`. When the run is eligible (below), apply `qa-approved` + `qa-self-verified` and post the sign-off comment with its `QA head: <headRefOid>` line and evidence list, exactly as step 13 does under `--self-qa-signoff`. Otherwise apply no label.
- **`selfqa=`** — compute it with the exact `--self-qa-signoff` criteria: verdict PASS, screenshots attached, the PR carries `needs-qa` without `skip-qa`, and the PR is not `risk-high` (labeled, or inferred per `SDLC.md` from the diff). It is `eligible` only when every criterion holds.
- **Outcome:** `pass` = every required step passed. `fail` = at least one step failed, and the evidence comment names the failing steps, because the orchestrator's fix stage reads it. `blocked` = the app or browser could not be brought up, or the run was environment-limited. Never report `pass` for a partial run.
