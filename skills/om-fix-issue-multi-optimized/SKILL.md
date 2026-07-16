---
name: om-fix-issue-multi-optimized
description: Thin combined alias for om-fix-issue that uses configured implementation workers and independent review advisors, then leaves the verified fix staged and unpublished. Use when the user says "multi optimized issue fix", "workers plus model council", "cheap cross-model staged fix", or "napraw issue multi optimized".
---

# Fix Issue — Multi Optimized

Select the `multi-optimized` profile without duplicating the base workflow.

## Arguments

- `{issueId}` (required) — pass through to `om-fix-issue`.
- `{repo}` and `--force` (optional) — pass through unchanged.

## Workflow

1. Read and execute `om-fix-issue` in full with `--profile multi-optimized`.
2. Preserve its worker packets, diagnosis and final councils, same-family independence rule, stage-only boundary, claim handling, and report.

## Rules

- Do not restate or replace any base workflow phase.
- Treat review from the implementation worker's family as a self-check, not an independent vote.
- Never commit, push, or publish.
