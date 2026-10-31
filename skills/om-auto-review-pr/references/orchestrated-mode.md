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
- **Pass it down.** Every skill invoked from here also gets `--orchestrated`.
- **Report.** End the final report with exactly one line, followed by the usual `PR:` line (the replacement's when one was opened):

  ```text
  RESULT: <skill> outcome=<pass|fail|pending|blocked> head=<sha> [replacement=<n>] [evidence=<url>] [selfqa=<eligible|ineligible>] reason="<one sentence>"
  ```

  `head` is the PR head SHA as this run leaves it. `pass` means the work this skill exists for succeeded on that head. `fail` means it ran and did not succeed, and `reason` names the top blocker. `pending` means this run pushed and CI must now run. `blocked` means an agent cannot clear the blocker: a missing credential, an architectural decision, a contract-breaking scope change, or an infra outage.

## om-auto-review-pr specifics

- **Implies `--autofix`.** `AUTOFIX_ELIGIBLE=true` whoever authored the PR; the orchestrator was authorized by a human's automerge label.
- **Steps that run:** 0, 2–9, step 10's review submission only (via **review-pr**, the work product the orchestrator links as signal evidence), step 11, and step 12's worktree cleanup. **Skipped:** step 1, the rest of step 10 (labels, handoff, draft promotion, manual-QA instructions comment), step 12's lock handling, and step 13.
- **CI belongs to the orchestrator.** Step 4b's failing checks are noted in the review body but are not blocker findings, and they do not force `changes-requested`. Step 11's work order stops after (1) conflicts and (2) findings; (3) CI is skipped. Omit the CI-pending disclosure.
- **QA failures are findings.** An `om-auto-qa-pr` evidence comment reporting FAIL on the current head is an `INHERITED` blocker finding. Fix the failing scenario like any other blocker.
- **Fork heads.** Run the carry-forward flow (`references/fork-pr-flow.md`) as usual. Its label transfer to the replacement is the one label mutation this mode keeps, because the replacement must carry the human's automerge label. Report `replacement=<n>` with the replacement's head.
- **Outcome:** `pass` = the final submitted verdict approves `head` after the autofix loop. `fail` = changes are still requested after the loop, with the top blocker as the reason. `blocked` = one of step 11's critical stops. This skill never returns `pending`.
