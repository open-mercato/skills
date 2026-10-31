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

## om-auto-fix-pr specifics

- **Steps that run:** step 1's PR read and `TARGET_BRANCH` resolution (not the claim), step 2, step 3 (base merge), and one pass of the CI stabilization procedure (`references/stabilize-ci.md`). **Skipped:** step 4's review stage (1) and UI stage (3), step 5 (follow-ups), and step 6's labels, draft promotion, lock handling and CI wait. The orchestrator re-establishes review and QA for any head this run moves.
- **Conflicts.** Non-trivial conflicts still go to `om-auto-review-pr {prNumber} --autofix --orchestrated`, as step 3 delegates them. A fork head goes to its carry-forward flow; report its `replacement=<n>`.
- **One CI pass, no waiting.** Take the baseline. If nothing has failed and checks are only pending, return `pending` immediately. If real failures exist, classify them, fix them at the root with tests, push once, and return `pending`. A suspected flake gets one **rerun-failed**, then `pending`. Infra or out-of-scope failures return `blocked`. All checks green on an up-to-date, conflict-free head with nothing pushed returns `pass`. The fix commits are the work product; post no PR comment.
