# Setup interview questions

The questions step 3 of `om-setup-agent-pipeline` asks the user (skipped with `--defaults`, which writes the auto-detected config without confirmation):

1. Confirm or edit the detected validation commands.
2. Which tracker provider to install (default: `gitlab` when the `origin` remote points at a GitLab host — gitlab.com, or a self-managed host `glab` is authenticated against — otherwise `github`):
   - `github` — issues, PRs, reviews, CI, and labels through the `gh` CLI.
   - `gitlab` — issues, merge requests, reviews, CI pipelines, and labels through the `glab` CLI (`glab api`), on gitlab.com or a self-managed instance. Stand-alone: no companion descriptor.
   - `linear` — Linear issues through `schpet/linear-cli`, with GitHub as the required PR/review/CI companion. Setup installs both `linear.md` and `github.md`.
   - `jira` — Jira Cloud work items through Atlassian CLI (`acli`), with GitHub as the required PR/review/CI companion. Setup installs both `jira.md` and `github.md`.
   - a custom provider — scaffold from `TEMPLATE.md`; stop tracker-driven work until every required operation is filled in.

   This sets the config's `tracker` field to the selected primary descriptor. Before accepting `gitlab`, run its **auth-check** (`glab` and `jq` installed, `glab` authenticated for the remote's host). Before accepting a split provider, confirm its issue CLI and the companion `gh` CLI are installed/authenticated, and explain the provider-specific environment/config prerequisites from its descriptor.
3. Which browser provider to install (default: `agent-browser`; `playwright` is
   the compatibility choice). Explain that the selected descriptor owns
   autonomous CLI/browser provisioning and that repository-native E2E suites
   remain authoritative.
4. Labels: install the full taxonomy above (recommended), keep a subset, or disable labels entirely.
5. QA gate on or off. Recommend on when the repo ships user-facing changes.
6. Where specs live (`paths.specs`, default `.ai/specs`) — confirm or point at an existing design-doc directory.
7. Optional repo-local review checklist path.
8. Project docs to generate (each only when missing): `SDLC.md` (recommended), `AGENTS.md` with the task-routing table (when no agent instruction file exists), `CODE_REVIEW.md`, and `BACKWARD_COMPATIBILITY.md`.

Then consult `references/config-capabilities.md`. Ask only for optional
capabilities the repository already evidences or the user explicitly enables;
show the detected file/value and keep the safe default otherwise. Under
`--defaults`, never guess harness commands, platform repositories, publication
destinations, design providers, or knowledge sources.
