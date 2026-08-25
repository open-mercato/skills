# Setup interview questions

The questions step 3 of `om-setup-agent-pipeline` asks the user (skipped with `--defaults`, which writes the auto-detected config without confirmation):

1. Confirm or edit the detected validation commands.
2. Which tracker provider to install (default: `github`):
   - `github` — issues, PRs, reviews, CI, and labels through the `gh` CLI.
   - `linear` — Linear issues through `schpet/linear-cli`, with GitHub as the required PR/review/CI companion. Setup installs both `linear.md` and `github.md`.
   - `atlassian` — Jira Cloud work items through Atlassian CLI (`acli`), with GitHub as the required PR/review/CI companion. Setup installs both `atlassian.md` and `github.md`.
   - a custom provider — scaffold from `TEMPLATE.md`; stop tracker-driven work until every required operation is filled in.

   This sets the config's `tracker` field to the selected primary descriptor. Before accepting a split provider, confirm its issue CLI and the companion `gh` CLI are installed/authenticated, and explain the provider-specific environment/config prerequisites from its descriptor.
3. Which browser provider to install (default: `agent-browser`; `playwright` is
   the compatibility choice). Explain that the selected descriptor owns
   autonomous CLI/browser provisioning and that repository-native E2E suites
   remain authoritative.
4. Labels: install the full taxonomy above (recommended), keep a subset, or disable labels entirely.
5. QA gate on or off. Recommend on when the repo ships user-facing changes.
6. Where specs live (`paths.specs`, default `.ai/specs`) — confirm or point at an existing design-doc directory.
7. Optional repo-local review checklist path.
8. Project docs to generate (each only when missing): `SDLC.md` (recommended), `AGENTS.md` with the task-routing table (when no agent instruction file exists), `CODE_REVIEW.md`, and `BACKWARD_COMPATIBILITY.md`.
