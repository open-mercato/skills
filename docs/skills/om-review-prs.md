# om-review-prs

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

A day-start review queue that sweeps every currently unreviewed open pull request and reviews them one at a time, newest first. It fetches open PRs, filters out drafts, already-decided, self-authored, blocked, and claimed PRs, presents the queue, then runs the full `om-auto-review-pr` workflow on each. It respects `in-progress` claim locks and never force-claims in batch mode, skipping any PR another actor owns. Use it to clear the review backlog in a single pass.

## Parameters

This skill takes no parameters.

## Works with

A sweep that consumes and emits no `PR_URL` / `PR_NUMBER` markers itself — each delegated review reports its own verdict and markers. It requires [om-auto-review-pr](om-auto-review-pr.md) (reused verbatim per PR; the run stops if it is missing) and optionally suggests [om-merge-buddy](om-merge-buddy.md) afterward to show what is now merge-ready.

---
*Source: [`skills/om-review-prs/SKILL.md`](../../skills/om-review-prs/SKILL.md)*
