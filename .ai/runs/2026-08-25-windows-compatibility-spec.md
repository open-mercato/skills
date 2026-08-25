# Execution plan: specify native Windows compatibility for the skills collection

Date: 2026-08-25
Slug: windows-compatibility-spec
Branch: feat/windows-compatibility-spec

## Goal

Determine whether the collection needs changes to run on Windows, then publish an implementation-ready shell-neutral specification that avoids maintaining separate operating-system branches.

## Scope

- Audit the current skill instructions, duplicated standard references, tracker and browser descriptors, repository tooling, and validation configuration for native Windows/PowerShell assumptions.
- Distinguish existing Windows support from remaining blockers so the proposal does not repeat the cross-platform test-environment work already merged in PR #18.
- Define one backward-compatible structured-operation contract, affected-file matrix, validation strategy, rollout phases, and testable implementation steps.
- Produce a spec-only design PR under `.ai/specs/`; no runtime skill or tooling behavior changes in this run.

## Resolved assumptions (autonomous defaults)

- **Execution model:** use agent structured file capabilities and direct program/argument invocation. Do not maintain Bash and PowerShell control-flow variants or introduce a shell selector.
- **Prerequisites:** Git is required for Git workflows and each tracker descriptor declares its client (`gh` for GitHub). Node is allowed for this source repository's existing tooling but is not required by installed skills; Python is not added.
- **Compatibility:** preserve existing config keys, tracker/browser operation names, execution-plan formats, and legacy command/entrypoint fields. New structured process forms are additive and old forms fail cleanly when no compatible runner exists.
- **Deliverable:** analysis and specification only. Implementation, broad standard-file synchronization, and Windows CI changes are deferred to the follow-up implementation PR.

## Non-goals

- Implementing PowerShell variants or changing any `skills/**` instructions in this PR.
- Requiring PowerShell, WSL, Git Bash, Node, or Python as an installed-skill orchestration runtime.
- Adding non-GitHub tracker providers or changing tracker semantics.
- Guaranteeing that arbitrary target repositories' own validation commands are portable; the pipeline will define how platform-specific commands are selected and reported.
- Replacing platform-native project tooling when a repository already supplies a working command for the current shell.

## Implementation Plan

### Phase 1: Compatibility audit

1. Inventory the current Windows-aware surfaces and the remaining native-Windows blockers across skills, standard references, descriptors, configuration, and repository tooling.
2. Check protected contracts and authoritative platform guidance, then classify required changes by severity, compatibility risk, and ownership.

### Phase 2: Specification and verification

1. Author the Windows compatibility specification with resolved assumptions, proposed platform contract, affected-file matrix, failure modes, rollout phases, and testable implementation steps.
2. Run the required fresh-context scope-cohesion review and incorporate actionable findings without expanding into implementation.
3. Run the full documentation validation gate, complete the self-review and automated PR review, and finalize the spec-only PR for human review.

## Risks

- **Broad duplicated surface:** the standard setup and worktree references are copied into multiple skills. A later implementation that updates only one copy will drift; the follow-up must enumerate and synchronize every affected copy under the repository's standard-file rule.
- **Protected consumer state:** tracker descriptors and `.ai/agentic.config.json` are committed in downstream repositories. The design must remain usable with older copies and cannot silently require regeneration.
- **Executor capability variance:** some agents expose only shell command strings rather than direct argv/process capabilities. The specification must make direct invocation a preflight capability and stop before mutation when unavailable.
- **Legacy repositories:** opaque validation strings and `.sh`/`.ps1` entrypoints remain in committed consumer state. The additive structured form must preserve readable legacy state without guessing or translating it.
- **Scope inflation:** native Windows support spans authoring instructions and this repository's developer tooling. The spec must phase the work and separate pipeline-runtime blockers from lower-priority contributor conveniences.

## Progress

PR: #87

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Compatibility audit

- [x] 1.1 Inventory current support and native-Windows blockers — 0b13530
- [x] 1.2 Classify required changes against contracts and authoritative guidance — 0b13530

### Phase 2: Specification and verification

- [x] 2.1 Author the implementation-ready Windows compatibility specification — 0b13530
- [x] 2.2 Complete fresh-context scope-cohesion review and incorporate findings — 8d2461b
- [x] 2.3 Pass validation and finalize the spec-only PR — 32f4711
