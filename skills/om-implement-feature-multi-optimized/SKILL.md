---
name: om-implement-feature-multi-optimized
description: Thin combined alias for om-implement-feature that uses configured implementation workers and independent review advisors, then leaves the verified feature staged and unpublished. Use when the user says "multi optimized feature", "workers plus model council", "cheap cross-model staged feature", or "zaimplementuj feature multi optimized".
---

# Implement Feature — Multi Optimized

Select the `multi-optimized` profile without duplicating the base workflow.

## Arguments

- `{brief}` (required) — pass through to `om-implement-feature`.
- `--slug` (optional) — pass through unchanged.

## Workflow

1. Read and execute `om-implement-feature` in full with `--profile multi-optimized`.
2. Preserve its worker packets, spec and final councils, same-family independence rule, stage-only boundary, and report.

## Rules

- Do not restate or replace any base workflow phase.
- Treat review from the implementation worker's family as a self-check, not an independent vote.
- Never commit, push, or publish.
