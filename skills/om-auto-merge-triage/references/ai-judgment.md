# AI judgment — worthwhile fixes close to merge

Run this assessment after the hard gates when `TIERS` includes `ai-judgment`,
or whenever a surviving PR has requested changes. This is triage, not an
approving review or QA sign-off. Make the decision yourself from evidence; do
not ask the author or user to score the PR.

## Gather evidence

1. Use **get-pr** for the current `headRefOid`, body, `createdAt`,
   `reviewDecision`, latest reviews and closing issue references. Read the
   current diff with **get-pr-diff**, the conversation with
   **list-issue-comments**, and inline feedback with **list-review-comments**.
   Read linked issues with **get-issue** when needed to establish the problem.
2. Check current CI with **get-pr-checks**. Pending checks need not rule out a
   candidate, but distinguish waiting from known failures and unknown results.
   Record any remaining failure and why its remediation is bounded.
3. Inspect relevant screenshots in the body, QA/evidence comments or linked
   artifacts through available authorized image-reading tools. Check that they
   show the affected flow and identify the tested head when available. A link
   alone is not inspected evidence. Mark inaccessible, unrelated or stale
   images as unverified; do not treat them as current QA approval. For a
   nonvisual fix, use relevant test results or reproduction evidence instead.
4. Compute age from `createdAt` to the run's UTC time in full days. At least
   `STALE_AFTER_DAYS` (default 7, loaded from
   `automerge.eligibility.aiJudgment.staleAfterDays`) is a positive rescue
   signal. A recent comment does not reset the PR's age.

These operations already belong to the tracker contract. If a descriptor
cannot supply a needed diff, review or evidence, record the gap and return
`unknown` for the affected judgment. Never infer that missing feedback means
there are no objections. Optional missing issue links or screenshots do not
block a judgment supported by other concrete evidence.

## Decide whether it matches

Require both findings below, with evidence supporting each:

- **The change makes sense and fixes something important.** Identify who is
  affected, the broken behavior or consequential gap, and the outcome the diff
  delivers. Examples include data loss, a security weakness, a blocked core
  workflow or a frequent correctness failure. Check that the fix is still
  needed and proportionate, rather than already fixed, superseded, duplicated
  or solving only a speculative problem. A priority label, closing reference
  or author's assertion alone does not establish importance.
- **The PR is close to merge.** The implementation addresses that problem and
  evidence supports the result. List the remaining actions. They must be
  concrete and bounded, such as a small review correction, a focused test,
  refreshing screenshots or completing an already-running CI job. Unresolved
  major correctness/security objections, a missing implementation, a redesign
  or an unsettled product decision mean it is not close to merge.

Give older PRs with relevant screenshots and requested changes particular
attention: they may be useful work stalled on a small review backlog. Inspect
the actual requests against the current diff; distinguish already-addressed
feedback from remaining work. The three signals need not all be present, and
none qualifies a PR alone. Do not invent a numerical confidence score.

Return `match`, `no match` or `unknown`, recording the current head. `match`
qualifies the `ai-judgment` tier. Other outcomes do not match that tier. For a
PR with requested changes, `no match` or `unknown` rejects it from the entire
proposal, even if it is small, trusted or labeled `qa-approved`; give the
decisive reason. Preserve all explicit exclusions. A positive result never
removes requested changes, grants approval or bypasses the buddy's gates.

## Decision record in the proposal

For every assessed PR, add a compact evidence-linked record below the proposal
table (collapse records for PRs outside the proposal). Put the outcome and
reason in the table's existing **Why** cell when proposed. Use this shape:

```markdown
- #<n> — AI judgment: {match | no match | unknown}; head: <sha>.
  Value: {affected user, important problem, why this fix still makes sense; source}.
  Readiness: {evidence and remaining actions; review/CI links}.
  Rescue signals: {age in days; inspected/current or unverified screenshots;
  requested changes and whether they are bounded}. {Material evidence gap, if any.}
```

On confirmation, refresh the diff, head, review state, CI and evidence before
reusing a judgment. If the PR no longer qualifies, skip it with the reason.
For an AI-selected PR, include its concrete value, evidence and remaining work
in the existing marker-idempotent label-rationale comment. Keep all existing
chaining fields and human-confirmation requirements.

## Calibration examples

- A 21-day-old PR fixes a frequently failing checkout step, has relevant
  current screenshots and tests, and needs a narrow validation correction
  requested by review: `match`; propose it in the AI tier unless an earlier
  tier matches, explaining that the review correction is still required.
- An old PR has screenshots but unresolved data-isolation objections:
  `no match`; if changes were requested, reject it regardless of file count.
- A small cosmetic PR with an ambitious description but no consequential
  problem: no AI-tier match. It may still qualify for a configured non-AI tier
  if it has no requested changes and passes all hard gates.
- A nonvisual data-loss fix with a reproducer and passing regression evidence,
  but no screenshots: it can match; explain the importance and the remaining
  path using that evidence.
