# Windows Cross-Platform Validation Gate

## TLDR

Make this repository’s required lint gate one dependency-free Node program on every OS while retaining the protected Bash wrapper.

## Scope

Exclusively owns `scripts/lint.sh`, new `scripts/lint.mjs`, `package.json`, new `.gitattributes`, `.github/workflows/lint.yml`, `scripts/test-classify-runs.mjs`, and `scripts/test-close-keywords.mjs`. It validates, but does not edit, execution-foundation config/process files.

## Non-goals

Installer, security audit, provider E2E, runtime skill recipes, and support claims are separate specs.

## Proposed solution

- Move authoritative lint behavior to dependency-free Node; keep `bash scripts/lint.sh` as a thin compatibility wrapper with equivalent output/exit status.
- Point package lint and required Ubuntu/Windows CI jobs directly to Node.
- Add a portability inventory that rejects new shell-language orchestration and opaque command strings while allowing direct executable/argument examples and declared legacy wrappers.
- Add `.gitattributes` with LF for shell files and text handling for PowerShell files.

## Compatibility and failures

Existing callers of `bash scripts/lint.sh` continue to work. Golden fixtures prevent diagnostic or coverage loss. Windows CI directly invokes `node scripts/lint.mjs`; workflow YAML shell plumbing is not part of skill orchestration evidence.

## Validation

Run positive/negative golden fixtures through old baseline and new Node logic, test line endings, run `node scripts/lint.mjs` on Ubuntu and Windows, and retain an Ubuntu wrapper job. Exercise both existing `.mjs` test tools on both OSes.

## Implementation Plan

1.1 Capture current lint fixture behavior and exit codes.

1.2 Implement the Node gate and compatibility wrapper; migrate package invocation.

2.1 Add portability classification and line-ending checks.

2.2 Add required Ubuntu/Windows workflow lanes and prove the gate itself launches no shell process.

## Completion Criteria

- Node and wrapper gates have equivalent coverage and status.
- Required Windows and Ubuntu jobs pass from clean checkouts.
- New shell-language orchestration is rejected without creating any platform-specific duplicate.
