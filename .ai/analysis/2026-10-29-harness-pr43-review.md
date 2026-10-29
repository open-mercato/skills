# 🔍 Code Review: staged harness replacement for PR #43

## Verdict

✅ approve — the inherited containment, integration, and coverage findings are
addressed. The replacement is ready for PR review; human QA and the independent
review required for a high-risk change still gate merge.

## 🎯 Summary

Compared with the closed PR's `a018dc9`, reviewer processes now use an environment
allowlist, content/index/config/ref checks, and non-retryable containment failures.
Staging requires an approved fresh-host artifact for the exact implementation
packet and verifies both working and indexed bytes. The ten staged skills retain
their names, gain canonical preflights and communication references, and keep
publication separate. Latest `main` was integrated in `a77ec1e`.

The local adversarial probes reproduced the original environment leak, accepted
reviewer mutation, replacement-ref diff concealment, and non-JavaScript freeze
bypass before these changes. Regression tests now require rejection. All provider
calls in this validation are synthetic local fixtures, not live model approvals.

## Inherited feedback and disposition

Original findings are by [@pkarw](https://github.com/open-mercato/skills/pull/43#pullrequestreview-4773226800).

| Original finding | Disposition and evidence |
| --- | --- |
| B1: base conflict | Resolved seven integration conflicts, preserving both branches and the 70-skill roster. |
| M1: credential denylist | An environment allowlist excludes secret values and credential handles. Actual worker Git subprocesses reject transport use; command reviewers may receive only one explicitly selected credential. Kimi version probes use the same restricted environment. |
| M2: reviewer file mutation | Command and preset invocations compare worktree content, index, local Git config, and ref/reflog state. A containment failure stops retries and fails even advisory councils. |
| M3: replacement/custom refs | All non-remote namespaces are captured; runtime Git disables replacement objects. Review/stage diffs also disable external diff and text conversion. Remote-tracking fetch noise remains supported. |
| M4: language-specific freeze | Conventional tests across languages, exact manifest paths, notebooks, and multi-edit targets are protected. Invalid hook payloads/manifests fail closed. |
| M5: missing security tests | The security suite exercises subprocess hardening, path escapes, out-of-lease worker writes, worker ref changes, preset mutations, the generic HTTP adapter, leases, hooks, and staging drift. Both harness suites run in CI and the repository gate. |
| Minor: missing multi-edit/notebook hooks | Both tool matchers and target extraction are covered by executable hook tests. |
| Minor: publication-hook bypasses | Direct Git pushes, hosting-CLI creation/merge, REST writes, continuations, quoted verbs, and malformed input are covered. Hooks are explicitly supplemental; staged execution requires independent host publication permissions. |
| Minor: unbound staging content | Staging requires the implementation packet and matching approved host artifact, then rechecks the staged hash. Old unreviewed handoffs must be regenerated. |
| Minor: quadratic JSON extraction / partial host write | A balanced-object scan rejects ambiguous output; the bounded artifact wait tolerates incomplete JSON writes. Both paths have regression cases. |
| Minor: crashed/corrupt leases | Corrupt fields fail closed. Explicit owner-termination checks and `packet-release` are the recovery procedure; automatic expiry is intentionally rejected because it could release live work. Same packet ids across runs cannot bypass overlap checks. |
| Minor: Kimi containment asymmetry | The outer reviewer guard covers the Kimi preset, including version probing. A synthetic preset mutation fails without retry. |
| Minor: optimized reroute asks for reviewers | Optimized aliases explicitly require an audited worker; adding a reviewer alone cannot satisfy them. |
| Minor: undocumented PowerShell limitation | Bash/Node hook support is documented for macOS, Linux, and WSL. Native PowerShell wiring is explicitly unsupported and cannot be represented as active protection. |
| Minor: unbounded/leaking tests | Each integration subprocess has a timeout. Fixtures are removed on completion/failure and handled termination signals; the mock provider no longer keeps the runner alive. The suite's POSIX/WSL constraint is explicit. |
| Minor: worker prompt guidance | The catalog now matches the audited stdin command; prompt-file arguments remain available for reviewers. |
| Nit: raw/aggregate schema ambiguity | The provider schema is named explicitly and accepts optional version 1 while preserving legacy unversioned objects. Aggregate result fields remain unchanged. |
| Nit: internal-runtime badge | The skill card identifies an internal runtime. |
| Nit: handoff subject markers | Optional `Issue:`/`Spec:` lines are present; `WORKTREE=` remains last. Legacy template paths redirect within their own skill. |

The later [layering/mode/communication review](https://github.com/open-mercato/skills/pull/43#pullrequestreview-4776455472)
is addressed by own-skill setup/rule/report references, explicit interactive and
autonomous modes, and preserved chaining fields. Shared text was copied unchanged;
staged behavior lives in the specifics sections. No existing skill's setup default
was changed.

The [composition and naming suggestion](https://github.com/open-mercato/skills/pull/43#pullrequestreview-4776505562)
retains stable names and thin profile aliases. The feature wrapper composes the
lower-level spec/readiness/test/review skills; `om-auto-implement-spec` remains a
publication driver and is not invoked inside a staged run. That constraint and
its rationale are recorded in `DECISIONS.md`, rather than silently changing the
existing autonomous engines. Issue workers now start inside the owning `om-fix`
claim and observed-regression phase.

## 🧪 Validation Gate

| Command | Status | Evidence or limitation |
| --- | --- | --- |
| `bash scripts/lint.sh` | PASS | Frontmatter, overrides, pointers, roster, agnosticism, and embedded contract suites. |
| `node scripts/test-browser-providers.mjs` | PASS | Provider parity and CI/config command ordering. |
| `node scripts/test-tracker-providers.mjs` | PASS | Shipped tracker contracts and compatibility. |
| `node scripts/test-classify-runs.mjs` | PASS | Run classifier regression cases. |
| `node scripts/test-close-keywords.mjs` | PASS | Closing-keyword contract cases. |
| `node --test scripts/test-ux-design.mjs scripts/test-ux-design-comments.mjs` | PASS | Existing design/helper/comment regressions. |
| `node scripts/test-agent-harness.mjs` | PASS | Model adapters, councils, packets, leases, and approved-content staging. |
| `node scripts/test-agent-harness-security.mjs` | PASS | Adversarial synthetic fixtures for the repaired boundaries. |

## 💥 Breaking Changes

The staging CLI was only in the unmerged PR #43. It now requires the final
implementation review packet and approved fresh-host artifact; this intentional
security tightening has no unsafe fallback. Regenerate old unpublished handoffs.
Published pipeline flags, tracker operations, label semantics, existing model ids,
and aggregate schemas remain unchanged. Optional `agentHarness` absence still
supports the host-only standard path; custom command credential forwarding is
explicitly opt-in and never applies to workers.

## 🧪 Test Coverage

Both harness suites use temporary repositories, synthetic credentials and local
mock providers. They do not contact live model providers or certify a real user's
subscription, native agent-context creation, or host permissions. Manual QA should
exercise a standard staged handoff and a configured council, verify the frozen
regression and exact staged diff, and confirm that publication permissions are
actually disabled. Native PowerShell hook wiring is outside the supported scope.
