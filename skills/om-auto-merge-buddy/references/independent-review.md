# Independent native review policy

Resolve mode and independent review from the current `.ai/agentic.config.json`:
`automerge.mode` defaults to `prepare-and-merge`, and
`automerge.requireIndependentReview` defaults to `false`. Explicit `--mode`,
`--require-independent-review` or `--skip-independent-review` override the
config for this invocation. The two review flags conflict; reject both together.
Reject unknown modes, non-boolean review configuration or invalid arguments
before claiming work; never silently fall back from an invalid merge policy.
Existing explicitly configured `prepare-to-merge` remains honored.

This policy applies to both modes, independently of `--force`, risk-check waivers
and CI baseline exceptions. Re-read the config and explicit arguments each
invocation; never inherit a previous resolved policy from the scheduler, status
comment, run handoff, `--fresh` or `--reset`.

## Default: skip waiting for native approval

The current-head automatic code review/autofix and every actionable finding
remain mandatory. A valid approving `om-auto-review-pr` body in an author's
comment review is real code-review evidence; the host's self-approval rejection,
missing native approval or stale `reviewDecision: CHANGES_REQUESTED` alone is
not a missing signal once that review explicitly resolves inherited feedback.
Do not rerun review, count another attempt or wait for a human just to change
the host's native review state. New or still-actionable objections always
reopen CR and go through the existing inherited-findings autofix loop. Human
native approval alone does not replace the automated code-review evidence.

## Opt in: require independent approval

When the resolved policy requires review (config or explicit
`--require-independent-review`), signal 1 additionally needs a native
`APPROVED` review pinned to the exact current head, from a write-authorized
human other than the PR author and the current automation account. Bot reviews,
author self-review, automation comment reviews, stale-head approvals, dismissed
or superseded approvals and incomplete/unreadable native review history do not
satisfy it. A newer standing `CHANGES_REQUESTED` verdict after that approval
keeps the independent requirement missing, even if older requested changes were
already addressed. Use the latest decisive native verdict per reviewer; an
ordinary later comment does not revoke an approval.

If automatic review is already valid but independent approval is missing,
end `waiting-human` with reason `independent native review required`, a future
cheap scheduler check and the exact missing evidence. Do not rerun a producing
stage, consume an attempt, or reuse signal 1 from an earlier default run.
An unresolved actionable objection instead requires autofix, not idle waiting.

At **every entrance** and immediately before finishing either mode, recompute
this policy from fresh evidence; head/target moves, revocations and new verdicts
invalidate the applicable evidence. The existing guarded `merge-pr` bypass may
skip unrelated host merge rules, but **never** this invocation's resolved
independent-review requirement. Missing strict evidence cannot be bypassed by
the default policy, `--force`, prior labels or a saved ready state.

Record `Independent review: skipped` or `required — <evidence link | missing reason>`
and its source (`config`, explicit CLI override, or missing-config default)
with current head, invocation/run and assessment time in the existing status
comment and run/scheduler plan checkpoint. Keep this provenance outside the
unchanged parsed signal-record block. On a later strict invocation, invalidate
any saved CR signal unless both current automated and independent evidence
hold; retain the real automated review so no duplicate stage runs. On a later
default invocation, release only an independent-review waiting state after
normal evidence reconciliation. Standalone review/merge skills keep their
existing gates and behavior.

Use this decision on normalized authenticated review history. `automationApproved`
and `unresolvedFindings` come from fresh signal reconciliation, never labels or
persisted policy. `writeAccess` is authenticated permission evidence, not a
claim in a review body; `commit` is the review's native reviewed SHA. Timestamps
order native verdicts only; they never establish which head was reviewed.

```javascript
function resolveAutomergePolicy({ config = {}, mode, requireReview = false, skipReview = false }) {
  if (requireReview && skipReview) throw new Error('Conflicting independent review flags')
  const settings = config.automerge === undefined ? {} : config.automerge
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('Invalid automerge configuration')
  const configuredMode = settings.mode === undefined ? 'prepare-and-merge' : settings.mode
  const configuredReview = settings.requireIndependentReview === undefined ? false : settings.requireIndependentReview
  const validMode = value => ['prepare-to-merge', 'prepare-and-merge'].includes(value)
  if (!validMode(configuredMode) || (mode !== undefined && !validMode(mode))) throw new Error('Invalid automerge mode')
  if (typeof configuredReview !== 'boolean' || typeof requireReview !== 'boolean' || typeof skipReview !== 'boolean') throw new Error('Invalid independent review policy')
  return { mode: mode ?? configuredMode, requireIndependentReview: requireReview ? true : skipReview ? false : configuredReview,
    modeSource: mode !== undefined ? 'cli' : settings.mode !== undefined ? 'config' : 'default',
    independentReviewSource: requireReview || skipReview ? 'cli' : settings.requireIndependentReview !== undefined ? 'config' : 'default' }
}
function independentReviewDecision({ required = false, head, author, currentUser, automationApproved, unresolvedFindings, reviews = [], reviewsComplete = true }) {
  const policy = required ? 'required' : 'skipped'
  if (!automationApproved || unresolvedFindings) return { outcome: 'review-required', policy, reason: 'Automatic review or actionable findings need resolution' }
  if (!required) return { outcome: 'pass', policy, reason: 'Native approval is optional; automatic code review holds' }
  if (!reviewsComplete) return { outcome: 'waiting-human', policy, reason: 'Independent native review history is incomplete' }
  const eligible = reviews.filter(review => typeof review.author === 'string' && review.type === 'User' && review.writeAccess === true && !review.isBot
    && ![author, currentUser].some(login => login.toLowerCase() === review.author.toLowerCase())
    && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)
    && Number.isFinite(Date.parse(review.submittedAt)))
    .sort((left, right) => Date.parse(left.submittedAt) - Date.parse(right.submittedAt))
  const latest = new Map()
  for (const review of eligible) latest.set(review.author.toLowerCase(), review)
  const standing = [...latest.values()]
  const approvals = standing.filter(review => review.state === 'APPROVED' && review.commit === head)
    .sort((left, right) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt))
  const approval = approvals.find(review => !standing.some(verdict => verdict.state === 'CHANGES_REQUESTED'
    && Date.parse(verdict.submittedAt) >= Date.parse(review.submittedAt)))
  return approval
    ? { outcome: 'pass', policy, evidence: approval.url, reason: 'Independent native approval on current head' }
    : { outcome: 'waiting-human', policy, reason: 'Independent native review required on current head' }
}
```
