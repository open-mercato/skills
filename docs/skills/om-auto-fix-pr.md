# om-auto-fix-pr

> 🤖 Autonomous — runs end-to-end without supervision

Takes one open PR by number and drives it to merge-ready without merging it. It first brings the branch up to date with the base, then loops review-autofix, built-in CI stabilization, and UI verification until the PR is approvable, green, and QA-evidenced. Non-blocking findings (nits, low-severity, out-of-scope) become tracked follow-up issues rather than blocking the PR, and a `--ci-only` mode drives just CI green on a PR or a plain branch. The PR is left merge-ready with normalized labels and handed off — this skill never merges itself. Use it for "get PR 123 merge-ready".

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{prNumber}` | Yes (unless `--ci-only --branch` is used) | The PR number to drive to merge-ready, e.g. `1234`. |
| `{repo}` | No | `owner/name`; inferred from the current git remote when omitted. |
| `--ci-only` | No | Run only the CI stabilization procedure (no review, UI, or follow-ups) and report. |
| `--branch <name>` | No | With `--ci-only`, stabilize CI on a plain branch that has no PR yet; switches to PR mode if an open PR already exists for it. |
| `--max-iterations <n>` | No | Outer review→CI→UI cycles before stopping (also caps the inner CI loop). Default `3`. |
| `--no-ui` | No | Skip UI verification even when the diff touches UI. |
| `--force` | No | Bypass the in-progress claim check; use only when intentionally taking over a PR another actor claimed. |

## Works with

Consumes a `{prNumber}` (the `PR:` reference line a PR-producing skill emitted) and ends by emitting the `PR:` / `Issue:` chaining reference lines. It orchestrates [om-auto-review-pr](om-auto-review-pr.md) (review + autofix + conflict/fork handling), [om-auto-qa-pr](om-auto-qa-pr.md) (UI QA), and [om-followup-issue-from-pr](om-followup-issue-from-pr.md) (nit follow-ups), then hands the merge-ready PR to [om-approve-merge-pr](om-approve-merge-pr.md); CI stabilization is built in.

---
*Source: [`skills/om-auto-fix-pr/SKILL.md`](../../skills/om-auto-fix-pr/SKILL.md)*
