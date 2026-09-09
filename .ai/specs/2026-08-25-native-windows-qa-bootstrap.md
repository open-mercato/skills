# Shell-Neutral QA Bootstrap

## TLDR

Launch test environments from one structured program/argument descriptor instead of choosing `.sh` or `.ps1` orchestration branches.

## Dependency and scope

Depends on config/setup. Owns the additive `test-env.json` `launch` contract and every direct consumer that must change with it: `om-auto-qa-pr/references/boot-env.md`; `om-prepare-test-env/SKILL.md` plus `references/entrypoint-contract.md`, `env-descriptor.md`, and `phase-2-generate.md`; `om-integration-tests/SKILL.md` plus `references/test-env-reuse.md`; and the `test-env.json` section of `BACKWARD_COMPATIBILITY.md`. Existing entrypoints remain compatibility inputs.

## Proposed solution

Read optional `launch.program`, `args`, `cwd`, and environment; validate and invoke directly. The generator chooses a repository-native cross-platform executable when available. If no structured launch exists, use a legacy entrypoint only with an available compatible runner; never translate it or silently select another OS environment.

## Failures

Malformed launch data, missing program, readiness timeout, early exit, and cleanup failure retain current QA classifications/evidence and actionable paths. Cleanup affects only the launched process and owned artifacts.

## Validation and plan

1.1 Specify additive schema/fallback rules and fixtures for structured plus legacy descriptors.

1.2 Update every named producer/consumer in the same PR, then test direct launch, readiness, evidence handoff, timeout, crash, and cleanup on Ubuntu/Windows.

1.3 Assert the structured route starts no shell and preserves all existing descriptor fields.

## Completion Criteria

- One structured launch route works identically on both OSes.
- Legacy descriptors remain readable and fail cleanly without their runner.
- Every producer/consumer and the protected-contract document changes together.
- No full-pipeline PowerShell or Bash prerequisite is introduced.
