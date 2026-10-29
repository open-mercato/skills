# PR #152 — autofix review

## Decision

The final local code review is **approve**, with no remaining confirmed blocker
or major finding. Publication is pending the task's explicit Guard confirmation;
the published PR is still at `1f3c765` and remains changes-requested. After
publication it still needs new CI and independent manual QA (`risk-high`,
`needs-qa`). This report grants no QA approval.

The last independent reviewer verified the preceding packet/concurrency fixes,
ran all nine checks, and reproduced one additional staging defect. Its session
then failed at model capacity before a final verdict. That defect was reproduced
again by the parent, fixed in this commit, regression-tested, and re-reviewed
locally. There is no claim of a completed independent approval of this final tip.

## Fixed findings

| Finding | Severity | Final behavior and evidence |
| --- | --- | --- |
| Reviewer writes hidden by index flags | Blocker | Hash all tracked working bytes and index flags. Tests cover new/pre-existing assume-unchanged and skip-worktree flags plus flag-only mutation. |
| Failed validation accepted for staging | Blocker | Both packet and fresh-host gates must pass; successful command evidence requires exit code zero. Failed host validation forces request changes. |
| Background reviewer child survives completion | Blocker | POSIX process-group cleanup covers completion, timeout and Kimi probes. The original late-write probe now leaves source unchanged. Command adapters require WSL on native Windows; trusted binaries and host permissions remain necessary. |
| Retries exceed packet budgets | Major | Reserve/persist each attempt and prompt bytes before dispatch, including verifier and HTTP retries. Real subprocess/HTTP tests check invocation and byte exhaustion while retaining leases. |
| Kimi error exit accepted as a review | Major | Reject nonzero exits even when stdout contains valid approve JSON. Regression reproduces exit 7. |
| Packet scope omits hidden changes | Major | Snapshot the whole allowed scope through a fresh index. Hidden pre-existing edits and post-review drift block; directory/deletion/missing-path behavior and the real index remain intact. |
| Split parts exceed concurrency limits | Major | One shared limiter covers models, split parts, verifiers and councils, bounded by both configured caps. Real HTTP tests exercise caps one and two. The independent cap-one probe changed from peak two to peak one. |
| Handoff omits hidden outside-scope edits | Major | Compare the complete working diff with the complete staged diff independently of real index flags. Both flag variants now fail; the outside file and index flags are preserved and never staged. |
| Base conflicts | Major | Integrated `origin/main` at `fc77110`, preserving the harness suites and delegated-review suite across configuration, CI and SDLC. |

Every runtime defect was observed failing before its fix and passing afterwards.
Local commits before this final correction are `74e30b8`, `daba910`, and
`b993e21`. No contributor history was rewritten or force-pushed.

## Validation

All configured commands ran in order against the final code with `TMPDIR=/tmp`:

| Command | Result |
| --- | --- |
| `bash scripts/lint.sh` | PASS |
| `node scripts/test-browser-providers.mjs` | PASS |
| `node scripts/test-tracker-providers.mjs` | PASS |
| `node scripts/test-classify-runs.mjs` | PASS |
| `node scripts/test-close-keywords.mjs` | PASS |
| `node --test scripts/test-ux-design.mjs scripts/test-ux-design-comments.mjs` | PASS |
| `node scripts/test-agent-harness.mjs` | PASS |
| `node scripts/test-agent-harness-security.mjs` | PASS |
| `node scripts/test-review-sweep.mjs` | PASS |

The cockpit's default temporary directory lies under an ancestor Git checkout;
the existing UX no-Git fixture initially failed there. The exact configured
command passes all 39 tests with fixtures under `/tmp`. No dependencies require
installation. Node syntax checks and `git diff --check` also pass.

The concurrency module is imported by the security suite, so it runs through the
existing configured gate and CI without an additional command. Synthetic tests
use temporary repositories, local mock providers and synthetic credentials.
They do not validate real subscriptions, genuinely fresh Claude contexts, host
publication permissions, or the guide's browser interactions.

## Compatibility and remaining gates

No published skill name, tracker operation, config key, chaining marker, label
meaning or CLI flag is removed. Runtime schemas, consuming contracts and upgrade
notes agree on the unreleased safety tightening. The optional harness preserves
ordinary pipeline operation. No standard shared step-file copy was modified;
changed staging/packet contracts are owned by the harness.

Before merge: publish the prepared normal follow-up commits, wait for the new
head's CI, and obtain independent manual QA evidence pinned to that head. The
existing QA gate must remain in force. The task's Guard requires confirmation
before pushing the shared PR branch; no commit has been pushed by this run.
