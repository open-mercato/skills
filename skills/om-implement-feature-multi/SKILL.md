---
name: om-implement-feature-multi
description: Thin cross-model alias for om-implement-feature that reviews the spec and final diff with configured independent advisors, then leaves the verified feature staged and unpublished. Use when the user says "implement with multiple models", "cross-model staged feature", "multi review this feature", or "zaimplementuj z wieloma modelami".
---

# Implement Feature — Multi

Select the `multi` profile without duplicating the base workflow.

## Arguments

- `{brief}` (required) — pass through to `om-implement-feature`.
- `--slug` (optional) — pass through unchanged.

## Workflow

1. Read and execute `om-implement-feature` in full with `--profile multi`.
2. Preserve its spec council, final council, stage-only boundary, and handoff report.

## Rules

- Do not restate or replace any base workflow phase.
- Apply the configured review policy and preserve skipped and minority reviewer results.
- Never commit, push, or publish.
