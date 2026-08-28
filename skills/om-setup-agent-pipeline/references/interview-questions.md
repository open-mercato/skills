# Setup interview questions

The questions step 3 of `om-setup-agent-pipeline` asks the user (skipped with `--defaults`, which writes the auto-detected config without confirmation):

1. Confirm or edit the detected validation commands.
2. Which tracker provider to install (default: `github`). This sets the config's `tracker` field and which descriptor lands in `.ai/trackers/`.
3. Which browser provider to install (default: `agent-browser`; `playwright` is
   the compatibility choice). Explain that the selected descriptor owns
   autonomous CLI/browser provisioning and that repository-native E2E suites
   remain authoritative.
4. Labels: install the full taxonomy above (recommended), keep a subset, or disable labels entirely.
5. QA gate on or off. Recommend on when the repo ships user-facing changes.
6. Where specs live (`paths.specs`, default `.ai/specs`) — confirm or point at an existing design-doc directory.
7. Optional repo-local review checklist path.
8. Project docs to generate (each only when missing): `SDLC.md` (recommended), `AGENTS.md` with the task-routing table (when no agent instruction file exists), `CODE_REVIEW.md`, and `BACKWARD_COMPATIBILITY.md`.
9. Coverage-expansion (`sbst`), off by default. Ask only if the repo already has a coverage-expansion or mutation-testing tool installed (detected via a dependency/devDependency or lockfile entry — e.g. Stryker for JS/TS, Pynguin for Python, EvoSuite for Java, or an equivalent for the detected stack) or the user names one. If so, offer to record its run command as `sbst.command` and enable it; otherwise leave `sbst` unset. Never install or suggest installing a new tool — this only wires up one the repo has already chosen.
