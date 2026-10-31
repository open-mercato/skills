# Setup interview questions

The questions step 3 of `om-setup-agent-pipeline` asks the user (skipped with `--defaults`, which writes the auto-detected config without confirmation):

1. Confirm or edit the detected validation commands.
2. Which tracker provider to install (default: `gitlab` when the `origin` remote points at a GitLab host — gitlab.com, or a self-managed host `glab` is authenticated against — otherwise `github`):
   - `github` — issues, PRs, reviews, CI, and labels through the `gh` CLI.
   - `gitlab` — issues, merge requests, reviews, CI pipelines, and labels through the `glab` CLI (`glab api`), on gitlab.com or a self-managed instance. Stand-alone: no companion descriptor.
   - `forgejo` — issues, pull requests, reviews, CI (commit statuses and Forgejo Actions), and labels through the Forgejo REST API with `curl` + `jq`, on a self-hosted instance or Codeberg. Stand-alone: no companion descriptor. There is no host detection; pick it explicitly for a Forgejo-hosted `origin`. Its CI workflows live in `.forgejo/workflows/`; read `.github/workflows/` only when that directory does not exist (Forgejo's own fallback rule).
   - `linear` — Linear issues through `schpet/linear-cli`, with GitHub as the required PR/review/CI companion. Setup installs both `linear.md` and `github.md`.
   - `jira` — Jira Cloud work items through Atlassian CLI (`acli`), with GitHub as the required PR/review/CI companion. Setup installs both `jira.md` and `github.md`.
   - a custom provider — scaffold from `TEMPLATE.md`; stop tracker-driven work until every required operation is filled in.

   This sets the config's `tracker` field to the selected primary descriptor. Before accepting `gitlab`, run its **auth-check** (`glab` and `jq` installed, `glab` authenticated for the remote's host). Before accepting `forgejo`, run its **auth-check** (`curl` 7.76+, `jq`, the remote's host reachable, and a token in `FORGEJO_TOKEN_<HOST>` or `FORGEJO_TOKEN` with the scopes its Prerequisites list). Before accepting a split provider, confirm its issue CLI and the companion `gh` CLI are installed/authenticated, and explain the provider-specific environment/config prerequisites from its descriptor.
3. Which browser provider to install (default: `agent-browser`; `playwright` is
   the compatibility choice). Explain that the selected descriptor owns
   autonomous CLI/browser provisioning and that repository-native E2E suites
   remain authoritative.
4. Labels: install the full taxonomy above (recommended), keep a subset, or disable labels entirely. When labels stay enabled, confirm the name of the human-applied automerge label (`automerge.label`, default `automerge`) that puts a PR in `om-auto-merge-buddy`'s unattended merge queue. Confirm `automerge.mode` (default guarded `prepare-and-merge`; `prepare-to-merge` for preparation only) and `automerge.requireIndependentReview` (boolean, default false; true requires separate native current-head human approval). Also confirm `automerge.defaultToHumanQa` (boolean, default false): automatically run QA/sign-off for missing mandatory approval, or true to prefer human QA. `--human-qa`/`--auto-qa` override it; eligibility/actual coverage still apply. Automatic code review/autofix remains required; explicit CLI policy overrides settings per invocation.
5. Issue autofix eligibility (when labels stay enabled): confirm `autofix.label` (default `cez-autofix`) and `autofix.eligibility` (`lookbackDays: 30`, `analyzeLimit: 100`, `limit: 20`, `excludeLabels: ["blocked", "do-not-fix"]`). `om-auto-issue-triage` proposes only useful, still-relevant issues with decided acceptance criteria and bounded implementation; it skips current/uncertain claims and labels only human-confirmed issues. Preserve explicit existing values. Explain that labeling can trigger the repository's existing worker, while this skill never installs or starts one. Under `--defaults`, write the documented defaults without guessing worker integrations.
6. QA gate on or off. Recommend on when the repo ships user-facing changes.
7. Where specs live (`paths.specs`, default `.ai/specs`) — confirm or point at an existing design-doc directory.
8. Optional repo-local review checklist path.
9. Project docs to generate (each only when missing): `SDLC.md` (recommended), `AGENTS.md` with the task-routing table (when no agent instruction file exists), `CODE_REVIEW.md`, and `BACKWARD_COMPATIBILITY.md`.

Then consult `references/config-capabilities.md`. Ask only for optional
capabilities the repository already evidences or the user explicitly enables;
show the detected file/value and keep the safe default otherwise. Under
`--defaults`, never guess harness commands, platform repositories, publication
destinations, design providers, or knowledge sources.
