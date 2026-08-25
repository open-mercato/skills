# Cross-Platform Native E2E Harness

## TLDR

Replace the shell harness with one Node provider smoke harness and exercise structured launch on Ubuntu and Windows.

## Scope

Depends on the validation-gate and QA-bootstrap specs. Exclusively owns `scripts/test-agent-browser-codex.sh`, a new authoritative Node counterpart, `scripts/fixtures/agent-browser-codex/`, `scripts/test-browser-providers.mjs`, `scripts/bump-agent-browser.mjs`, `.github/workflows/agent-browser-pin.yml`, and new `.github/workflows/windows-e2e.yml`.

## Non-goals

Do not redesign provider descriptors, prepare-test-env contracts, QA bootstrap, or pinning policy. Those are dependencies/baselines.

## Proposed solution

Move authoritative harness behavior to dependency-free Node and keep the shell file only as a compatibility wrapper if its public entrypoint is protected. Exercise pinned asset mapping, structured launch, legacy entrypoint compatibility, readiness/cleanup, update checks, and fixture output. Assert the structured route starts no shell, WSL, `jq`, or Python process.

## Failure scenarios

Missing asset, checksum/version mismatch, malformed descriptor, early process exit, timeout, and cleanup failure each produce an explicit failed scenario with retained diagnostics and no orphan process.

## Validation and plan

1.1 Define normalized fixture outputs and process-observation assertions.

1.2 Add the Node harness and run every success/failure route on Ubuntu and `windows-latest`.

1.3 Run provider matrix and pin/update fixtures on Ubuntu and Windows; compare semantic outputs.

## Completion Criteria

- Every promised provider/test-environment route is exercised through one harness, including all listed failures.
- Structured launch evidence contains no shell dependency and leaves no process/artifact behind.
- Existing shell entrypoint remains behavior-compatible as a wrapper; provider contracts remain compatible.
