# om-auto-fix-issue

> 🤖 Autonomous — runs end-to-end without supervision

Takes a tracker issue (a GitHub issue by default) from a single command all the way to a labeled, reviewed PR — without disturbing your active worktree. It first classifies the issue: a bug is driven through the autofix chain (verify → root-cause → fix → open PR → review loop), while a feature request takes the spec-then-build route instead. Everything happens in an isolated worktree under the in-progress claim protocol, and the run stops cleanly when the issue is already solved or already claimed by someone else. Use it for "fix issue 123" or "implement issue 123".

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{issueId}` | Yes | The tracker issue number (a GitHub issue number by default), e.g. `1234`. |
| `{repo}` | No | `owner/name`; inferred from the current git remote when omitted. |
| `--interactive` | No | Feature route only: opt into human gates so the spec is written with interactive Open Questions stops instead of autonomous defaults. |
| `--slug <kebab-case>` | No | Feature route only: override the derived slug (passed through to delegated skills). |
| `--no-ui` | No | Feature route only: skip end-of-run UI verification. |
| `--force` | No | Bypass the in-progress concurrency check; use only when intentionally taking over an issue another actor claimed. |

## Works with

Consumes an `{issueId}` and finishes by emitting the `PR:` / `Issue:` chaining reference lines for the next skill in a chain. On the bug route it invokes [om-verify-in-repo](om-verify-in-repo.md), [om-root-cause](om-root-cause.md), [om-fix](om-fix.md), [om-open-pr](om-open-pr.md), and [om-auto-review-pr](om-auto-review-pr.md); on the feature route it delegates to [om-auto-write-spec](om-auto-write-spec.md) and [om-auto-implement-spec](om-auto-implement-spec.md).

---
*Source: [`skills/om-auto-fix-issue/SKILL.md`](../../skills/om-auto-fix-issue/SKILL.md)*
