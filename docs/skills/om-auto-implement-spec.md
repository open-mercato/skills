# om-auto-implement-spec

> 🤖 Autonomous — runs end-to-end without supervision

Takes an existing spec and returns an implemented, code-reviewed, UI-verified, ready PR with screenshots of the working app in its comments. It resolves the spec by path, name, linked issue, or spec-PR number (stopping cleanly with candidate suggestions when not found), reuses an existing spec-PR branch when one is present, then delegates the actual implementation to the create/continue engine before running the review loop and UI verification. It is deliberately thin — resolution and routing only. Use it for "implement the spec X" or "build spec from issue 123".

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{spec}` | Yes | The spec to implement: a repo-relative path, a spec name/slug, an issue id whose body links a spec, or a spec-PR number. |
| `{repo}` | No | `owner/name`; inferred from the git remote when omitted. |
| `--no-ui` | No | Skip end-of-run UI verification even when the change is user-facing. |
| `--force` | No | Bypass claim-conflict checks (passed through to the engine skill). |

## Works with

Continues on the spec PR that [om-auto-write-spec](om-auto-write-spec.md) may already have opened rather than opening a second one, and ends with `PR_URL=` / `PR_NUMBER=` markers. It delegates implementation to [om-auto-create-pr](om-auto-create-pr.md) (fresh runs) or [om-auto-continue-pr](om-auto-continue-pr.md) (when a PR exists), then runs [om-auto-review-pr](om-auto-review-pr.md) and [om-auto-qa-pr](om-auto-qa-pr.md), with [om-open-pr](om-open-pr.md) as a fallback piece.

---
*Source: [`skills/om-auto-implement-spec/SKILL.md`](../../skills/om-auto-implement-spec/SKILL.md)*
