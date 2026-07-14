# Agent-browser provider support

## Overview

### Goal

Add first-class, configurable agent-browser support to the agent pipeline so browser-capable skills can provision and use it without requiring the operator to preinstall runtimes, browser binaries, or OS packages.

### Scope

- Add a browser-provider selection and descriptor contract to `om-setup-agent-pipeline`, parallel to tracker providers.
- Ship agent-browser and Playwright provider descriptors with autonomous provisioning guidance for macOS, Linux, WSL2, Git Bash, and native Windows.
- Update the shared test-environment descriptor and every browser consumer to select the configured provider while remaining compatible with existing Playwright-only repositories.
- Extend `om-apply-upgrade-notes`, `UPGRADE_NOTES.md`, and collection documentation for installed-artifact upgrades.
- Add deterministic contract/platform tests and Codex CLI end-to-end exercises that invoke the affected skills against a local fixture.

### Non-goals

- Do not change tracker-provider semantics or label behavior.
- Do not add a runtime dependency to this markdown-first repository.
- Do not require cloud browser services, API keys, or remote third-party browser infrastructure.
- Do not claim native execution on platforms unavailable to the current CI host; validate those paths with deterministic platform-selection/bootstrap tests and document the boundary.

### External References

- `https://github.com/vercel-labs/agent-browser` — adopted the official native release matrix, local Chrome-for-Testing installation, `doctor`, snapshot/ref interaction model, and Linux `--with-deps` flow; rejected cloud providers because this feature must be self-contained.
- OpenAI Codex manual, non-interactive mode and skill discovery — adopted repo-scoped skills plus `codex exec --ephemeral` for isolated end-to-end exercises.

## Implementation Plan

### Phase 1: Provider contract and setup

1. Add the additive browser config, loading contract, provider template, and shipped agent-browser/Playwright descriptors.
2. Teach setup and upgrade flows to install or reconcile browser descriptors, and document the upgrade path.

### Phase 2: Browser consumers

1. Update test-environment provisioning and descriptor output to use the selected browser provider with legacy Playwright fallback.
2. Update UI verification and integration-test skills to execute provider operations and preserve existing repository-native runners.

### Phase 3: Verification harness

1. Add static and platform-matrix tests for provider completeness, fallback behavior, and autonomous installation commands.
2. Run Codex CLI skill exercises against a local fixture and record an evidence-backed cross-platform verification report.

## Risks

- agent-browser release assets currently cover macOS x64/arm64, Linux x64/arm64 (glibc and musl), and Windows x64; unsupported CPU/OS combinations must fail explicitly rather than silently selecting the wrong binary.
- Linux browser libraries can require privileged package installation. The agent must attempt the provider's self-install flow itself and report a concrete privilege blocker only after exhausting existing-browser and non-interactive elevation paths.
- Existing consumer repositories may have a Playwright-shaped version-1 `test-env.json`; readers must accept that shape while new writers add a provider-neutral field.
- Repository-native E2E suites remain authoritative. Selecting agent-browser changes agent-driven exploration and evidence capture, not a project's chosen committed test framework unless no suite exists.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Provider contract and setup

- [ ] 1.1 Add browser config, loading contract, template, and shipped descriptors
- [ ] 1.2 Update setup, upgrade flow, and upgrade documentation

### Phase 2: Browser consumers

- [ ] 2.1 Update environment provisioning and descriptor compatibility
- [ ] 2.2 Update UI verification and integration-test provider execution

### Phase 3: Verification harness

- [ ] 3.1 Add contract and cross-platform bootstrap tests
- [ ] 3.2 Run Codex CLI skill exercises and record evidence
