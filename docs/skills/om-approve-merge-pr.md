# om-approve-merge-pr

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Given a single PR number, this skill submits an approving review and squash-merges the PR — fast and low-friction, but never faster than the merge gates. It refuses when the QA gate or a blocking label (`qa-failed`, `do-not-merge`, `blocked`, or an in-flight `qa`) forbids the merge, and it routes fixable blockers to automation instead of dead-ending: failing required checks to `om-auto-fix-pr --ci-only`, and conflicts or unresolved review feedback to the full `om-auto-fix-pr` loop. Optionally it can file a follow-up tracking issue in the same run. Use it when you say "approve and merge PR 123", "ship PR 123", or hand it a PR number with intent to merge.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| PR number | Yes | The PR to approve and merge, e.g. `2805`. |
| Repo | Optional | Target repository. Defaults to the repo of the current working directory; asks if not inside a git repo. |
| Follow-up | Optional | A follow-up to file after the merge — either a free-text ask or a pasted PR/comment link. Triggered by phrasing like "…and add a follow-up" or "follow-up: <ask>". |

## Works with

Consumes a PR number and emits an approving review, a squash-merge, and optionally a follow-up issue URL. It routes fixable blockers to [om-auto-fix-pr](om-auto-fix-pr.md) (CI-only or full loop) and hands a pasted PR/comment follow-up link to [om-followup-issue-from-pr](om-followup-issue-from-pr.md); it is itself one of the QA gate's enforcement points in the code-review pipeline.

---
*Source: [`skills/om-approve-merge-pr/SKILL.md`](../../skills/om-approve-merge-pr/SKILL.md)*
