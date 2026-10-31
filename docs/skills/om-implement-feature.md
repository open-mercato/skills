# om-implement-feature

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Implements a feature from a plain-text brief and stops before publication: specification with a hard open-questions gate, isolated worktree, phased implementation, unit and integration coverage, design-system enforcement on touched UI, the full validation gate, and a fresh-context review of spec and diff. It leaves a verified staged diff on an unchanged `HEAD` with a report and a publish checklist.

## Parameters

- `{brief}` (required) — feature goal, constraints, and acceptance criteria.
- `--profile <standard|optimized|multi|multi-optimized|high-assurance>` — default `standard`.
- `--slug <kebab-case>` — override the worktree branch and spec slug.

## Works with

Runs [om-spec-writing](om-spec-writing.md), [om-integration-tests](om-integration-tests.md), and [om-code-review](om-code-review.md), and prefers repo-local spec skills when present. Never calls [om-auto-create-pr](om-auto-create-pr.md). Needs [om-setup-agent-harness](om-setup-agent-harness.md) for any non-`standard` profile.

---
*Source: [`skills/om-implement-feature/SKILL.md`](../../skills/om-implement-feature/SKILL.md)*
