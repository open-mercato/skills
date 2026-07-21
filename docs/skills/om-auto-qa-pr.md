# om-auto-qa-pr

> 🤖 Autonomous — runs end-to-end without supervision

QAs a PR's UI change in a real browser through the configured browser-provider descriptor, capturing screenshots and a pass/fail report as concrete visual evidence. It runs after code review — if the PR has not been reviewed yet it invokes the review skill first — then exercises the changed surfaces and hands the evidence to reviewers as a PR comment (optionally signing off with self-QA labels). It stays read-only on source code: it never edits files, pushes, or merges. It also runs in a local, tracker-less mode that verifies the current worktree and writes artifacts.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{prNumber}` | No | The PR to verify. Given (with a tracker configured) runs PR mode; omitted (or no tracker) runs local mode against the current worktree. |
| `--base <branch>` | No | Base branch for diff and test-presence detection. Default: the pipeline config's `baseBranch`. |
| `--evidence-only` | No (default) | Produce evidence only; do not touch pipeline/meta labels. |
| `--self-qa-signoff` | No (PR mode) | On a fully-green run with screenshots and a `needs-qa` (no `skip-qa`) PR, additionally apply `qa-approved` + `qa-self-verified`. |
| `--apply-failure` | No (PR mode) | On failure, apply `qa-failed`. Off by default. |
| `--keep-env` | No | Leave the environment running on exit even if this run started it. |
| `--artifacts <dir>` | No | Override the artifacts directory. Default `<paths.qa>/artifacts_<runId>`. |
| `--force` | No (PR mode) | Bypass the in-progress claim check to take over a PR another actor claimed. |

## Works with

In PR mode consumes a `{prNumber}` (the `PR:` reference line a PR-producing skill emitted), posts screenshot QA evidence back to that PR, and ends with the `PR:` reference line; in local mode the artifacts folder is the deliverable. Its review-first gate runs [om-auto-review-pr](om-auto-review-pr.md) when the PR is unreviewed, it boots the app via [om-prepare-test-env](om-prepare-test-env.md), records a follow-up scenario for [om-integration-tests](om-integration-tests.md), and defers a missing browser provider to [om-setup-agent-pipeline](om-setup-agent-pipeline.md).

---
*Source: [`skills/om-auto-qa-pr/SKILL.md`](../../skills/om-auto-qa-pr/SKILL.md)*
