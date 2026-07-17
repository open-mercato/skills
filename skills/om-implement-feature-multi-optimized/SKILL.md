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
- When `agentHarness` or the requested profile is missing or fails its probe, stop, tell the user this variant needs configured model bindings, and run `om-setup-agent-harness` interactively — any OpenAI-compatible endpoint or local CLI can be bound as a reviewer, not just the bundled jury — then re-run with the originally requested profile. Continue under another profile only on the user's explicit, informed request; never substitute one silently.
- Never commit, push, or publish.
