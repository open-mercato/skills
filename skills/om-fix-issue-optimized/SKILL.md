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
- If no selected worker is ready, the runtime `probe` exits non-zero and the run is blocked: stop, report the failed probe, and never silently downgrade to host-only implementation.
- When `agentHarness` or the requested profile is missing or fails its probe, stop, tell the user this variant needs configured model bindings, and run `om-setup-agent-harness` interactively — any OpenAI-compatible endpoint or local CLI can be bound as a reviewer, not just the bundled jury — then re-run with the originally requested profile. Continue under another profile only on the user's explicit, informed request; never substitute one silently.
- Never commit, push, or publish.
