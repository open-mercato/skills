# 🚀 Release Manager

The pipeline sweeps open PRs, tells you which can merge now and which are blocked, drives the close-but-not-ready ones to merge-ready, and ships — while keeping the QA gate a human decision. `om-auto-fix-pr` loops review-autofix, CI stabilization, and UI verification until a PR is approvable, green, and QA-evidenced, then hands off to `om-approve-merge-pr` rather than merging itself. At release time it drafts the changelog and reconciles merged PRs with the tracker.

← Back to the [README](../../README.md#-workflows-by-role)

## Skills you'll use

| Skill | When | Example call | What you get |
|---|---|---|---|
| `om-merge-buddy` | Survey the merge queue | `/om-merge-buddy` | a report of which PRs can merge now and which are close but blocked |
| `om-review-prs` | Clear the review backlog | `/om-review-prs` | every unreviewed open PR reviewed, newest first, claim-lock aware |
| `om-auto-fix-pr` | Drive one PR to merge-ready | `/om-auto-fix-pr 123` | an approvable, green, QA-evidenced PR handed to `om-approve-merge-pr` |
| `om-stabilize-ci` | Get red CI to green | `/om-stabilize-ci 123` | green CI from real fixes with tests, never faked |
| `om-approve-merge-pr` | Ship a ready PR | `/om-approve-merge-pr 123` | the PR approved and squash-merged, or refused if the QA gate/a label forbids it |
| `om-auto-update-changelog` | Prep a release | `/om-auto-update-changelog` | a CHANGELOG entry landed as a docs PR with Supersede Credit |
| `om-sync-merged-pr-issues` | Post-merge housekeeping | `/om-sync-merged-pr-issues` | issues closed for merged PRs, comments on PRs closed without merging |

## What happens automatically

- **Readiness classification** — labels, reviews, CI, and mergeability are read to sort merge-now from blocked.
- **Autofix + stabilize + verify loop** — `om-auto-fix-pr` re-merges the base as it advances and iterates until the PR is clean.
- **Follow-up issues for nits** — non-blocking findings become tracked issues via `om-followup-issue-from-pr`, not merge blockers.
- **QA-gate guard on merge** — `om-approve-merge-pr` refuses a `needs-qa` PR without `qa-approved`, and blocking labels stop it.
- **Supersede Credit** — carried-forward fork PRs credit the original contributor in the changelog and reconciliation.
- **Claim locks respected** — sweeps back off PRs another agent is already working.

## Tips

- The **QA gate is the hard rule**: `needs-qa` cannot merge until a human adds `qa-approved`. Automated skills request QA; they never grant it — `om-approve-merge-pr` will refuse rather than override it.
- `om-auto-fix-pr` **never merges** — it prepares and hands off to `om-approve-merge-pr`, keeping the merge itself a deliberate step.
- Watch merge order: re-merge the latest base before approving; `om-auto-fix-pr` does this automatically as the base advances, but a manually-approved stack still needs the sequence.
- `om-stabilize-ci` never goes green by weakening tests or disabling checks — a red build it can't fix honestly is reported as a genuine blocker, not merged around.
- Run `om-sync-merged-pr-issues` after a merge batch so the tracker reflects what actually shipped before you cut the release.
