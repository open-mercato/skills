---
name: om-fix-issue-optimized
description: Thin worker-optimized alias for om-fix-issue that delegates bounded implementation packets to configured models, then leaves the verified fix staged and unpublished. Use when the user says "optimized issue fix", "use model workers", "cheap staged fix", or "napraw issue przez workerów".
---

# Fix Issue — Optimized

Select the `optimized` profile without duplicating the base workflow.

## Arguments

- `{issueId}` (required) — pass through to `om-fix-issue`.
- `{repo}` and `--force` (optional) — pass through unchanged.

## Workflow

1. Read and execute `om-fix-issue` in full with `--profile optimized`.
2. Preserve its packet boundaries, host integration, mandatory `om-fix` gate, stage-only boundary, claim handling, and report.

## Rules

- Do not restate or replace any base workflow phase.
- If no worker is ready, follow the profile's declared availability policy and report the degradation.
- Never commit, push, or publish.
