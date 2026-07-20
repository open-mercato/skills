# om-fix

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Implements the minimal code change that a prior root-cause step identified, adds the regression tests that prove it, and runs the configured validation gate until it passes. Before touching anything it claims the tracker issue (assignee, in-progress label, claim comment) so other automation backs off. It stays deliberately narrow — no refactors, no scope creep — and it never commits, pushes, or opens a PR; that is handed to om-open-pr. Use it as the fix step of an autofix chain once you already know what needs to change and where.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `issueId` | Yes | The tracker issue id to fix and claim. |
| `repo` | Optional | Repository as `owner/name`; inferred from the git remote when omitted. |

## Works with

Runs as step 3 of the autofix chain [om-verify-in-repo](om-verify-in-repo.md) → [om-root-cause](om-root-cause.md) → om-fix → [om-open-pr](om-open-pr.md) → [om-auto-review-pr](om-auto-review-pr.md), usually driven by [om-auto-fix-issue](om-auto-fix-issue.md). It consumes the preceding `om-root-cause` brief and emits a `Status: ready`/`Status: blocked` report plus a files-changed and tests summary that [om-open-pr](om-open-pr.md) parses to ship the work.

---
*Source: [`skills/om-fix/SKILL.md`](../../skills/om-fix/SKILL.md)*
