# Ship a stand-alone Forgejo tracker provider, shaped like the GitLab provider (#122)

- Date: 2026-10-08
- Category: feature
- Priority signal: medium — a team on self-hosted Forgejo cannot run the pipeline at all today; nothing else is blocked on it
- Risk signal: medium — one new descriptor plus setup integration, but 42 operations, CI ops verifiable only on stubs, and two small edits in other skills
- Routing: Next: om-prepare-issue "Ship a stand-alone Forgejo tracker provider shaped like the GitLab provider (#122) — brief: .ai/specs/briefs/2026-10-08-forgejo-tracker-provider.md"

## Problem

Teams whose code, issues, and reviews live on Forgejo (self-hosted, and Codeberg as a consequence) cannot use this pipeline: the only stand-alone providers are GitHub and GitLab, and the Linear/Jira split providers delegate code-host operations to `github.md`. Mirroring a Forgejo repository to GitHub would split issues and reviews across two hosts. The requester's own team runs a self-hosted Forgejo and is waiting on this provider; the requester uses it locally (symlinked skills) until it merges.

## Agreed direction

- A stand-alone `forgejo` descriptor in `om-setup-agent-pipeline/references/trackers/`, implementing every `####` operation of `github.md` (42 today; the parity test requires all of them, so it cannot ship as a thin slice).
- **Mirror `gitlab.md` by default in every design decision; deviate only with a documented reason.** Same PR shape as #122: descriptor, stubbed-CLI contract tests in `scripts/test-tracker-providers.mjs`, lint rule, setup body + interview option, `DECISIONS.md`, `UPGRADE_NOTES.md`, README, skill docs page, run record.
- Multi-instance like GitLab: host and repo come from the checkout's `origin`; an env override addresses another repo or instance; **auth-check** verifies access before a batch run. The Forgejo API always requires a token.
- CI, split by source:
  - PR checks and required checks from **commit statuses** — works with any CI that reports statuses (Forgejo Actions, Woodpecker, others).
  - Run operations (**list-runs**, **get-run**, **get-run-failed-logs**, **watch-run**) through the Forgejo Actions API. With an external CI they report "unavailable" plus the CI link — never an empty or green result.
  - **rerun-failed**: Forgejo has no rerun endpoint (only cancel and workflow dispatch); the spec picks a documented fallback.
- Setup: `forgejo` becomes a plain interview option; no network probe of the origin host, default suggestion unchanged.
- Workflow directory: setup and `om-prepare-test-env` read `.github/workflows/*` to detect validation commands. These are the only two skill edits allowed, analogous to #122's single edit in `om-followup-issue-from-pr`.
- Rejected:
  - one provider for the Gitea-compatible API (Forgejo + Gitea) — Gitea is out of scope; the APIs diverge since the 2024 hard fork and there is no Gitea instance to verify on;
  - build nothing / mirror to GitHub — splits issues and reviews across two hosts;
  - full Woodpecker support — a second API, host, and token with no config slot for them; a separate change.

## Resolved unknowns

| Question                                 | Answer (from the conversation)                                                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Which forges are in scope?               | Forgejo only. Codeberg is expected to work (it runs Forgejo 16 on the same API line, checked via `/api/v1/version`) but is **not verified**; say so in the docs and `DECISIONS.md`. Gitea is out.                                                       |
| Operation count                          | 42 `####` headings in `github.md` (not ~45).                                                                                                                                                                                                            |
| How to resolve ambiguous design choices? | Do what `gitlab.md` does unless the Forgejo API forbids it; record each deviation.                                                                                                                                                                      |
| Draft representation                     | Title prefix, as GitLab does. Forgejo recognizes the instance's configured work-in-progress prefixes (`WIP:` is only the default), so **mark-pr-ready** strips any recognized prefix and confirms `draft == false` on read-back. Verify on the sandbox. |
| CI source for checks                     | Commit statuses.                                                                                                                                                                                                                                        |
| CI runs with external CI                 | Report unavailable with the CI link.                                                                                                                                                                                                                    |
| get-required-checks failure modes        | 401/403 (branch-protection reads may need repo admin) must report "unreadable", never "no protection" — do not repeat #128. Check the token's access on the sandbox.                                                                                    |
| Setup detection                          | No probe; interview option only.                                                                                                                                                                                                                        |
| How is it verified?                      | Issue, PR, review, and label operations live against a throwaway sandbox repository on a self-hosted Forgejo 16.0.3 instance. CI operations on stubs only (no runner available), as GitLab's CI gate does; the run record states this.                  |
| Where does the work happen?              | A clone of `open-mercato/skills`; full SDLC on the upstream repo: issue → spec → PR → review → upstream CI → merge. The PR branch is pushed through a GitHub fork only because the author has no write access.                                          |

## Non-goals

- Gitea support; Woodpecker (or any external CI) run operations beyond the "unavailable + link" degrade.
- Per-agent identities, role→operation tables, MCP.
- Split providers (Linear/Jira/OpenProject) with a Forgejo code host.
- Changing the tracker operation contract, operation names, config schema, or chaining-line shapes.
- Changing skill behavior beyond the two workflow-directory edits named above.
- Installing a Forgejo CLI or runner, or storing tokens.

## Affected areas (if known)

- `skills/om-setup-agent-pipeline/references/trackers/forgejo.md` (new), `TEMPLATE.md`, `SKILL.md`, `references/interview-questions.md`
- `skills/om-prepare-test-env/references/phase-2-generate.md` (workflow directory)
- `scripts/test-tracker-providers.mjs` — parity check plus the hard-coded provider-list assertions; `scripts/lint.sh`
- `DECISIONS.md`, `UPGRADE_NOTES.md`, `README.md`, `docs/skills/om-setup-agent-pipeline.md`, a run record under `.ai/runs/`
- Related open issues: #127 (claim race), #128 (required-checks auth failures), #129 (portable label split in setup)
- Open for the spec: client (`curl` + `jq` vs a Forgejo CLI with a raw-API mode like `glab api` — decides who resolves host and token), **rerun-failed** fallback and **watch-run**, close-link extraction without `closingIssuesReferences` (config `closeKeywords`), translation of GitHub search syntax (`merged:>=…`, `is:unmerged`), CI workflow directory (`.forgejo/workflows/` — verify).
- Validation gate: the five commands in `.ai/agentic.config.json` → `validation.commands`.
