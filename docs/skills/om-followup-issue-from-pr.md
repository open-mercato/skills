# om-followup-issue-from-pr

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Turns a pull request into tracked follow-up work. In comment mode you paste a PR or PR-comment link and it extracts the actionable ask, gathers PR context, and opens a follow-up issue assigned to the comment's @-mention (or the PR author if none). In design-doc mode, when the PR adds a design or proposal document, it checks whether an `Implement:` tracking issue already exists and opens one if not. Both modes can fire for a single PR — use it during code review when someone says "make a follow-up issue" or pastes a PR/comment link with that intent.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| PR or PR-comment URL | Yes | A PR conversation-comment link, an inline review-comment link, or a plain PR link; the repo (`owner/repo`) is parsed from the URL, not assumed from the current repo. |

## Works with

Consumes a PR/comment URL and emits one or more tracker issues (follow-up issues and/or an `Implement:` tracking issue), cross-linking design PRs to their tracking issues. It suggests picking implementation back up later with [om-auto-create-pr](om-auto-create-pr.md) using the linked design doc as the brief.

---
*Source: [`skills/om-followup-issue-from-pr/SKILL.md`](../../skills/om-followup-issue-from-pr/SKILL.md)*
