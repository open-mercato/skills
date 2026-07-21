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
- When `agentHarness` or the requested profile is missing or fails its probe, stop, tell the user this variant needs configured model bindings, and run `om-setup-agent-harness` interactively — any OpenAI-compatible endpoint or local CLI can be bound as a reviewer, not just the bundled jury — then re-run with the originally requested profile. Continue under another profile only on the user's explicit, informed request; never substitute one silently.
- Never commit, push, or publish.
