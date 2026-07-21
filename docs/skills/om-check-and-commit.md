# om-check-and-commit

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Verifies that the current branch is ready to publish by running every configured validation command in order, then fixes straightforward failures — including locale-file drift when the repo checks locales. Once every required gate passes, and only when you explicitly asked for publication in the same request, it commits with a conventional-commit message and pushes the branch. Use it when you want to make CI-style verification pass and then commit and push.

## Parameters

This skill takes no parameters.

## Works with

Runs purely against the repository's configured `validation.commands` gate — it uses no tracker operations and applies no labels, so it does not chain into or invoke companion skills. It commits and pushes the current branch itself when publication was requested.

---
*Source: [`skills/om-check-and-commit/SKILL.md`](../../skills/om-check-and-commit/SKILL.md)*
