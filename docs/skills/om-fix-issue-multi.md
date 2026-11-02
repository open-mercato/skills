# om-fix-issue-multi

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Thin alias that runs [om-fix-issue](om-fix-issue.md) with the `multi` profile: the diagnosis and the final diff are each reviewed by a fresh Claude context plus every configured independent advisor, all bound to the same immutable review packet. Adds no workflow of its own.

## Parameters

Same as [om-fix-issue](om-fix-issue.md); the profile is fixed to `multi`.

## Works with

Wraps [om-fix-issue](om-fix-issue.md). Requires reviewers configured through [om-setup-agent-harness](om-setup-agent-harness.md).

---
*Source: [`skills/om-fix-issue-multi/SKILL.md`](../../skills/om-fix-issue-multi/SKILL.md)*
