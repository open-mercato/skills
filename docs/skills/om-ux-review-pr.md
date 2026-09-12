# om-ux-review-pr

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

The design-judgment layer that follows QA screenshots: walks a PR's screens in a real browser, **performing** the user's tasks (an empty dataset is a create-flow test, not a blocker), checks the state matrix (empty, loading, error, no-permission, narrow viewport), and posts one review comment where every finding carries tagged evidence, a pattern (ideally an existing screen in the repo that already does it right), a trade-off, and a done-when criterion. Findings are ranked by user impact, never by ease of fix. A humane gate checks every persuasive element against deceptive-pattern taxonomy — findings no conversion metric can dismiss. The delivered report speaks the reader's language, declares what was not walked, and never blocks a merge by itself.

## Parameters

Accepts a PR number, a branch name, or nothing (the current branch).

## Works with

Judges against the contract written by [om-ux-setup](om-ux-setup.md) when present (its absence is stated in the report). Confirmed brief/spec/prototype decisions can support findings about accepted behavior even without a visual contract; neutral low-fi styling and unconfirmed assumptions cannot. Composes with [om-prepare-test-env](om-prepare-test-env.md) and the browser provider to bring the PR up; complements [om-auto-qa-pr](om-auto-qa-pr.md), which captures evidence without judging it. For module- or flow-level analysis, it defers to [om-ux-shape](om-ux-shape.md) in Review mode and serves as its evidence-gathering procedure.

---
*Source: [`skills/om-ux-review-pr/SKILL.md`](../../skills/om-ux-review-pr/SKILL.md)*
