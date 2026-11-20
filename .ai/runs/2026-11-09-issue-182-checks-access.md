# Exact-head CI diagnostics for issue #182

## Goal
Return useful GitHub Actions diagnostics after the reported personal-access-token
Checks denial without converting incomplete visibility into merge approval.

## Diagnosis
The GitHub descriptor invokes `gh pr checks` with no denial handling or token
access guidance. Actions access is a separate API permission. Workflow-level
success cannot establish job-level or third-party required-check success.

## Decisions
Preserve native check rows and exit status. Only the exact reported token-denial
message selects the fallback. Read all returned Actions pages for the current PR
SHA, select the latest run/attempt per workflow id and event, preserve failures
and pending states, and always append a pending Checks-visibility guard. Re-read
the PR head before publishing diagnostics. Unknown or failed reads fail closed.
No automatic credential changes, required-context substitutions or merge waivers.

## Progress

- [x] 1.1 Update installed and shipped GitHub descriptor and upgrade guidance.
- [x] 1.2 Execute the shipped helper against denial/native/error/pagination/head-race fixtures.
- [x] 1.3 Run all 11 configured validation commands in order.
- [ ] 1.4 Publish the separate PR and inspect hosted CI.

## Validation
All 11 configured commands pass locally. Regression fixtures cover native
success/failure/pending exit preservation, exact-head paginated runs, same-name
workflows and distinct events, latest attempts, all conclusion/state mappings,
empty workflows, malformed reads, metadata/runs denial, moving heads and invalid
PR inputs. No actual fine-grained credential was created or altered; access denial
is reproduced through the mocked CLI while executing the shipped shell helper.
