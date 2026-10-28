# Fix: GitHub tracker label edits rejected by the retired Projects (classic) field

## Goal

Make the GitHub tracker descriptor's guarded label transitions land reliably, and document the upgrade path — the reported failure is that a guarded transition (e.g. `review` → `merge-queue`) is rejected because the `gh` client still queries the retired Projects (classic) GraphQL field, leaving the PR unlabeled.

## Scope

- `skills/om-setup-agent-pipeline/references/trackers/github.md` — the shipped GitHub descriptor (label guards, assignee/body operations, `auth-check`, Prerequisites).
- `skills/om-setup-agent-pipeline/references/trackers/TEMPLATE.md` — the provider contract, so custom trackers inherit the general rule.
- `.ai/trackers/github.md` — this repo's own installed copy (re-sync).
- `UPGRADE_NOTES.md` — dated section + a `Notable upgrades` entry with the stale-install symptom and the merge instructions.

## Non-goals

- No skill (`SKILL.md`) behavior changes. The guard names and argument order are preserved, so no caller changes.
- No new named tracker operation (that would be a contract addition requiring every descriptor to implement it). `auth-check`'s meaning widens additively instead.
- Not vendoring, pinning, or auto-upgrading `gh` for the user.

## Root cause (verified, not assumed)

Reproduced locally against this repo with `gh` 2.63.2:

```
$ gh pr edit 65 --add-label priority-medium
GraphQL: Projects (classic) is being deprecated in favor of the new Projects experience,
see: https://github.blog/changelog/2024-05-23-sunset-notice-projects-classic/. (repository.pullRequest.projectCards)
EXIT=1
```

GitHub retired the Projects (classic) GraphQL fields. `gh pr edit` / `gh issue edit` reach the API through GraphQL and, on clients older than 2.82.1, request `projectCards` **unconditionally** — no project flag involved. `gh` treats the error as fatal and exits **before** applying the edit, printing only what looks like a deprecation warning. The label never lands.

Upstream, confirmed against `cli/cli`:

- cli/cli#11983 — "`gh pr edit` fails with Projects (classic) deprecation error even without `--add-project`".
- cli/cli#11986 — fixed in **v2.82.1** (2025-10-22), whose release notes read "Fix `gh pr edit` not detecting classic projects feature deprecation".
- cli/cli#11992 / #12476 / #12640 — the same error from `gh issue view`; the maintainers' answer is to upgrade.
- cli/cli#11769 — still open: `projectCards` remains a fetchable `--json` field, so naming it in a field list errors on any version, including 2.90+.

**This corrects an earlier belief that the org had a Projects-classic board attached.** It is purely a stale-client issue: repository and organization configuration are irrelevant, and no classic project has to exist anywhere for it to fire. Distro packages are the usual source (Debian bookworm 2.23, Ubuntu 2.45, Alpine stable 2.72 — all affected).

## Implementation plan

### Phase 1 — Make the mutations version-independent

Route every label, assignee, and title/body mutation through REST (`gh api`), which never touches the GraphQL project fields. Guard names and argument order stay exactly as `BACKWARD_COMPATIBILITY.md` §3 protects them (`apply_label "<label>" <n>`, `apply_issue_label`, `remove_issue_label`, `set_pipeline_label <n> "<label>"`), so no skill changes; `remove_label` is added as an additive helper replacing the inline `gh pr edit --remove-label` that `label-pr` documented.

### Phase 2 — Make the failure diagnosable and the fix findable

Prerequisites gain the version floor, the verbatim error text, the recognition rule (this always means a stale client), the upgrade commands, and the upstream references. `auth-check` warns below 2.82.1. `TEMPLATE.md` gains the general rule for custom providers.

### Phase 3 — Propagate

Re-sync this repo's installed `.ai/trackers/github.md`, and write the upgrade notes so consuming repos know to re-sync and what a stale copy looks like.

## Risks

- **Behavior-preserving rewrite of a protected surface.** The guards are protected by `BACKWARD_COMPATIBILITY.md` §3. Mitigated by keeping names, arity, and argument order identical; only the implementation changes. `set_pipeline_label`'s reversed argument order (number first) is preserved deliberately and called out in a comment.
- **`jq` becomes a hard dependency of the guards** (label-name URL-encoding). It was already required by the config-loading snippet; now stated in Prerequisites.
- **Removal no longer checks existence first.** REST answers 404 for a label that is not applied, which is a no-op — behavior is equivalent, one API call cheaper, and still `|| true`-guarded.
- **`sort -V` in `auth-check`** is GNU/BSD-portable but not POSIX; the descriptor documents the manual fallback.
## Verification

Run on this box against `gh` **2.63.2** — the very client that fails — so a passing guard proves version-independence rather than assuming it:

| Check | Result |
|---|---|
| `bash scripts/lint.sh` | Lint OK |
| `apply_label` on an existing label | exit 0, label present on read-back |
| `apply_label` on an undefined label | logged skip, exit 0 (guard preserved) |
| `remove_label` for a label not applied | silent no-op, exit 0 (404 path) |
| `set_pipeline_label` full loop | exit 0, end state unchanged as designed |
| `apply_label` → `remove_label` round trip on a label not previously present | label appears, then disappears, on read-back |
| Label name containing a space (`jq -sRr @uri`) | encodes to `%20`, no stray newline |
| `auth-check` version gate | warns on 2.63.2; silent at 2.82.1 and 2.96.0 |

The same box still fails `gh pr edit 65 --add-label priority-medium` with the Projects (classic) error, which is what makes the contrast meaningful.

## Progress

- [x] Research: reproduce the failure, identify the root cause, find the upstream fix version
- [x] Phase 1.1 Rewrite the label guards over REST (`tracker_repo`, `label_exists`, `apply_label`, `apply_issue_label`, `remove_label`, `remove_issue_label`, `set_pipeline_label`)
- [x] Phase 1.2 Convert `update-issue`, `assign-issue`/`unassign-issue`, `update-pr`, `assign-pr`/`unassign-pr`, `label-pr`/`unlabel-pr`, `list-labels` to REST
- [x] Phase 2.1 Prerequisites: version floor, verbatim error, recognition rule, upgrade commands, upstream refs
- [x] Phase 2.2 `auth-check` client-version warning; Conventions: never request `projectCards`
- [x] Phase 2.3 `TEMPLATE.md`: narrowest-API-surface rule + widened `auth-check` contract
- [x] Phase 3.1 Re-sync `.ai/trackers/github.md` (whole-file; verified no local edits)
- [x] Phase 3.2 `UPGRADE_NOTES.md` dated section + `Notable upgrades` entry
- [x] Phase 4.1 Run `bash scripts/lint.sh`
- [x] Phase 4.2 Verify the guards by execution on the failing client
- [x] Phase 4.3 Commit, push branch, open PR, apply labels

## Note on the run

The shell was unavailable for the middle stretch of this run (every Bash call, down to `echo`, exited 1). The edits were written during that window and verified afterwards, once it recovered; nothing in the Verification table above is inferred.
