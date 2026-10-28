# GitLab tracker provider

## Overview

Add a shipped, stand-alone `gitlab` tracker descriptor so a repository hosted on GitLab (gitlab.com or self-managed) can run the whole pipeline — issues, merge requests, reviews, CI pipelines, and labels — through the `glab` CLI, without a GitHub companion.

## Goal

Let `om-setup-agent-pipeline` install a ready-to-use `.ai/trackers/gitlab.md` that implements every tracker operation `github.md` implements, with the same guard, claim, and serialization semantics, so no skill needs to change to run on GitLab.

## Scope

- New `skills/om-setup-agent-pipeline/references/trackers/gitlab.md`: every `####` operation heading `github.md` defines, implemented against the GitLab REST API v4 through `glab api` (narrowest mutation surface, per `TEMPLATE.md`), with merge requests mapped onto the "PR" operations and `get-pr` output serialized in the GitHub-shaped field set skills consume.
- Contract tests in `scripts/test-tracker-providers.mjs`: operation parity with `github.md`, plus executable checks of the descriptor's label guards and `get-pr` serialization against a stubbed `glab` and recorded GitLab API fixtures.
- Setup integration: `om-setup-agent-pipeline` body and interview questions list `gitlab` as a shipped, non-split provider.
- `om-followup-issue-from-pr` accepts GitLab merge-request links (`…/-/merge_requests/<n>#note_<id>`) alongside GitHub PR links.
- Lint gate: reject direct `glab` usage outside `references/trackers/`, mirroring the `gh` rule.
- Docs: README tracker section, `DECISIONS.md` entry, `UPGRADE_NOTES.md` entry, `docs/skills/om-setup-agent-pipeline.md`.

## Non-goals

- Linear/Jira split providers with a GitLab code-host companion (they keep requiring `github.md`; a follow-up can generalize the companion).
- Changing the tracker operation contract, operation names, config schema, or the `PR: #<n>` chaining line shape (GitLab MR iids are carried in it unchanged).
- GitLab Premium/Ultimate-only surfaces (multiple assignees, external status checks, merge trains) beyond documenting how they degrade.
- Installing `glab` or storing tokens.

## Implementation Plan

### Phase 1: GitLab descriptor

1. Add the GitLab tracker descriptor implementing every operation through `glab api`.
2. Add contract tests: operation parity, lint of the auth-check surface, and stubbed-`glab` execution of the label guards and `get-pr` serialization.

### Phase 2: Setup and skill integration

1. Teach `om-setup-agent-pipeline` (body + interview questions) that `gitlab` is a shipped stand-alone provider.
2. Let `om-followup-issue-from-pr` parse GitLab merge-request and note links.
3. Extend the lint tracker-abstraction gate to `glab`.

### Phase 3: Documentation

1. Update README, `docs/skills/om-setup-agent-pipeline.md`, `DECISIONS.md`, and `UPGRADE_NOTES.md`.

## Risks

- `glab` is not installed on the authoring machine, so live verification against a GitLab instance is not possible in this run; the descriptor relies on the stable REST v4 API through `glab api` (not version-sensitive convenience verbs), `auth-check` probes the required `glab api` flags, and the JSON mapping is tested against recorded API-shaped fixtures.
- GitLab has no first-class "request changes" review verdict on all tiers; the descriptor revokes any approval and posts the review body as a note, and the `changes-requested` pipeline label carries the state — documented in the descriptor.
- GitLab does not expose a "required checks" list; the descriptor treats every non-`allow_failure` job of the head pipeline as required (conservative: never lets a merge skill ignore a failing job).
- Issues and MRs are separate number spaces (`#12` vs `!12`); comment ids are therefore emitted as parent-qualified handles (`issues/<iid>/<noteId>`, `merge_requests/<iid>/<noteId>`).

## Progress

PR: #119

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: GitLab descriptor

- [x] 1.1 Add the GitLab tracker descriptor implementing every operation through glab api — eeb9e37
- [x] 1.2 Add GitLab descriptor contract tests with a stubbed glab — b8b7f7c
- [x] Post-review fix: fail on unreadable lists, trust verdict markers only from reviewers/approvers, honour CHANGES_REQUESTED verdicts, keep Free-tier assignee order, read fork pipelines from their project, pin the merge SHA — 6d65dd3
- [x] Review autofix (PR #119): route every GitLab read through gl_get so a failed request is never read as an empty answer — 4425ceb

### Phase 2: Setup and skill integration

- [x] 2.1 Teach setup and its interview guidance that gitlab is a shipped stand-alone provider — caea65a
- [x] 2.2 Let om-followup-issue-from-pr parse GitLab merge-request links — 3f40816
- [x] 2.3 Extend the lint tracker-abstraction gate to glab — e3e30cf

### Phase 3: Documentation

- [x] 3.1 Update README, skill docs, decision record, and upgrade notes — e931454
