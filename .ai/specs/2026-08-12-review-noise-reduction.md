# Suppress content-identical auto-reviews safely

## 📝 TLDR

Daily rebases of long-lived PRs currently trigger another full `om-auto-review-pr` pass even when the proposed content is unchanged. This spec replaces the head-SHA-only re-review trigger with a whitespace-preserving patch fingerprint while preserving the existing claim and early-exit behavior. It deliberately does not suppress CI/workflow, dependency, lockfile, formatting, conflict, or failing-check signals; those paths continue through the current review workflow.

## 📝 Problem Statement

`skills/om-auto-review-pr/references/pr-metadata.md` currently treats any new head SHA as new work. A rebase rewrites commit SHAs, so a parked PR can accumulate repeated reviews even when its effective diff is unchanged.

The desired outcome is narrow: if the exact patch has already been reviewed by the same automation identity and the PR is currently conflict-free with no failing required check, a rerun should exit without claiming the PR or posting a new tracker artifact. A content change, an unreadable comparison, a conflict, or a failing required check continues through the existing guarded workflow.

## 📝 Scope and non-goals

This spec owns one capability: recognizing a previously reviewed patch and suppressing only the redundant substantive review.

It does not:

- classify CI/workflow or dependency changes as review-free; those surfaces remain security- and supply-chain-sensitive;
- classify whitespace-only code changes as review-free; whitespace is semantic in languages and formats such as Python, YAML, and Makefiles;
- merge claim, take-over, completion, or release comments; their shapes and freshness semantics are shared concurrency signals, and at least one consumer is executable rather than prose: `skills/om-pipeline-retro/references/classify-runs.sh` matches opener lines with the regex `started by|starting[^\n]*run|taking over|resum(ing|ed)[^\n]*run`, counting one run per opener, so folding these into a comment updated in place would silently change every figure it reports;
- shorten the human-facing review body (see `.ai/specs/2026-08-13-review-comment-budget.md`);
- replace repeated conflict/check reviews with a status-comment state machine or add a `do-not-review` policy; each is independently deployable and needs its own design;
- implement incremental/delta-only review, which needs its own design after fingerprinting has soaked.

## 📝 Proposed Solution

### 1. Add a read-only preflight before the claim

`om-auto-review-pr` gains a tightly bounded preflight that may read tracker state and the PR diff but may not mutate tracker state, create a worktree, run validation, or submit findings.

The preflight performs these checks in order:

1. Run **current-user** and **get-pr**, requesting the existing claim fields plus base/head OIDs, reviews, mergeability, labels, and comments.
2. Apply the existing three-signal concurrency decision immediately. A live foreign lock stops (or follows the explicit `--force` path); a same-user lock is a re-entry and posts the existing take-over marker before continuing through the normal review path. Fingerprint suppression is available only when the PR was unclaimed at this check.
3. For an unclaimed PR, discover required checks via **get-required-checks** and read them via **get-pr-checks**. Evaluate merge conflicts and required-check failures before fingerprint suppression.
4. If a conflict or required-check failure is present, claim the PR through the existing three-signal protocol and enter the existing early-exit path unchanged.
5. Otherwise fetch the full patch through **get-pr-diff**, compute its fingerprint, and compare it with the latest own review marker.
6. Identical valid fingerprint: exit as a no-op before claiming. Missing/invalid state or a changed fingerprint: claim immediately, then run the existing review workflow.

This is a skill-specific read-only preflight exception, not a new shared claim shape. Once the preflight decides work is required, the existing claim/take-over comment must land before any validation, worktree creation, review, label mutation, or user-facing work product.

### 2. Use a whitespace-preserving patch identity

Compute the identity from the full tracker diff so no checkout is needed before the claim:

Store the exact **get-pr-diff** output in a securely created temporary file, set
`PR_DIFF_FILE` to that path, then run the executable fingerprint step:

```bash
FINGERPRINT=$(git patch-id --verbatim < "$PR_DIFF_FILE" | awk 'NR == 1 { print $1 }')
```

