# Worked examples

Illustrative examples for `om-close-fixed-issues` — a dry-run preview and the
three comment templates rendered with concrete values. The authoritative
templates live inline in the workflow steps (4a/4b/4c) and the dry-run behavior
in step 5; these are here to show the filled-in shape.

## Dry-run preview

```text
$ /om-close-fixed-issues --since 2026-04-01 --dry-run

Window: 2026-04-01 → 2026-04-17
Repo:   acme/widgets
Base branch: main

DRY-RUN: would close #1350 with link to PR #1421 (merged into main)
DRY-RUN: would comment on #1288 about PR #1419 (merged into release/0.5.0, not closing)
DRY-RUN: would comment on #1299 about PR #1412 (closed unmerged; superseded by #1415)
DRY-RUN: would skip #1270 — carries `do-not-close`
DRY-RUN: would skip #1260 — already closed

Summary: would-close 1, would-comment 2, would-skip 2.
```

## Close comment template (merged)

```markdown
✅ Fixed by #1421 (https://github.com/acme/widgets/pull/1421) — merged at 2026-04-15T14:02:31Z (commit `8a60110`).

Closed automatically by the `om-close-fixed-issues` skill. Credit to @alice (or the original author when the PR is a carry-forward — see the PR body for credit details).

If this is incorrect, reopen the issue and add the `do-not-close` label so future runs leave it alone.
```

## Informational comment template (closed unmerged + superseded)

```markdown
ℹ️ #1412 (https://github.com/acme/widgets/pull/1412) referenced this issue but was closed **without merging** on 2026-04-10T09:15:00Z. It was superseded by #1415 (https://github.com/acme/widgets/pull/1415).

This issue remains open. Posted automatically by the `om-close-fixed-issues` skill.
```

## Informational comment template (merged to non-base branch)

```markdown
ℹ️ #1419 (https://github.com/acme/widgets/pull/1419) references this issue and was merged into `release/0.5.0`, which is not the configured base branch (`main`). Leaving this issue open until the change lands on `main`.

Posted automatically by the `om-close-fixed-issues` skill.
```
