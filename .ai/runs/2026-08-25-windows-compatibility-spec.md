# Execution plan: specify native Windows compatibility for the skills collection

Date: 2026-08-25
Slug: windows-compatibility-spec
Branch: feat/windows-compatibility-spec

## Goal

Determine whether the collection needs changes to run from native Windows shells, then publish an implementation-ready specification for closing the verified gaps without changing the skills in this PR.

## Scope

- Audit the current skill instructions, duplicated standard references, tracker and browser descriptors, repository tooling, and validation configuration for native Windows/PowerShell assumptions.
- Distinguish existing Windows support from remaining blockers so the proposal does not repeat the cross-platform test-environment work already merged in PR #18.
- Define a backward-compatible platform execution contract, affected-file matrix, validation strategy, rollout phases, and testable implementation steps.
- Produce a spec-only design PR under `.ai/specs/`; no runtime skill or tooling behavior changes in this run.

## Resolved assumptions (autonomous defaults)

- **Windows target:** native Windows agents using PowerShell plus Git for Windows. This is the smallest useful target that removes the current Bash dependency. Git Bash remains a supported POSIX route; WSL remains covered by the Linux/POSIX route.
- **PowerShell baseline:** prefer PowerShell 7 (`pwsh`) for maintained cross-platform recipes, while documenting a narrow Windows PowerShell 5.1 fallback only where the repository already promises it. Avoid designing every operation around 5.1 limitations.
- **Compatibility:** preserve existing config keys, tracker/browser operation names, execution-plan formats, and POSIX recipes. New platform metadata or command variants must be additive with fallbacks for older committed consumer configuration.
- **Deliverable:** analysis and specification only. Implementation, broad standard-file synchronization, and Windows CI changes are deferred to the follow-up implementation PR.

## Non-goals

- Implementing PowerShell variants or changing any `skills/**` instructions in this PR.
- Requiring WSL or Git Bash as the native-Windows solution.
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
- **False portability from agent translation:** prose that merely tells an agent to “translate Bash” can still fail on quoting, paths, JSON, background processes, and cleanup. The spec must identify where semantic recipes or executable tests are required.
- **PowerShell version split:** Windows PowerShell 5.1 and PowerShell 7 differ in encoding and native argument behavior. The proposal must state the baseline and keep any fallback explicit.
- **Scope inflation:** native Windows support spans authoring instructions and this repository's developer tooling. The spec must phase the work and separate pipeline-runtime blockers from lower-priority contributor conveniences.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Compatibility audit

- [x] 1.1 Inventory current support and native-Windows blockers — 0b13530
- [x] 1.2 Classify required changes against contracts and authoritative guidance — 0b13530

### Phase 2: Specification and verification

- [x] 2.1 Author the implementation-ready Windows compatibility specification — 0b13530
- [ ] 2.2 Complete fresh-context scope-cohesion review and incorporate findings
- [ ] 2.3 Pass validation and finalize the spec-only PR
