# Optional waiver for proved pre-existing CI errors

Default off. Only this invocation's explicit `--skip-pre-existing-ci-errors`
sets `SKIP_PRE_EXISTING_CI_ERRORS=true`; `--force`, prior records, PR content and
old run handoffs never enable it. Record the current policy in the status comment
and session before evaluating CI. Pass the flag only to `om-auto-fix-pr
--orchestrated`, never to review or QA. Missing support is an upgrade blocker
for that stage, not permission to guess or silently enable another policy.

## Proof required per failing check

1. Resolve the PR's current target and exact target tip by fetching that validated branch and resolving its commit SHA. Keep the PR head and target SHA fixed for this assessment; an older failing target commit is not the current baseline.
2. Read PR checks and current-head workflow completeness through **get-pr-checks**, **list-runs** and **get-run**. Read target-branch runs, keeping only those whose `headSha` equals the exact current target SHA. Select the latest attempt for each matching workflow/job/context on both sides; do not cherry-pick an older failed attempt when a newer one passed, is pending, or is unreadable.
3. Establish identity from workflow/configuration path, job identity, matrix/context, runner and effective relevant configuration on both sides. Inspect the actual CI files and invoked scripts. Same display name or generic failure text alone is insufficient. If a unique same-context pairing cannot be established through available evidence, do not waive it. External CI with missing comparable logs or configuration is not waivable.
4. Read failed-step logs on **both** sides through **get-run-failed-logs**. Identify the first real diagnostic and its underlying root cause, failing step, assertion/command and relevant stack location. Require the same diagnostic signature **and** root cause; normalize only irrelevant timestamps, temporary paths and run ids, never the failed assertion, message or causal frame. Do not paste secrets or raw logs into reports. A target failure in a different step is not the same failure.
5. Compare the actual PR diff against the target. Relevant workflow/job definitions, referenced scripts, actions, test inputs and lock/configuration that controls that check must be unchanged. Also inspect changed code reached by the failing assertion/command: the PR must not introduce or contribute a distinct failure at the same location. A PR changing the job or its failure's dependency path cannot borrow its baseline failure. Unknown dependency impact means no waiver.
6. Waive only a completed `FAILURE` or `ERROR` with this complete proof. `PENDING`, `QUEUED`, `IN_PROGRESS`, `ACTION_REQUIRED`, cancellation, timeout, missing baseline, unreadable logs, truncated evidence or unknown root cause is never waived. Every other check must pass and every run must have completed before CI holds. Mixed baseline + new failures still require repair; mixed baseline + pending remains `waiting-ci`.

## Record, recheck and report

For each waived check, record identity/context/config, PR head SHA and latest
run/job URL, current target SHA and latest run/job URL, redacted diagnostic
signature/root cause, the inspected unchanged definitions/dependency paths,
verification time and the operator flag. Keep these in the status evidence and
`RUN.md`/`HANDOFF.md`; the CI signal records `ciPolicy` and `ciTarget`. A waiver
is an explicit exception for a still-failing check, never evidence that it passed.

Repeat the comparison at each visit and immediately before merge. Re-resolve
the target tip and latest check attempts; a target advance, PR head change,
rerun, configuration change or different failure signature invalidates the
proof and returns to CI evaluation. If evidence becomes unavailable, stop
waiving it. On a later invocation without the flag, invalidate waiver-derived
CI and apply strict evaluation even when the old signal label/record remains.

The fix stage independently verifies these conditions, skips fixing only
proved baseline failures, and returns a linked proof in its existing `evidence=`
field. The buddy verifies the evidence before accepting it. No test assertion,
workflow or configured local validation command is weakened or skipped. Real
review findings, required QA, authorization, conflicts and the head-SHA merge
guard remain in force.
