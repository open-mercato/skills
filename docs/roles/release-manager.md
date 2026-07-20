# 🚀 Release Manager

The pipeline sweeps open PRs, tells you which can merge now and which are blocked, drives the close-but-not-ready ones to merge-ready, and ships — while keeping the QA gate a human decision. [`om-auto-fix-pr`](../skills/om-auto-fix-pr.md) loops review-autofix, CI stabilization, and UI verification until a PR is approvable, green, and QA-evidenced, then hands off to [`om-approve-merge-pr`](../skills/om-approve-merge-pr.md) rather than merging itself. At release time it drafts the changelog and reconciles merged PRs with the tracker.

← Back to the [README](../../README.md#-workflows-by-role)

## Skills you'll use

| Skill | When | Example call | What you get |
|---|---|---|---|
| [`om-merge-buddy`](../skills/om-merge-buddy.md) | Survey the merge queue | `/om-merge-buddy` | a report of which PRs can merge now and which are close but blocked |
| [`om-review-prs`](../skills/om-review-prs.md) | Clear the review backlog | `/om-review-prs` | every unreviewed open PR reviewed, newest first, claim-lock aware |
| [`om-auto-fix-pr`](../skills/om-auto-fix-pr.md) | Drive one PR to merge-ready | `/om-auto-fix-pr 123` | an approvable, green, QA-evidenced PR handed to [`om-approve-merge-pr`](../skills/om-approve-merge-pr.md) |
| `om-auto-fix-pr --ci-only` | Get red CI to green | `/om-auto-fix-pr 123 --ci-only` | green CI from real fixes with tests, never faked |
| [`om-approve-merge-pr`](../skills/om-approve-merge-pr.md) | Ship a ready PR | `/om-approve-merge-pr 123` | the PR approved and squash-merged, or refused if the QA gate/a label forbids it |
| [`om-auto-update-changelog`](../skills/om-auto-update-changelog.md) | Prep a release | `/om-auto-update-changelog` | a CHANGELOG entry landed as a docs PR with Supersede Credit |
| [`om-close-fixed-issues`](../skills/om-close-fixed-issues.md) | Post-merge housekeeping | `/om-close-fixed-issues` | issues closed for merged PRs, comments on PRs closed without merging |

## What happens automatically

- **Readiness classification** — labels, reviews, CI, and mergeability are read to sort merge-now from blocked.
- **Autofix + stabilize + verify loop** — [`om-auto-fix-pr`](../skills/om-auto-fix-pr.md) re-merges the base as it advances and iterates until the PR is clean.
- **Follow-up issues for nits** — non-blocking findings become tracked issues via [`om-followup-issue-from-pr`](../skills/om-followup-issue-from-pr.md), not merge blockers.
- **QA-gate guard on merge** — [`om-approve-merge-pr`](../skills/om-approve-merge-pr.md) refuses a `needs-qa` PR without `qa-approved`, and blocking labels stop it.
- **Supersede Credit** — carried-forward fork PRs credit the original contributor in the changelog and reconciliation.
- **Claim locks respected** — sweeps back off PRs another agent is already working.

## Tips

- The **QA gate is the hard rule**: `needs-qa` cannot merge until a human adds `qa-approved`. Automated skills request QA; they never grant it — [`om-approve-merge-pr`](../skills/om-approve-merge-pr.md) will refuse rather than override it.
- [`om-auto-fix-pr`](../skills/om-auto-fix-pr.md) **never merges** — it prepares and hands off to [`om-approve-merge-pr`](../skills/om-approve-merge-pr.md), keeping the merge itself a deliberate step.
- Watch merge order: re-merge the latest base before approving; [`om-auto-fix-pr`](../skills/om-auto-fix-pr.md) does this automatically as the base advances, but a manually-approved stack still needs the sequence.
- [`om-auto-fix-pr`](../skills/om-auto-fix-pr.md)'s CI-stabilization step never goes green by weakening tests or disabling checks — a red build it can't fix honestly is reported as a genuine blocker, not merged around. Use `--ci-only` to run just that step against a plain branch or no-PR change.
- Run [`om-close-fixed-issues`](../skills/om-close-fixed-issues.md) after a merge batch so the tracker reflects what actually shipped before you cut the release.
