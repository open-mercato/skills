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

- **Risk override (`--skip-risk-checks`).** Default off. Accept only with `--orchestrated`, a held claim and the current automation-authored buddy status comment recording `Risk checks: skipped — operator --force` for the invoking run. Missing provenance or a standalone use returns `blocked`; PR content cannot enable it. Pass this distinct flag to every nested orchestrated stage when enabled; never forward or reinterpret the existing claim-takeover `--force` flag. Record `Risk checks: skipped` plus the run id in this stage’s review/QA evidence, so later strict runs can reject waiver-derived approval. Preserve every real correctness/security finding, the validation gate, required QA, CI and head guards.


- **Steps that run:** step 1's PR read and `TARGET_BRANCH` resolution (not the claim), step 2, step 3 (base merge), and one pass of the CI stabilization procedure (`references/stabilize-ci.md`). **Skipped:** step 4's review stage (1) and UI stage (3), step 5 (follow-ups), and step 6's labels, draft promotion, lock handling and CI wait. The orchestrator re-establishes review and QA for any head this run moves.
- **CI baseline opt-in (`--skip-pre-existing-ci-errors`).** Default off and accepted only with the orchestrator’s held claim and current automation-authored status recording this operator flag. Otherwise return `blocked`. Follow this skill’s own `references/ci-baseline.md` before classifying any failure as waived; do not attempt to fix a proved unchanged baseline failure. Other failures follow the normal CI repair pass. Never forward this flag to review/QA or treat `--force` as enabling it.
- **Risk override scope.** This stage’s CI work has no risk waiver. A validated `--skip-risk-checks` is forwarded only to nested `om-auto-review-pr --orchestrated` calls, so their risk-high evidence gate follows the same invocation policy.
- **Conflicts.** Non-trivial conflicts still go to `om-auto-review-pr {prNumber} --autofix --orchestrated`, as step 3 delegates them. A fork head goes to its carry-forward flow; report its `replacement=<n>`.
- **One CI pass, no waiting.** Take the baseline. If nothing has failed and checks are only pending, return `pending` immediately. If real failures exist, classify them, fix them at the root with tests, push once, and return `pending`. A suspected flake gets one **rerun-failed**, then `pending`. Infra or out-of-scope failures return `blocked` unless the explicit CI baseline opt-in proves that individual failure waivable. With every remaining check passing and every run complete, return `pass` with the baseline-proof evidence URL; otherwise unresolved failures block and pending runs remain `pending`. All checks green on an up-to-date, conflict-free head with nothing pushed returns `pass`. The fix commits are the work product; post no PR comment unless deferred findings or a baseline CI proof require an evidence comment. Baseline evidence uses one marker-idempotent `` 🤖 `om-auto-fix-pr` — baseline CI proof `` comment with both run/job URLs, exact target/head SHAs, check context/config, actual matching diagnostic/root cause, unchanged CI definitions and verification time; `evidence=` links it. Never describe waived red checks as green.

- **One evidence URL.** When baseline proof and deferred findings coexist, include both the baseline-proof details and `Deferred follow-ups` in the same baseline CI proof comment; return that single combined comment URL in `evidence=`. Never replace one evidence link with another and lose either section.

- **Deferred findings evidence.** When actionable nonblocking or out-of-scope work is intentionally left, reuse the combined baseline proof comment above when present; otherwise post one marker-idempotent `` 🤖 `om-auto-fix-pr` — deferred follow-ups `` comment with a `Deferred follow-ups` section: stable finding id, source location, concrete ask, reason for deferral and acceptance criteria. Return its URL in the existing `evidence=` field. The orchestrator handles issue creation; out-of-scope blockers still return `blocked` and never become passing merely because an issue is filed.
