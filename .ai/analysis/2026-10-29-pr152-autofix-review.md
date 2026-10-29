# PR #152 — autofix review

## Decision

The final local code review is **approve**, with no remaining confirmed blocker
or major finding. The source preserves the author's concurrent `04f1cfe` runtime
hardening and `7a8bb5a` equivalent strict-schema correction, together with this
run's fixes and regression coverage. No contributor history is rewritten.

Independent review approved the schema correction at `c8564fa` with no findings,
and the combined runtime at `18ea351` with one minor hook gap. Both reviewers
independently passed all nine configured commands. The remaining minor is now
fixed: option-bearing directory traversal is conservatively unresolved, so an
active sibling run requires host permission; quoted `--` still selects its
literal destination. Red/green regressions cover physical/logical/combined and
unsupported options plus ordinary behavior after the guard ends. The final
small correction is reviewed by the parent; a separate independent approval of
the exact final commit is not claimed.

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
| Codex reviewer rejects the output schema | Major | A temporary Codex-only schema requires all output fields and an explicitly typed integer version. Live Codex v0.165.0 returned `invalid_json_schema` before the fix; the same configured model now completes the review. The subprocess regression checks strict-schema acceptance and unchanged legacy output support. |
| Directory options hide an active worktree | Minor | Treat unsupported `cd`/`pushd` options as unresolved instead of mistaking the option for the directory. An active sibling guard then requires host permission. Tests cover `-P`, `-L`, combined flags, unsupported options, quoted separators and ordinary commands after the run ends. |
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
Additional evidence now includes eleven real desktop/mobile guide checks, a
fresh Claude host that independently ran the fixture tests and produced a valid
staged handoff, stale-content rejection, and live Codex workspace-write execution.
The Codex worker fixed a disposable fixture and passed its tests. Its executed
probe was denied writes outside the declared writable roots, Git ref changes and
network access; parent observations confirmed unchanged sentinel, refs and HEAD
and no request received by the local test server. A sibling temporary path was
writable, matching Codex's declared `/tmp` allowance.

A custom council explicitly selecting the single available Codex advisor, plus
the genuine matching Claude host artifact, returns satisfied/approve after the
schema correction. This does not stand in for the bundled five-advisor profile:
DeepSeek/Zen credentials and the Kimi CLI remain unavailable. Model provenance
remains unverified when the adapter cannot attest actual metadata. The tracker
issue lifecycle remains unexercised. None of this grants person-owned QA approval.

[Published browser and fresh-host evidence](https://github.com/open-mercato/skills/pull/152#issuecomment-6498131572)
precedes this additional live-provider check. The ignored QA artifact directory
contains the actual worker tool trace, sandbox observations, and before/after
Codex council results. The schema rule is documented in
[OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs#all-fields-must-be-required).

The author's additional hardening preserves the strongest finding severity
across split reviews, reviewers and verifier escalation. Worktree-specific
publication guards activate on capture and clear on successful staging or
explicit owner-bound abort; Unicode staging and quoted hook paths are covered.
Independent lifecycle and severity-matrix probes passed, and real fresh-host
staging plus the available custom council passed on the combined source.

## Compatibility and remaining gates

No published skill name, tracker operation, config key, chaining marker, label
meaning or CLI flag is removed. Runtime schemas, consuming contracts and upgrade
notes agree on the unreleased safety tightening. The optional harness preserves
ordinary pipeline operation. No standard shared step-file copy was modified;
changed staging/packet contracts are owned by the harness.

Before merge, the latest correction needs publication, new-head CI, and a
person-owned high-risk QA sign-off pinned to that head. The user authorized
normal follow-up pushes; no force-push or actual merge is requested. Keep
`needs-qa` and the high-risk gate in force. There is no change to any standard
shared step file or to a published output format.
