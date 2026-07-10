# Execution plan: make om-prepare-test-env examples and paths cross-platform

Date: 2026-07-10
Slug: om-prepare-test-env-cross-platform
Branch: fix/om-prepare-test-env-cross-platform

## Overview

### Goal

Fix `skills/om-prepare-test-env/SKILL.md` so its examples, snippets, and artifact paths are correct on every platform the skill claims to support — macOS, Linux, WSL2, **and native Windows (PowerShell)** — so the scripts the skill generates actually run on the platform the user is on.

### Problem

The skill's prose promises four platforms, but its concrete machinery assumes POSIX `sh` everywhere:

- The entrypoint artifact is hard-coded to `test-env-up.sh`, executed with `sh` — dead on native Windows without Git Bash/WSL. The `.ps1` mirror is mentioned once in passing but absent from the artifacts table, Phase 1 execution snippet, descriptor schema, entrypoint contract, and the report one-liner.
- Platform detection uses `uname`, which does not exist in PowerShell; only Git Bash (MINGW/MSYS/CYGWIN) is detectable, and that misclassifies "user runs PowerShell natively".
- `free_port()` requires `python3`, frequently absent on Windows (and not guaranteed anywhere).
- No line-endings guidance: on Windows with `core.autocrlf=true`, a committed `.sh` script checks out with CRLF and breaks under WSL2/Git Bash (`\r: command not found`).
- No WSL2 notes (Docker Desktop WSL integration, `localhost` forwarding between WSL and Windows browsers).

### Scope

Docs-only: `skills/om-prepare-test-env/SKILL.md`. The generated-script *contract semantics* (lock, reuse, cache, descriptor) are unchanged — only their platform-portability story is fixed.

### Non-goals

- No changes to other skills (`om-auto-verify-pr-ui`, `om-integration-tests` consume only the descriptor, whose schema keeps the same keys).
- No new scripts or tooling in this repo.
- No change to the build-cache algorithm or the entrypoint contract steps.

### External References

None (no `--skill-url` passed).

## Implementation plan

### Phase 1: Platform-flavored entrypoint

Introduce "the entrypoint is generated in the flavor that runs natively on the generating platform": POSIX `sh` for macOS/Linux/WSL2/Git Bash, PowerShell for native Windows. Update Step 0 variables, the artifacts table, Phase 1 execution logic, the descriptor `startScript`/`stopScript` fields, and the report one-liner to use the resolved script path instead of a hard-coded `.sh`.

### Phase 2: Portable snippets and platform detection

Fix the platform-detection snippet to work when there is no `uname` (PowerShell path), distinguish `win32-posix` (Git Bash) from native PowerShell, keep WSL2 detection. Replace the `python3`-only `free_port()` with a portable cascade. Add line-endings rules (LF + `.gitattributes`) and WSL2/Docker Desktop notes. Extend the entrypoint contract and Rules with the PowerShell parity requirements.

### Risks

- The skill is long and internally cross-referenced; a partial rename (e.g. artifacts table updated but contract still says `.sh` only) would leave it inconsistent. Mitigation: grep the final document for every `test-env-up`/`test-env-down` occurrence and check each in context.
- Lint gate (`scripts/lint.sh`) greps `skills/**` for forbidden tokens; new text must not introduce any (hard-coded base branch, package-manager names, product references).

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Platform-flavored entrypoint

- [x] 1.1 Step 0: resolve entrypoint paths per platform; update artifacts table — de0a9b7
- [x] 1.2 Phase 1 execution snippet and prose: run the flavor that exists; descriptor + report reflect actual paths — de0a9b7

### Phase 2: Portable snippets and platform detection

- [ ] 2.1 Platform detection that also works in PowerShell; WSL2 and Git Bash guidance
- [ ] 2.2 Portable free_port cascade; line-endings (LF/.gitattributes) rules; entrypoint contract + Rules updated for .ps1 parity
