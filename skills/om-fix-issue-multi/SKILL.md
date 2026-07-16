---
name: om-fix-issue-multi
description: Thin cross-model alias for om-fix-issue that reviews the diagnosis and final diff with configured independent advisors, then leaves the verified fix staged and unpublished. Use when the user says "fix with multiple models", "cross-model staged fix", "multi review this issue", or "napraw issue z wieloma modelami".
---

# Fix Issue — Multi

Select the `multi` profile without duplicating the base workflow.

## Arguments

- `{issueId}` (required) — pass through to `om-fix-issue`.
- `{repo}` and `--force` (optional) — pass through unchanged.

## Workflow

1. Read and execute `om-fix-issue` in full with `--profile multi`.
2. Preserve its diagnosis council, final council, stage-only boundary, claim handling, and report.

## Rules

- Do not restate or replace any base workflow phase.
- Never downgrade `multi` to `standard` because a reviewer is unavailable; apply the configured review policy and report skips.
- Never commit, push, or publish.
