# Forgejo tracker provider

Source doc: .ai/specs/2026-10-08-forgejo-tracker-provider.md (spec PR #133; issue #132)

## Overview

Add a shipped, stand-alone `forgejo` tracker descriptor. A repository hosted on Forgejo, self-hosted or Codeberg, can then run the whole pipeline (issues, pull requests, reviews, CI, and labels) through the Forgejo REST API with `curl` + `jq`, without a GitHub companion.

## Goal

`om-setup-agent-pipeline` installs a ready-to-use `.ai/trackers/forgejo.md` that implements every tracker operation `github.md` implements, with the same guard, claim, and serialization semantics. No skill learns Forgejo, apart from the four additive edits in spec D12.

## Scope

- New `skills/om-setup-agent-pipeline/references/trackers/forgejo.md`, following spec D1–D11, the Shared helpers, the Conventions, and the Operation map.
- Contract tests in `scripts/test-tracker-providers.mjs`. A stubbed `fj_http` with recorded fixtures checks parity, the helpers, the guards, serialization, search translation, and the rerun modes.
- Setup integration (body, interview questions, `TEMPLATE.md`), plus the D12 edits:
  - workflow detection for the `forgejo` tracker in setup and in `om-prepare-test-env`;
  - Forgejo links in `om-followup-issue-from-pr`;
  - the `RERUN_UNAVAILABLE` branch in `om-auto-fix-pr` CI stabilization.
- A lint rule that rejects Forgejo helper names and the token variable outside `references/trackers/`.
- Docs: README, `docs/skills/om-setup-agent-pipeline.md`, `DECISIONS.md`, `UPGRADE_NOTES.md`.

## Non-goals

- Gitea, and Woodpecker run operations.
- Split providers with a Forgejo code host, per-agent identities, MCP.
- Changing the tracker operation contract, operation names, config schema, or chaining-line shapes.
- Installing a Forgejo CLI or runner, or storing tokens.

## Implementation Plan

Follows the spec's Implementation Plan, steps 1–18, phase for phase. Phases 1–6 landed as one descriptor commit plus one test commit: the operations share helpers that only make sense together, and the stub tests cover every phase.

## Risks

- Several server behaviors are inferred, not read from source:
  - the status context of a dispatched run;
  - the review `event` values;
  - the `refs/pull/N/head` ref of pull-request runs;
  - reading `GET /branches/{base}` without admin.

  They are verified live in Phase 7 (Codeberg, then self-hosted 16.0.3) and recorded below.
- Codeberg runs a 16.0.0 dev build. Version-sensitive results are repeated on 16.0.3 per spec D11.
- Hosted Codeberg runners have quotas. CI checks use tiny workflows.

## Live verification

**Codeberg** (Forgejo 16.0.0-dev): public sandbox `kzmijak/forgejo-provider-sandbox`, Actions on hosted `codeberg-tiny` runners, 2026-10-09. Every result below came from the descriptor's own helpers, extracted verbatim.

| Area | Result |
|---|---|
| auth-check, current-user, repo-info, default-branch | pass |
| ensure-label-taxonomy / list-labels | 27 labels created; a re-run creates none |
| Issues: create, assign, label (guarded skip of an unknown label), get, search, comment, get/list/update comment, update, unlabel (absent → no-op), unassign, close | pass ([#1](https://codeberg.org/kzmijak/forgejo-provider-sandbox/issues/1)) |
| create-pr draft → `isDraft: true`, `DRAFT`; update-pr keeps `WIP:`; mark-pr-ready reads back `draft: false` | pass ([#3](https://codeberg.org/kzmijak/forgejo-provider-sandbox/pulls/3)) |
| closingIssuesReferences | parsed `[2]`, ignored the code-span `fixes #99` / fenced `resolves #98`; Forgejo closed #2 on merge |
| review-pr on own PR | refused with 422 for approve **and** request-changes; error message updated |
| assign-pr, set_pipeline_label | pass |
| attach-image-evidence | comment asset uploaded and rendered inline; the URL serves `image/png` without auth |
| get-pr-diff, get-pr-files, checkout-pr (`refs/pull/N/head`) | pass |
| search-prs `#N` (timeline) and free text; list-prs open/merged with date bound | pass |
| merge-pr with a stale `head_commit_id` | 409, surfaced; with the verified SHA, merged and read back `merged: true` |
| Inline review comments | `#issuecomment-<id>` links shared with conversation comments; the issue-comment endpoint answers 204. **Fixed:** get-issue-comment names get-review-comment, and the follow-up link shape is corrected (e5e9846). list-review-comments and get-review-comment pass ([#4](https://codeberg.org/kzmijak/forgejo-provider-sandbox/pulls/4)) |
| Commit statuses from an external CI (posted via API) | get-pr-checks buckets `success`/`warning` correctly; list-runs → `RUNS_UNAVAILABLE <link>` exit 4 while Actions was disabled |
| Forgejo Actions ([#5](https://codeberg.org/kzmijak/forgejo-provider-sandbox/pulls/5)) | list-runs by head SHA, get-run, get-run-failed-logs (job log tail), get-pr-checks `ci / test (pull_request)` FAILURE |
| get-required-checks | branch protection via API → prints `ci / test (pull_request)`; get-pr shows `BLOCKED` |
| rerun-failed `report` | `RERUN_UNAVAILABLE <run link>`, exit 3 |
| rerun-failed `dispatch` | new run 7585617 dispatched on `probe3` and watched to `success` (watch-run exit 0); **the PR check `ci / test (pull_request)` stayed FAILURE and the PR `BLOCKED`**, which confirms the D5 default |

Token-scope findings:
- `write:repository` + `write:issue` + `read:user` cover every operation above.
- Creating a repository needs `write:user`.
- `PATCH /repos/{o}/{r}` (repository settings, e.g. enabling Actions) answered 403 even with `write:repository` on Codeberg, so Actions is enabled in the UI. No operation needs it.

**Self-hosted Forgejo 16.0.3** (spec D11), 2026-10-09: a public throwaway repository on the requester's instance. The checks ran as a **non-admin service account** that is a write collaborator on that repository only, with a token of exactly `write:repository`, `write:issue`, `read:user`.

| Area | Result |
|---|---|
| D4 token scopes | Every non-CI operation passed: auth-check (the instance requires sign-in even for `/version`, and the token is sent), labels (27, idempotent), the full issue set, the PR set, attach-image-evidence, search, list-prs, review comments, checkout-pr, and merge. A personal token with read-only scopes failed writes with 403 `write:issue` / `write:repository`. |
| D7 draft read-back | `WIP:` → `isDraft: true` / `DRAFT`; mark-pr-ready reads back `draft: false` |
| Close links | parsed `[3]`; Forgejo closed #3 on merge |
| merge-pr | the first attempt after the stale-SHA refusal answered **405** and the immediate retry merged, so Forgejo was still recomputing mergeability. The merge-pr docs now say to re-read and retry once |
| **Fixed live:** empty lists | an issue with no cross-references answers its timeline with a 200 `null`; `fj_list` rejected it, so search-prs `#N` failed. Now read as `[]` (c7cb3e1, with a test) |
| D5 dispatch status context | **not runnable**: the instance has no Actions runner. Verified on Codeberg instead (above) |

## Progress

PR: #134

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Skeleton, helpers, harness

- [x] 1.1 Create forgejo.md with prerequisites, conventions, shared helpers and all operation headings — 0c1d32c (tests ac49dc6)
- [x] 1.2 Add the Forgejo stub harness and helper tests to the tracker-provider tests — ac49dc6
- [x] 1.3 Implement identity and repository operations with tests — 0c1d32c (tests ac49dc6)

### Phase 2: Issues

- [x] 2.1 Implement issue operations with tests — 0c1d32c (tests ac49dc6)

### Phase 3: Pull requests, read side

- [x] 3.1 Implement get-pr with merge state, review decision and close-link parsing — 0c1d32c (tests ac49dc6)
- [x] 3.2 Implement PR list, search, diff, files, checkout and comment reads — 0c1d32c (tests ac49dc6)

### Phase 4: Pull requests, write side

- [x] 4.1 Implement PR create, update, ready, comment, assign, label, review and merge — 0c1d32c (tests ac49dc6)
- [x] 4.2 Implement attach-image-evidence through comment assets — 0c1d32c (tests ac49dc6)

### Phase 5: Labels

- [x] 5.1 Implement label guards and label operations with tests — 0c1d32c (tests ac49dc6)

### Phase 6: CI

- [x] 6.1 Implement get-pr-checks and get-required-checks — 0c1d32c (tests ac49dc6)
- [x] 6.2 Implement run operations, watch-run and rerun-failed modes — 0c1d32c (tests ac49dc6)

### Phase 7: Live verification record

- [x] 7.1 Exercise every operation against the Codeberg sandbox — e5e9846 (fix found live), results above
- [x] 7.2 Run the version-sensitive checks on self-hosted Forgejo 16.0.3 — c7cb3e1 (fix found live); D5 verified on Codeberg, no runner on 16.0.3

### Phase 8: Setup and skill edits

- [x] 8.1 Add forgejo to setup and apply the four D12 skill edits — 9d7a96a

### Phase 9: Parity and lint

- [x] 9.1 Add forgejo to the parity set and assert no TODO remains — ac49dc6
- [x] 9.2 Extend the lint gate to Forgejo helpers and token variables — db01f22

### Phase 10: Docs and gate

- [x] 10.1 Update DECISIONS, UPGRADE_NOTES, README and skill docs — 38fdd7f
- [x] 10.2 Run the full validation gate — 3c280ac (5/5 green)
- [x] Review autofix (PR #134): BLOCKED on unmet required approvals, Actions-runs read errors no longer reported as external CI, credentials stripped from https remotes — 5821877
