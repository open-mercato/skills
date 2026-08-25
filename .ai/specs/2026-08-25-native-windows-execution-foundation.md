# Shell-Neutral Config and Setup Foundation

## TLDR

Define the shared operation/config contract and synchronize shell-neutral config loading across every setup copy.

## Dependency and scope

Depends on the cross-platform validation gate. Owns `.ai/agentic.config.json`, `AGENTS.md`, `DECISIONS.md`, `SDLC.md`, config sections of `BACKWARD_COMPATIBILITY.md`, the setup skill’s `SKILL.md`, `interview-questions.md`, `project-docs.md`, and `skill-coverage.md`, all 36 `agentic-setup.md` copies, and a config contract workflow.

## Proposed solution

Define `file`, direct `process`, `tracker`, and `decision` operations. Parse config directly as JSON. Add optional validated `validation.steps` and prefer it over legacy strings without translation or platform variants. Preflight required agent capabilities and configured executables before mutation.

## Compatibility and failures

Legacy commands remain usable with a compatible runner; otherwise stop with migration guidance. Invalid structured steps never fall back. Missing file/process/temp/status/cleanup capability fails preflight.

## Synchronization gate

Ask to synchronize the roadmap’s exact 36 setup owners before editing. Without authorization, stop. Update every shared copy in one PR, machine-check equality, and preserve specifics.

## Validation and plan

1.1 Record authorization and add capability/config fixtures for absent, structured, legacy, malformed, and missing-program states.

1.2 Update config/process/compatibility documents and setup-skill authoring instructions together.

1.3 Synchronize all 36 copies and add required Ubuntu/Windows config-contract CI.

## Completion Criteria

- One algorithm, no OS/shell selector, and no installed scripting-runtime requirement.
- Config behavior is deterministic/backward compatible on Ubuntu/Windows.
- All 36 copies are authorized, synchronized, and specifics-preserving.