`--verbatim` preserves whitespace but is mutually exclusive with `--stable`; file-order differences may therefore cause a conservative extra review. Before use, feature-detect support for `--verbatim`; an unavailable option, diff-fetch failure, timeout, empty/multiple unexpected IDs, or non-40-hex output falls back to today's head-SHA behavior and performs a review. Suppression always fails open.

The submitted review body carries an additive marker:

```html
<!-- om-review: v=1 fingerprint=<40-hex> base=<baseRefOid> head=<headRefOid> files=<n> -->
```

Read reviews authored by `$CURRENT_USER` newest first. Suppress only when the
**newest own review itself** contains a valid marker matching the current patch;
an unmarked newer review (including today's conflict/CI early exits) fails open
to a full review. Reverting to an older reviewed state therefore triggers one
conservative re-review; the first version does not search historical matches.

## 📝 Architecture and state

`om-auto-review-pr` remains the sole owner of the content-identical no-op decision. The queue skill delegates normally and gains no new filter or policy.

Persistent state stays in tracker artifacts:

| State | Location | Purpose |
|---|---|---|
| Reviewed patch identity | HTML marker in the submitted review body | Compare a new patch with the newest own review |
| Lock ownership | Existing assignee + `in-progress` + fresh claim/take-over comment | Preserve cross-skill concurrency semantics |

No sidecar repo file or new tracker operation is introduced. Existing **get-pr**, **get-pr-diff**, **get-pr-checks**, and **get-required-checks** operations cover the preflight.

## 📝 Compatibility

- The review marker is an additive HTML comment. Older installed skills ignore it; newer skills encountering an older review without a marker fail open to a full review.
- The tracker operations contract, config schema, label group semantics, claim marker formats, verdict format, and chaining lines do not change.
- Partial upgrades remain correct-but-noisy: any combination missing fingerprint support continues reviewing by head SHA.

## 📝 Edge Cases & Failure Scenarios

| Case | Behavior |
|---|---|
| No prior valid marker | Run the normal review and write one |
| Live foreign claim | Stop through the existing concurrency guard; never inspect the patch or suppress another actor's run |
| Same-user claim or chain hand-off | Post the existing take-over marker and continue normally; do not silently exit or release an inherited lock |
| `git patch-id --verbatim` unsupported | Fall back to the head-SHA review path |
| Diff fetch is truncated, times out, or yields an invalid ID | Fall back to the head-SHA review path |
| Binary or mode-only change | Fingerprint changes; run the normal review |
| Whitespace-only change in any file | Fingerprint changes; run the normal review |
| CI/workflow, manifest, or lockfile change | Fingerprint changes; run the normal review |
| Rebase with the same patch | Fingerprint matches; if mergeability/checks are healthy, exit before claim |
| Force-push back to an older reviewed patch | Compare only the newest marker and conservatively review once |
| Base advances and creates a conflict while the patch is unchanged | Health check wins; claim and run the existing conflict early exit |
| A required check turns red while the patch is unchanged | Health check wins; claim and run the existing CI early exit |
| Conflict/check recovers while the patch is unchanged | The newest own early-exit review has no fingerprint marker, so suppression fails open and a normal review restores the pipeline state |
| Multiple automation reviewers | Read only markers authored by `$CURRENT_USER` |

## 📝 Risks & Impact Review

| Risk | Severity | Mitigation |
|---|---|---|
| A changed patch is treated as identical | High | Whitespace-preserving identity, binary/mode fixtures, strict marker validation, and fail-open fallback |
| CI/conflict state is wrongly suppressed | High | Mergeability and required checks are evaluated first; unhealthy state fails open to the existing early-exit review |
| Preflight weakens the claim protocol | Medium | The existing lock decision is its first branch; only an unclaimed PR reaches fingerprint reads, and any actionable state claims before mutation, validation, checkout, or findings. Claim-comment shapes are untouched, which also keeps `om-pipeline-retro`'s shipped run classifier working |
| Partial upgrades behave inconsistently | Low | All added state is ignorable; unsupported comparisons perform the existing noisy review |

Rollback removes the preflight and returns to head-SHA review selection. Existing HTML markers become inert; no data migration or cleanup is required.

## 📋 Implementation Plan

1. **Add fingerprint/preflight fixtures.** Create a portable test script and fixture repos covering identical rebases; changed text; whitespace-semantic Python/YAML/Makefile edits; binaries; modes; force-push to older state; base advance; conflicts/failing checks winning over equality; invalid/truncated diff; and Git without `--verbatim`.
2. **Write `om-auto-review-pr/references/change-detection.md`.** Document the preflight order, feature detection, marker grammar, strict parser, timeout, and fail-open table.
3. **Update `om-auto-review-pr/references/pr-metadata.md`.** Replace the head-SHA-only decision with the newest-valid-marker comparison and conservative fallback.
4. **Update `om-auto-review-pr/references/early-exit-checks.md` only as needed for ordering.** Preserve its current verdict, label, and handoff behavior; document that an unhealthy preflight enters it instead of suppressing the run.
5. **Update `om-auto-review-pr/references/claim-pr.md` only in its marked skill-specific section.** State the bounded read-only preflight exception; leave the shared claim formats and lifecycle byte-identical. Per the standard-file rule, diff and list the copies in `om-auto-continue-pr`, `om-auto-continue-pr-loop`, `om-auto-create-pr`, `om-auto-create-pr-loop`, `om-auto-fix-issue`, `om-auto-fix-pr`, `om-auto-manage-issues`, `om-auto-qa-pr`, `om-auto-write-spec`, `om-close-fixed-issues`, `om-fix`, `om-open-pr`, `om-review-prs`, and `om-verify-in-repo`, then ask whether to sync; recommend **no sync** because the exception is specific to this skill and prove the shared section stayed byte-identical.
6. **Wire the preflight into `om-auto-review-pr/SKILL.md`.** Health/fingerprint reads precede claim; every work-producing branch claims before continuing.
7. **Record and announce the behavior.** Update `DECISIONS.md`, `CHANGELOG.md`, and `UPGRADE_NOTES.md`; explain fail-open behavior and that CI/dependency/whitespace changes still receive normal review.
8. **Validate.** Run the new fixture script and every configured validation command; grep for the obsolete head-SHA-only rule and for any accidental claim-marker change.

Each step is independently testable and leaves the existing fallback path working.

## 📋 Acceptance Criteria

- Rebase an already reviewed patch without content change: zero new tracker artifacts, no claim, no worktree, no validation command, and no substantive review; only a terminal no-op explanation is produced.
- Change Python indentation, YAML structure, a Makefile recipe, a workflow, a manifest, a lockfile, a binary, or a file mode: normal review runs.
- With an unchanged patch, make CI fail or create a base conflict: the existing early-exit review/label flow runs instead of the no-op path.
- Recover that check/conflict without changing the patch: the newer unmarked early-exit review forces a normal review; stale `changes-requested` state is not preserved by a no-op.
- Run on an older Git or simulate an invalid/truncated diff: normal head-SHA review runs.
- Instrument a changed/invalid/unhealthy path: the claim/take-over comment lands before worktree creation, validation, review, label mutation, or another user-facing artifact.
- Present a live foreign lock or a same-user chain hand-off: the existing stop/take-over behavior wins before fingerprinting, and the no-op path neither overrides nor releases that lock.
- Run two skill versions against the same PR: old versions ignore markers; new versions read only valid own markers; claim/take-over freshness remains interoperable.

## 📋 Rollout

1. Ship behind the fail-open path and run the fixture matrix in CI.
2. Soak on long-lived PRs for one week, inspecting every suppressed run's terminal reason and confirming unhealthy PRs still use the existing early-exit path.
3. Explicitly state that workflow, dependency, lockfile, whitespace, conflict, and failing-check signals are not quieted.
4. Revert the preflight immediately on any false-silence report; the rollback needs no data migration.
