# Agent-browser verification report

Date: 2026-07-14

## Contract and platform matrix

Command: `node scripts/test-browser-providers.mjs`

Result: PASS — both shipped descriptors implement all eight browser operations.
The release-selector matrix covered:

- macOS: x64 and arm64
- Linux glibc: x64 and arm64
- Linux musl: x64 and arm64
- WSL2: x64 and arm64 through the Linux assets
- Native Windows: x64 and ARM64 through the supported x64 compatibility path

The contract test also confirms the agent-browser provider contains POSIX and
native PowerShell download paths, autonomous Chrome installation, Linux
non-interactive dependency escalation, a live `doctor --json` launch gate, and
no cloud-provider credential path.

This is deterministic selection/contract coverage. The current host is Linux
x64; native macOS, Windows, musl, ARM64, and WSL2 execution was not available in
this run and is not represented as observed execution.

## Codex CLI end-to-end exercise

Harness: `KEEP_CODEX_E2E_FIXTURE=1 bash scripts/test-agent-browser-codex.sh`

Codex CLI: 0.144.4, invoked with repo-scoped skills through `codex exec
--ephemeral --sandbox danger-full-access --ignore-user-config` in an isolated
fixture repository.

### `om-prepare-test-env`

Result: PASS after one self-repair cycle.

- Downloaded the official `agent-browser` 0.31.2 Linux x64 native release into
  the per-user cache; no project package or Node-based browser dependency was
  installed.
- Downloaded Chrome for Testing 150.0.7871.115 through `agent-browser install`.
- `agent-browser doctor --json`: success, 9 pass / 0 warn / 0 fail, including a
  real headless launch in 0.40s.
- Generated portable environment scripts and a provider-neutral
  `.ai/qa/test-env.json` reporting `browser.provider=agent-browser` and
  `browser.installed=true`.
- Cold app boot: 0.81s. Initial warm boot exposed a reuse bug in the generated
  fixture entrypoint; the skill repaired it and proved a 0.12s warm reuse with
  the same run id and PID.
- Source-fingerprint invalidation passed and a subsequent warm run reused the
  rebuilt environment.

### `om-auto-verify-pr-ui`

Result: PASS.

- Reused the prepared environment and opened the local fixture through the
  configured agent-browser binary.
- Observed accessibility refs for heading `Agent Browser Fixture Updated` and
  button `Continue`; asserted text and visibility through provider operations.
- Captured desktop (1280x577, 11,928 bytes) and mobile (390x844, 11,722 bytes)
  PNG evidence.
- Wrote PASS `report.json` and `report.md` with
  `environment.browserProvider=agent-browser`.
- The live run exposed ambiguous relative screenshot-path handling in the CLI;
  the shipped descriptor now resolves an absolute output path before capture.
- Verified the source HTML checksum was unchanged during the read-only QA run.

### `om-integration-tests`

Result: PASS on the POSIX launcher; native PowerShell execution unavailable.

- Explored the live page through agent-browser before authoring assertions.
- Generated paired `tests/browser/fixture-title.sh` and
  `tests/browser/fixture-title.ps1` launchers with equivalent semantic
  role/name assertions and isolated-session cleanup.
- POSIX launcher executed successfully: `PASS fixture title and button
  regression`.
- The first Codex pass generated a PowerShell launcher that called `sh`; the
  skill contract was tightened and the Codex phase rerun. The replacement `.ps1`
  contains no `sh`, WSL, Git Bash, Node, or POSIX utility calls and selects the
  native `.ai/scripts/test-env-up.ps1` entrypoint when available.
- `pwsh` was unavailable on this Linux host, so the PowerShell launcher was
  inspected and dependency-scanned but not natively executed.

## Verification boundary

Observed end-to-end execution proves the Linux x64 path and confirms Codex
actually followed all three skills. Cross-platform guarantees are supported by
the official agent-browser native release matrix, separate POSIX/PowerShell
descriptor operations, platform-native generated-test requirements, and the
deterministic matrix test. Native execution on every OS/CPU remains appropriate
follow-up CI coverage when runners for those targets are available.
