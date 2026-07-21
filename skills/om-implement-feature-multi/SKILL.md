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
- When `agentHarness` or the requested profile is missing or fails its probe, stop, tell the user this variant needs configured model bindings, and run `om-setup-agent-harness` interactively — any OpenAI-compatible endpoint or local CLI can be bound as a reviewer, not just the bundled jury — then re-run with the originally requested profile. Continue under another profile only on the user's explicit, informed request; never substitute one silently.
- Never commit, push, or publish.
