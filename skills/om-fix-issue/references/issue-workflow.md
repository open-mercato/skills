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

Validate and probe the requested profile before creating the implementation
worktree. Required-model or quorum failure blocks; optional-model absence is
recorded as skipped.

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
artifact directory. Follow the `om-harness` bound `om-code-review` contract:
run `prepare-review --kind diagnosis`, create a new Claude context without
forking this conversation, and run `om-code-review` there. Concurrently run the
harness `review` command with `--artifact`, `--review-packet`, and
`--host-review`; the last argument names the predeclared path that Claude writes
atomically. The host confirms or
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
run `prepare-review --kind implementation` with those inputs, then follow the
`om-harness` bound `om-code-review` contract: serialize the new Claude context's
matching fresh-review artifact atomically while running the harness `review`
command concurrently with `--paths-file`, `--review-packet`, and
`--host-review` so tracked, staged,
unstaged, deleted, and newly created files all appear in every reviewer's
subject. Read the generated status table before the finding matrix. Confirm
every blocker/major against the
worktree, fix confirmed findings, rerun validation, and rerun the council until
no confirmed blocking finding remains or the loop reaches three iterations.

Invoke every reviewer id listed by the profile. `minimumSuccessful` and
`minimumFamilies` decide whether the council is usable when providers fail;
they never reduce the selected jury. The bundled `multi` profile therefore runs
fresh Claude, Codex, DeepSeek, Kimi, GLM, and MiMo review passes, all using
`om-code-review`.

Keep raw JSON and Markdown under the ignored QA artifact directory. Do not add
them to the stage allowlist.

## High-assurance packets

For the `high-assurance` profile, replace the raw `worker` dispatch above with
one versioned manifest per file-disjoint packet. Include exact allowed paths,
risk, invariants, acceptance criteria, dependencies, non-goals, and reference
patterns. Invoke `packet-run`; it owns path leases, blind risk-scaled review,
fresh finding verification, separate fixer invocations, and bounded retry and
input budgets.

When a packet reaches `awaiting_validation`, run trusted acceptance commands or
manual checks outside the model process. Write gate evidence that maps every
criterion to its command or method and observed result, binds it to the ledger's
diff SHA-256, then invoke `packet-gate`. Do not continue to integration while any
packet is not `gated`. Use `packet-release` only for an explicit abort or manual
ownership transfer and preserve the packet's files.

## Claim outcomes

- Ready staged handoff: keep assignment and `in-progress`; report “held for
  human review.”
- No action needed before claim: no cleanup required.
- Failure after claim: remove `in-progress` through the descriptor guard and
  comment that the staged-only run aborted.
- Explicit abort: release the label and comment; preserve files unless the user
  separately asks to discard them.
