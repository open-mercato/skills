# Forgejo tracker provider

Issue: #132 · Brief: `.ai/specs/briefs/2026-10-08-forgejo-tracker-provider.md`

## 📝 TLDR

Teams whose code, issues, and reviews live on Forgejo (self-hosted, and Codeberg) cannot run the pipeline today, because the only stand-alone providers are GitHub and GitLab.

**Proposed:** a stand-alone `forgejo.md` tracker descriptor.
- It implements all 42 operations of `github.md` against the Forgejo REST API (`/api/v1`) with `curl` + `jq`.
- It mirrors `gitlab.md` in every choice and records each deviation.
- Setup can install it, and no skill has to learn Forgejo.

## 📝 Problem Statement

The tracker contract is the pipeline's only coupling to a code host. Today a repository on Forgejo has no provider. Setup offers `github`, `gitlab`, `linear`, `jira`, or a custom provider written by hand from `TEMPLATE.md`, which means 42 operations with exact output shapes. A team on Forgejo either writes that itself or cannot use the pipeline. Mirroring to GitHub would split issues and reviews across two hosts. The requester's team runs a self-hosted Forgejo 16.0.3 and is waiting on this provider (#132).

## 📝 Proposed Solution

Ship a stand-alone provider in the same shape as #122:
- the descriptor;
- stubbed-client contract tests;
- a lint rule;
- setup integration;
- docs;
- a run record.

**The guiding rule is to do what `gitlab.md` does unless the Forgejo API forbids it.** Every deviation is listed under Architecture, so the reviewer reads one diff against a known shape.

### Resolved decisions

| Id | Decision | Why |
|---|---|---|
| D1 | **Client: `curl` + `jq`.** Shared helpers replace `glab api`. | No Forgejo CLI has a raw-API passthrough: `fj` and `tea` wrap entity commands only. Deviation 1. |
| D2 | **The token comes from a per-host env var**, `FORGEJO_TOKEN_<HOST>`, where the host is upper-cased and every non-alphanumeric character becomes `_` (`codeberg.org` → `FORGEJO_TOKEN_CODEBERG_ORG`). `FORGEJO_TOKEN` is the fallback. Users alias their own names in their shell profile (`export FORGEJO_TOKEN_CODEBERG_ORG="$MY_TOKEN"`). The descriptor never reads credential files of other tools. | This is the equivalent of glab's per-host login. One user may work against several instances. |
| D3 | **Host and repo come from `origin`**, in the `https://host[:port][/subpath]/o/r(.git)`, `git@host:o/r(.git)`, or `ssh://git@host[:port]/o/r(.git)` form. `FORGEJO_URL` overrides the API base (a subpath install included), and `REPO=owner/name` addresses another repo. The token is always chosen for the host that is actually contacted, after any override. A plain `http://` base is refused. | Mirrors glab: `REPO` / `GITLAB_HOST`. Choosing the token by the contacted host keeps one instance's token from going to another. |
| D4 | **Token scopes:** `write:repository`, `write:issue`, `read:user`. Repo role: write. The protection facts come from `GET /branches/{base}`, which is expected to be readable without admin (to verify). If it is unreadable, `get-required-checks` reports unreadable. The docs recommend a service account. | Reasons for a service account: claim signals rely on a distinct automation user, Forgejo refuses self-approval, and access is revoked per account. The scope-to-operation table is verified in Phase 7 (D11). |
| D5 | **`rerun-failed` has two modes, chosen by a one-line switch at the top of the operation in the repo's committed copy** (`FORGEJO_RERUN_MODE=report` by default). In `report` mode the operation prints `RERUN_UNAVAILABLE <run link>` on stdout and exits 3. In `dispatch` mode it re-dispatches the run's workflow file on its ref with `return_run_info` and returns the new run in the `get-run` shape. An empty-commit mode was considered and rejected: it moves the head past the SHA the merge gate verified, can dismiss approvals, and cannot work on fork PRs. | The API has no job rerun. A dispatched run most likely reports under a different status context, so the PR check stays red (to verify on 16.0.3). Only the web UI rerun turns the same check green, so `report` is the safe default. Unattended orchestrators such as a session runner with no web access commit `dispatch`, which only diagnoses. The committed copy is the collection's established override point (`DECISIONS.md`, *Tracker abstraction*). Deviation 2. |
| D6 | **CI checks come from commit statuses.** `list-runs`, `get-run`, `get-run-failed-logs`, and `watch-run` use the Actions API and query runs by `head_sha`, never by branch `ref`, because pull-request runs may be recorded under `refs/pull/N/head`. When Actions is disabled or the CI is external, the run operations exit non-zero with `RUNS_UNAVAILABLE` plus the status's `target_url`, never `[]`. An empty `workflow_runs` while statuses exist is reported as unavailable. An empty `workflow_runs` with no statuses is "not registered yet", which the caller's existing completeness rule treats as pending. | Commit statuses work with any CI. Woodpecker run support would need a second API, host, and token, and is out of scope. |
| D7 | **A draft is a title prefix.** `create-pr` prepends `WIP: `. `mark-pr-ready` strips any leading `WIP:` / `[WIP]` (case-insensitive) and verifies `draft == false` on read-back. If the flag stays true (custom instance prefixes), the operation fails and names the remaining title. | `CreatePullRequestOption` has no `draft` field, and `PullRequest.draft` is read-only, derived from the instance's work-in-progress prefixes. GitLab works the same way. |
| D8 | **`closingIssuesReferences` is parsed from the PR title and body** with Forgejo's own keywords (`close[sd]`, `fix(e[sd])?`, `resolve[sd]`, followed by `#N` or `owner/repo#N`). Same-repo references only. Code fences and inline code are skipped, as `om-close-fixed-issues` does. | Forgejo has no closes-issues API. These are the keywords Forgejo itself acts on at merge. The config's `closeKeywords` stay with `om-close-fixed-issues`, which already applies them on top of this field. |
| D9 | **Setup has no probe.** `forgejo` is a plain interview option, and the default suggestion is unchanged. | The setup runs once per repo; a probe would mean a network call to an unknown host. |
| D10 | **Workflow detection** in setup step 2 and in `om-prepare-test-env` reads `.forgejo/workflows/*` first, and `.github/workflows/*` only when the former directory is absent. This applies only when the tracker is `forgejo`. GitHub and GitLab repos keep today's behavior. | This matches Forgejo's own fallback rule. A GitHub repo mirrored to Forgejo with both directories must not lose `.github` detection. |
| D11 | **Verification in two places.** All live verification, CI included, runs on a public sandbox repo on Codeberg, using its hosted Forgejo Actions runners. Codeberg runs a 16.0.0 dev build, so the three version-sensitive checks are repeated on a self-hosted Forgejo 16.0.3: the token-scope matrix (D4), the status context of a dispatched run (D5), and draft read-back (D7). The run record names that instance only as "self-hosted Forgejo 16.0.3". | The Codeberg evidence is public. The 16.0.3 checks cover the version the requesting team runs. This supersedes the brief's "CI only on stubs" and "Codeberg not verified". |
| D12 | **Four edits to other skills**, all additive. Two are D10. The third adds the Forgejo link shapes `…/pulls/<n>`, `…/pulls/<n>#issuecomment-<id>`, and `…/issues/<n>` to `om-followup-issue-from-pr`, as #122 did for GitLab. The fourth adds a branch to `om-auto-fix-pr/references/stabilize-ci.md`: when **rerun-failed** prints `RERUN_UNAVAILABLE`, record the failure as an unconfirmed flake with the link, do not change code for it, and leave the check for a human rerun. | Without the third edit, Forgejo links are rejected. Without the fourth, a report-mode exit reads as "failed again", and the agent edits code for a flake. GitHub and GitLab never take the new branch, and their link shapes are unchanged. |

Rejected:
- a Gitea-compatible provider: Gitea is out of scope;
- mirroring to GitHub;
- full Woodpecker support;
- dispatch as the rerun default, because the PR check stays red;
- an empty-commit rerun mode;
- a session env var as the rerun switch: the committed copy is the override point;
- requiring a CLI.

## 📝 Architecture

One new file, `skills/om-setup-agent-pipeline/references/trackers/forgejo.md`, structured like `gitlab.md`: Prerequisites → Conventions → Shared helpers → Label guards → Operations.

**Shared helpers.** They replace what `glab api` did and are sourced once per operation:

| Helper | Job |
|---|---|
| `fj_base` | Resolves the API base and `owner/repo` from `FORGEJO_URL` / `REPO` / `origin` (D3), and validates both. |
| `fj_token` | Resolves the per-host token for the contacted host (D2, D3). It fails with the name of the variable it looked for, and never echoes the value. |
| `fj_http <METHOD> <path> [body-file]` | **The only function that calls `curl`, and the one the tests stub.** It sends the auth header through `curl -K -` on stdin, so the token never appears on argv, in `ps`, or in xtrace. It uses `--fail-with-body -sS` and returns the body plus the response headers. |
| `fj_get <path> [jq…]` | GET through `fj_http`. An HTTP error is an error. A `204` or an empty body where an object is expected is also an error, never an empty result (the GitLab rule). |
| `fj_list <path> [array-key]` | Follows `Link: rel="next"` (and `X-HasMore` where that is the signal) and concatenates the *arrays*. For object envelopes such as `{total_count, workflow_runs}`, it extracts the named key per page before concatenating. Endpoints with no paging parameters are fetched once. |
| `fj_write <METHOD> <path>` | Sends the JSON body from stdin (`jq --rawfile` for multi-line text, as GitLab does). |
| `fj_num`, `fj_sha` | Validate externally sourced values before interpolation. |

`curl` never runs with `-v`. **auth-check** probes `curl --fail-with-body` (curl ≥ 7.76), the way GitLab probes the `glab api` flags. Run status maps to the contract's `status` / `conclusion` pair: `waiting`/`blocked` → `queued`; `running` → `in_progress`; `success`/`failure`/`cancelled`/`skipped` → `completed` with the same conclusion. Commit-status state maps to check buckets: `success` → `pass`; `failure`/`error` → `fail`; `pending` → `pending`; `warning` → `pass` (Forgejo does not block on it); `skipped` → `skipping`.

**Conventions that differ from GitLab:**
- **Shared number space.** Issues and PRs share one number space, and comment ids are global (`/issues/comments/{id}`). The descriptor uses plain numeric comment ids, and GitLab's parent-qualified handles are not needed. A simplification. Because `/issues/{n}` also answers for PRs, **get-issue** exposes `isPullRequest` (from a non-null `pull_request`), so `om-close-fixed-issues` can drop PR numbers.
- **Comments.** PR conversation comments use the issue-comment endpoints. Labels and assignees on PRs also go through `/issues/{n}`.
- **Reviews are native.** `POST /pulls/{n}/reviews` takes an `event` (the exact values are verified against 16.0.3 in Phase 4), so GitLab's hidden-marker notes are not needed.
  - Review states are serialized to the contract names `APPROVED` / `CHANGES_REQUESTED` / `COMMENTED` / `DISMISSED`. Request-review and pending entries are dropped.
  - Only reviews that are `official && !stale && !dismissed` count toward a verdict, so a commenter cannot forge one (GitLab's rule).
  - `reviewDecision`:
    - `CHANGES_REQUESTED` if any counted reviewer's latest review requests changes, or the PR carries `changes-requested`;
    - `APPROVED` if counted approvals ≥ the required count, which is `required_approvals` from `GET /branches/{base}` with a floor of 1, including when no rule exists or the branch is unreadable;
    - `REVIEW_REQUIRED` otherwise.
- **Merge state.** `PullRequest.mergeable` is a bare boolean, so the contract fields are derived in this order:
  1. a draft → `mergeStateStatus=DRAFT`;
  2. `mergeable == false` on a non-draft → re-read once after a short wait. Still false → `CONFLICTING` / `DIRTY`; otherwise go on;
  3. `mergeable == true` and `user_can_merge == false` on `GET /branches/{base}`, or failing required statuses → `MERGEABLE` / `BLOCKED`;
  4. otherwise → `MERGEABLE` / `CLEAN`.

  An unreadable branch yields `UNKNOWN`. This feeds the strings `om-auto-review-pr`, `om-merge-buddy`, and `om-approve-merge-pr` compare.
- **Search.** GitHub search syntax is translated inside the operations. `merged:>=D` becomes `state=closed` plus a client-side filter `merged && merged_at >= D`. `closed:>=D is:unmerged` becomes `state=closed`, `merged == false`, `closed_at >= D`. Free text goes to `/repos/{o}/{r}/issues?type=pulls&q=`. An issue reference (`#N`) instead reads `GET /issues/{N}/timeline` and keeps the cross-referencing PRs, the counterpart of GitLab's `related_merge_requests`. The indexer behind `q` may not match `#N` in bodies, and duplicate-PR prevention depends on this lookup. The PR list endpoint has no date filter, so `list-prs` pages until the date bound is passed.

### Operation map

| Operation | Forgejo surface | Note |
|---|---|---|
| auth-check | `GET /version`, `GET /user` | Fails on a missing token or a non-200 response; warns when the version is below 16. |
| current-user | `GET /user` → `login` | |
| repo-info | `fj_base` | |
| default-branch | `GET /repos/{o}/{r}` → `default_branch` | |
| get-issue | `GET /issues/{n}` + `fj_list /issues/{n}/comments` | Serialized in GitHub shape. |
| search-issues | `GET /issues?type=issues&q=&state=` | |
| create-issue | `POST /issues` (title, body, `assignees`), then each label through the guard | The API takes label *ids*, so labels go through the guard after creation, as GitLab does. |
| close-issue | comment, then `PATCH /issues/{n}` `state=closed` | |
| comment-issue | `POST /issues/{n}/comments` | |
| update-issue | `PATCH /issues/{n}` (title/body only) | |
| assign / unassign-issue | `PATCH /issues/{n}` `assignees` (read, modify, write) | |
| label / unlabel-issue | guards → `POST /issues/{n}/labels` (by id) / `DELETE /issues/{n}/labels/{id}` | On removal, 404 means "not applied" (a no-op); 403 and 5xx are failures that block a pipeline-label transition (GitLab's test). |
| get-issue-comment | `GET /issues/comments/{id}` | |
| list-issue-comments | `fj_list /issues/{n}/comments` | |
| update-comment | `PATCH /issues/comments/{id}` | |
| get-pr | `GET /pulls/{n}` + reviews + commits + files + comments + `GET /branches/{base}` | Merge state and review decision per Conventions; `closingIssuesReferences` per D8. |
| list-prs | `fj_list /pulls?state=&sort=recentupdate` + filters | |
| search-prs | `#N` → `GET /issues/{N}/timeline` cross-references; other text → `GET /issues?type=pulls&q=`; both → `get-pr` light shape | |
| create-pr | `POST /pulls` (`head`, `base`, `title` with `WIP: ` for drafts) | |
| update-pr | `PATCH /pulls/{n}` | Keeps the draft prefix while the PR is a draft. |
| comment-pr | `POST /issues/{n}/comments` | |
| attach-image-evidence | create a comment, then `POST /issues/comments/{id}/assets` per image, then `PATCH` the body with the asset URLs | Never touches a branch. Private-repo note as in the contract. |
| assign / unassign-pr | as for issues | |
| label / unlabel-pr | guards, as for issues | |
| get-pr-diff | `GET /pulls/{n}.diff` | |
| get-pr-files | `fj_list /pulls/{n}/files` | |
| checkout-pr | `git fetch origin pull/{n}/head` | Forks included. |
| review-pr | `POST /pulls/{n}/reviews` | |
| merge-pr | `POST /pulls/{n}/merge` `Do=squash`, `head_commit_id`; `merge_when_checks_succeed` for merge-once-checks-pass | The response body is empty, so read back `merged == true`. A 405 (checks or approvals unmet, or squash disallowed) and a 409 (head moved) are surfaced, never retried differently. |
| mark-pr-ready | D7 | |
| get-pr-checks | `fj_list /commits/{head}/statuses`, latest per context, mapped to buckets (see Shared helpers) | A short list is not evidence of green: cross-check `list-runs` at the head SHA (the existing contract rule). |
| get-required-checks | `GET /branches/{base}` → `enable_status_check`, `status_check_contexts` | The server has already resolved the matching rule. Glob entries are expanded against the reported contexts; if one cannot be expanded, every reported check counts as required. 401/403/5xx mean unreadable, never "none" (#128). |
| get-pr-comment / get-review-comment | `GET /issues/comments/{id}`; a review comment is found by scanning `/pulls/{n}/reviews/{rid}/comments`, since there is no lookup by id alone | A `204` is an error, never an empty comment. |
| list-review-comments | `fj_list /pulls/{n}/reviews`, then `/reviews/{id}/comments` | |
| list-runs | `GET /actions/runs?head_sha=` (a branch resolves to its head SHA first) | External CI or Actions disabled: `RUNS_UNAVAILABLE` and a non-zero exit per D6, never `[]`. |
| get-run | `GET /actions/runs/{id}` + `/jobs` | |
| get-run-failed-logs | `/jobs` filtered to failures → `GET /actions/jobs/{id}/logs`, last 400 lines | |
| rerun-failed | D5 | |
| watch-run | poll `get-run` within `CI_MAX_WAIT_MINUTES` | As in GitLab. |
| list-labels | `fj_list /labels`, plus `/orgs/{owner}/labels` when the owner is an org | Org labels count, as GitLab's group labels do. |
| create-label | `POST /labels` | |
| ensure-label-taxonomy | as in `gitlab.md` | |

## 📝 Edge Cases & Failure Scenarios

| Case | Behavior |
|---|---|
| Token missing, or no variable matches the host | `auth-check` stops and names the variable it expected. Every operation fails the same way; none returns empty. |
| 401/403 on reading branch protection | `get-required-checks` reports unreadable. The caller treats every reported check as required, as GitLab does. |
| Actions disabled, or an external CI | Run operations report unavailable plus the status link. Checks still work from statuses. |
| Rerun in `report` mode | Exit 3 with `RERUN_UNAVAILABLE <link>`. `om-auto-fix-pr` takes the new branch from D12: unconfirmed flake, no code change, check left for a human. |
| `dispatch` mode and the workflow has no `workflow_dispatch:` | 404/422, reported with the hint to add the trigger or switch the copy back to `report`. |
| `GET /issues/comments/{id}` answers `204` | An error naming the comment, never an empty body. |
| The instance's prefix list does not include `WIP:` | `create-pr` still succeeds, but `isDraft` reads false. Documented; teams change the prefix in their copy. |
| A cross-repo (fork) PR | `head` is `owner:branch`; `checkout-pr` uses `pull/{n}/head`. |
| Pagination cap (`MAX_RESPONSE_ITEMS`) | `fj_list` follows `Link` until exhausted; searches stop at the caller's `limit`. |
| A Codeberg-specific limit (runner quotas, attachment size) | Documented as observed during Phase 7; not worked around. |

## 📝 Risks & Impact Review

- **No contract change.** Operation names, output shapes, the config schema, and the chaining lines are unchanged. Additive only, for `BACKWARD_COMPATIBILITY.md`.
- **New env vars** (`FORGEJO_TOKEN*`, `FORGEJO_URL`) are a documented runtime surface of this descriptor, not config. The rerun switch lives in the committed copy (D5).
- **Four additive skill edits (D12).** Workflow detection changes only for the `forgejo` tracker. The link parser gains new shapes. The CI-stabilization step gains a branch that GitHub and GitLab never reach.
- **Unverified assumptions:**
  - the status context of a dispatched run (D5);
  - the token scopes (D4);
  - draft read-back (D7).

  Each is verified on 16.0.3 (D11) and recorded in the run record. If the dispatch context turns out to match, D5's default may change to `dispatch` in the same PR. Further assumptions to verify in Phase 7: the review `event` values, the `refs/pull/N/head` ref of pull-request runs, and `GET /branches/{base}` readability without admin.
- **Rollback:** remove the descriptor and the setup option. Repositories that installed it keep their copy, as with any provider.

## 📋 Phasing

One PR, as in #122. The parity test forbids shipping a partial stand-alone provider, so `forgejo` joins the parity set in the last phase.

## 📋 Implementation Plan

Every phase extends the stub harness for its operations, as #122 landed its tests right after the descriptor. Live checks run on the Codeberg sandbox as each phase lands.

**Phase 1: Skeleton, helpers, harness.**
1. Create `forgejo.md` with Prerequisites, Conventions, and Shared helpers (D1–D3, `fj_http` as the single curl call site), plus all 42 headings marked TODO.
2. Add the Forgejo section to `scripts/test-tracker-providers.mjs`: stub `fj_http` with recorded fixtures. Port GitLab's assertions one for one: an unreadable list is not empty, a failed read is not "none", and a failed label removal blocks the transition. Add tests for token-by-contacted-host, the origin-parsing forms, the refusal of `http://`, and the token never appearing on argv.
3. Implement `auth-check`, `current-user`, `repo-info`, and `default-branch`, with tests.

**Phase 2: Issues.**
4. Implement `get-issue` (including `isPullRequest`) through `update-comment` (11 headings), with tests, including the 204 comment case.

**Phase 3: Pull requests, read side.**
5. Implement `get-pr` with merge-state derivation, the counted-review decision, and D8 parsing with code-span skipping, with tests.
6. Implement `list-prs`, `search-prs` (search translation and the `#N` timeline), `get-pr-diff`, `get-pr-files` (`X-HasMore`), `checkout-pr`, `get-pr-comment` / `get-review-comment`, and `list-review-comments`, with tests.

**Phase 4: Pull requests, write side.**
7. Implement `create-pr` / `update-pr` / `mark-pr-ready` (D7, read-back), `comment-pr`, `assign-pr`, `label-pr`, `review-pr` (verify the `event` values), and `merge-pr` (read-back, 405/409), with tests.
8. Implement `attach-image-evidence` (comment assets). Verify that the images render inline on Codeberg.

**Phase 5: Labels.**
9. Implement the label guards (`label_exists` covering org labels, `apply_label` and `set_pipeline_label` with id resolution and removal semantics), `list-labels`, `create-label`, and `ensure-label-taxonomy`, with tests.

**Phase 6: CI.**
10. Implement `get-pr-checks` (paginated statuses, bucket mapping) and `get-required-checks` (`GET /branches/{base}`, glob expansion, #128 semantics), with tests.
11. Implement `list-runs` (`head_sha`, `RUNS_UNAVAILABLE`), `get-run` (status mapping), `get-run-failed-logs`, `watch-run`, and `rerun-failed` (two modes, D5), with tests.

**Phase 7: Live verification record.**
12. Run the full operation list against the Codeberg sandbox: a workflow with a deliberately failing job, and one with `workflow_dispatch:`.
13. On self-hosted 16.0.3, run the token-scope matrix (D4), the dispatch status context (D5), draft read-back (D7), and branch readability without admin. Record everything in the run record without naming the instance.

**Phase 8: Setup and skill edits.**
14. Add `forgejo` to the `om-setup-agent-pipeline` body, `interview-questions.md`, and `TEMPLATE.md`. Apply the four D12 edits, with assertions in the existing tests where they cover those files.

**Phase 9: Parity and lint.**
15. Add `forgejo` to the stand-alone parity set and the provider-list assertions. Assert that no `TODO` remains in `forgejo.md`, since the parity check compares headings only.
16. Extend `scripts/lint.sh` to reject the helper names (`fj_http|fj_get|fj_list|fj_write`) and `FORGEJO_TOKEN` inside `skills/**` outside `references/trackers/`, mirroring the `gh` / `glab` rule.

**Phase 10: Docs and gate.**
17. Update `DECISIONS.md` (deviations D1, D5, the shared number space, and the merge-state derivation), `UPGRADE_NOTES.md`, the README tracker section, and `docs/skills/om-setup-agent-pipeline.md`.
18. Finish the run record under `.ai/runs/` and run the five validation commands.
