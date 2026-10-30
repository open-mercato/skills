# om-auto-review-pr

> 🤖 Autonomous — runs end-to-end without supervision

Reviews or re-reviews a PR by number in an isolated worktree, leaving your current worktree untouched. It fetches the exact PR from the tracker, runs the code-review engine (or a specification review for spec-only design PRs), submits an approve/request-changes verdict, and manages the pipeline labels. When changes are requested it immediately enters an autonomous autofix loop — resolving conflicts, fixing code, adding tests, validating, and re-reviewing — until the PR is genuinely merge-ready or only a non-actionable blocker remains. Usage: `/om-auto-review-pr <PR-number>`.

A fork replacement copies applicable labels, including any configured automerge label, and preserves the target and contributor credit. The caller consumes the replacement's PR reference and continues on it; an active automerge chain keeps working through the final guarded merge without a human restart. QA approvals and transient claim labels do not transfer to the new head, and the author recheck invitation is advisory in that chain. Standalone review does not gain merge authority.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{prNumber}` | Yes | The PR number to review or re-review, e.g. `1234`. |
| `--force` | No | Bypass the in-progress concurrency check; use when intentionally taking over a PR another auto-skill or human already claimed. |

## Works with

Consumes a `{prNumber}` (the `PR:` reference line a PR-producing skill emitted), reviews that existing PR, and ends by reporting its verdict (`APPROVED` / `CHANGES REQUESTED`) plus the `PR:` reference line (and `Issue:` when known) for the next skill in a chain. It runs [om-code-review](om-code-review.md) verbatim as its review engine inside the isolated worktree, and is itself invoked by chain skills such as [om-auto-fix-issue](om-auto-fix-issue.md), [om-auto-fix-pr](om-auto-fix-pr.md), and [om-auto-qa-pr](om-auto-qa-pr.md).

---
*Source: [`skills/om-auto-review-pr/SKILL.md`](../../skills/om-auto-review-pr/SKILL.md)*
