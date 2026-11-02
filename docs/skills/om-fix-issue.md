# om-fix-issue

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Fixes a tracker issue end to end and stops before publication: qualification, isolated worktree, root cause, minimal fix with a regression test observed failing first, the full validation gate, and a fresh-context code review. It leaves a verified staged diff on an unchanged `HEAD` with a report and a publish checklist — no commit, push, or pull request. Profile variants add cross-model review councils, model workers, or both.

## Parameters

- `{issueId}` (required) — tracker issue identifier.
- `{repo}` — repository handle understood by the tracker descriptor.
- `--profile <standard|optimized|multi|multi-optimized|high-assurance>` — default `standard`.
- `--force` — override an active claim after explicit confirmation.
- `--abort` — release this run's claim without publishing.

## Works with

Delegates to the same lower-level skills as the autonomous chain — [om-verify-in-repo](om-verify-in-repo.md), [om-root-cause](om-root-cause.md), [om-fix](om-fix.md), [om-code-review](om-code-review.md) — but never calls [om-open-pr](om-open-pr.md). Needs [om-setup-agent-harness](om-setup-agent-harness.md) for any non-`standard` profile.

---
*Source: [`skills/om-fix-issue/SKILL.md`](../../skills/om-fix-issue/SKILL.md)*
