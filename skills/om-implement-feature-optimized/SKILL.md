---
name: om-implement-feature-optimized
description: Thin worker-optimized alias for om-implement-feature that delegates bounded implementation packets to configured models, then leaves the verified feature staged and unpublished. Use when the user says "optimized feature build", "use model workers", "cheap staged feature", or "zaimplementuj przez workerów".
---

# Implement Feature — Optimized

Select the `optimized` profile without duplicating the base workflow.

## Arguments

- `{brief}` (required) — pass through to `om-implement-feature`.
- `--slug` (optional) — pass through unchanged.

## Workflow

1. Read and execute `om-implement-feature` in full with `--profile optimized`.
2. Preserve its packet boundaries, host integration, validation, stage-only boundary, and handoff report.

## Rules

- Do not restate or replace any base workflow phase.
- If no worker is ready, follow the profile's availability policy and report the degradation.
- Never commit, push, or publish.
