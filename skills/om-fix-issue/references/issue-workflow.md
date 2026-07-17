# Detailed staged issue workflow

This procedure is loaded by `om-fix-issue` for preflight, model dispatch, and
claim-safe failure handling.

## Claim preflight

Resolve the current tracker user and fetch the issue's state, assignees, labels,
comments, and linked work. Honor the same concurrency signals as
`om-auto-fix-issue`: an active owner, fresh claim comment, existing fix branch,
or open covering pull request blocks the run unless `--force` was explicitly
confirmed. Do not claim here; `om-fix` owns the claim after qualification.

## Trusted harness configuration

Resolve the base revision through the configured base branch and tracker
descriptor. Export its `.ai/agentic.config.json` to a temporary file and pass
that file to the harness runtime with `--config`. If
`OM_AGENT_HARNESS_CONFIG` names a user-local JSON overlay, pass it with
`--user-config`. Never use the task branch's adapter commands, endpoints, or
credential-variable names.

For `standard` with no `agentHarness` section, skip `validate-config` and
`probe` — no external model is used — and continue with `capture`/`stage` only.
Otherwise validate and probe the requested profile before creating the
implementation worktree. Required-model or review-policy failure blocks;
optional-model absence is recorded as skipped.

Immediately after `probe`, render its JSON as a readiness table and show it to
the user before any model is invoked — one row per selected model:

```markdown
| Model | Binding | Role | Status |
|---|---|---|---|
| `codex` | `gpt-5.6-sol` | worker + reviewer | ✅ ready |
| `kimi` | `kimi-code/k3` | reviewer | 🟥 missing — Kimi subscription CLI not found |
```

Use ✅ for `ready` and 🟥 for `missing` or `failed`, appending the probe note
after the icon. Include the same table in the run report. Proceed only when
every row the profile requires is ✅; otherwise follow the reroute above.

When the requested profile is missing from the trusted config or its probe
fails on required bindings, do not proceed, and do not substitute another
profile. Tell the user plainly that the requested variant needs model bindings
that are not configured or not ready, then run `om-setup-agent-harness`
interactively so they can bind the reviewers and workers they actually have —
any OpenAI-compatible endpoint or local CLI through the generic adapters, not
just the bundled jury. When setup finishes, re-probe and continue the
originally requested profile. Only when the user, told what they would lose,
explicitly declines to configure any external model may the run continue under
`standard` (the mandatory fresh Claude `om-code-review` pass needs no external
provider); state in the report that the requested profile was not used and
why.

## Worktree

If already inside a linked worktree, reuse it and never nest another. Otherwise
create a clean worktree under `.ai/tmp/om-fix-issue/` from the configured base
revision, create a human-readable `fix/issue-<id>-<slug>` branch, and record:

```text
START_HEAD=<git rev-parse HEAD>
START_STATE=<ignored harness start-state artifact>
CREATED_WORKTREE=<0|1>
WORKTREE=<absolute path>
```

Run the harness `capture` command immediately after branch creation and before
any spec, test, code, or worker change.

Never remove a worktree that contains the staged handoff. Print its path as the
last report line.

## Multi root-cause review

Write the issue symptom, located cause, evidence, files-to-change list, proposed
regression test, and acceptance criteria to an artifact under the ignored QA
artifact directory. Run `prepare-review --kind diagnosis` on that artifact, then
execute the bound council exactly as the `om-harness`
`references/code-review-contract.md` defines it (fresh Claude context plus the
concurrent runtime `review` command). The host confirms or
rejects findings empirically. A confirmed diagnosis finding loops back to
`om-root-cause`; a single minority finding remains visible even when rejected.

## Optimized implementation

Split work into file-disjoint packets small enough for one stateless worker.
Each packet must contain exact files, relevant signatures, reference patterns,
acceptance checks, and these hard boundaries:

- edit only the current worktree;
- create no commit;
- perform no remote or tracker operation;
- do not weaken or delete tests;
- return changed paths and checks run.

Invoke the harness `worker` command for one configured worker per packet. Run
the packet acceptance check immediately. Redispatch a failed packet once with
the concrete failure; after that, the host integrates or blocks. Then invoke
`om-fix` normally so its mandatory regression and validation contract still
holds.

## Final council and reconciliation

Write the acceptance criteria and root-cause summary to a criteria file. Build
the intended-path allowlist and version 1 evidence for the full configured
validation gate. For `standard` and `optimized`, create a new Claude context
with no inherited diagnosis or implementation transcript and run
`om-code-review` there. For `multi`, `multi-optimized`, and `high-assurance`,
run `prepare-review --kind implementation` with those inputs and execute the
bound council per `references/code-review-contract.md`, passing `--paths-file`
so tracked, staged, unstaged, deleted, and newly created files all appear in
every reviewer's subject. Read the generated status table before the finding
matrix. Confirm every blocker/major against the
worktree, fix confirmed findings, rerun validation, and rerun the council until
no confirmed blocking finding remains or the loop reaches three iterations;
then stop and report every surviving finding instead of iterating further.

Keep raw JSON and Markdown under the ignored QA artifact directory. Do not add
them to the stage allowlist.

## High-assurance packets

For the `high-assurance` profile, replace the raw `worker` dispatch above with
one versioned manifest per file-disjoint packet and follow the packet lifecycle
exactly as the `om-harness` `references/packet-contract.md` defines it:
`packet-run`, trusted gate evidence bound to the reviewed diff SHA-256,
`packet-gate`, and `packet-release` only for an explicit abort. Do not continue
to integration while any packet is not `gated`.

## Claim outcomes

- Ready staged handoff: keep assignment and `in-progress`; report “held for
  human review” and include the handoff report's publish checklist, whose last
  step releases the claim (assignee and label) once the human publishes.
- No action needed before claim: no cleanup required.
- Failure after claim: remove the assignee and the `in-progress` label through
  the descriptor guard and comment that the staged-only run aborted, so a
  leftover claim never fences the issue off from later runs.
- Explicit abort: release the assignee and label with a comment; preserve files
  unless the user separately asks to discard them.
