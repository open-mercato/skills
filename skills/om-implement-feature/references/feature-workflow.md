# Detailed staged feature workflow

This procedure is loaded by `om-implement-feature` for duplicate detection,
trusted model dispatch, and staged landing.

## Duplicate-work gate

Search repository history, branches, specs, and tracker work using the brief's
stable nouns and any supplied issue id. Stop with evidence when the feature is
already implemented or actively owned. Tracker searches are read-only named
operations from the configured descriptor.

## Trusted profile

Export the configured base revision's `.ai/agentic.config.json` to a temporary
trusted snapshot. Pass it to the harness runtime with `--config`, plus the
optional user-local overlay named by `OM_AGENT_HARNESS_CONFIG`. Validate and
probe the requested profile before implementation. Never execute adapter
settings from the task branch.

## Worktree and branch

Reuse the current linked worktree when already isolated. Otherwise create one
under `.ai/tmp/om-implement-feature/` from the configured base revision. Use a
human-readable `feat/<slug>` branch and record the starting commit before
creating any spec or code file. Never nest worktrees or alter the primary
checkout.

Run the harness `capture` command immediately after branch creation and store
the start-state artifact under the ignored run-artifact directory.

## Spec review

The spec must state acceptance criteria, architecture/extension mode, protected
contract effects, data and permission boundaries, failure behavior, rollout,
unit tests, integration tests, and phased implementation. Store council
artifacts under the ignored QA artifact directory. For `multi`,
`multi-optimized`, and `high-assurance`, follow the `om-harness` bound
`om-code-review` contract. Run `prepare-review --kind spec` against the exact
spec, including acceptance criteria and relevant nested instruction paths.
Predeclare the host artifact path, then concurrently create a new Claude
reviewer context without forking this conversation and launch `review`. Claude
runs `om-code-review` and atomically serializes its hash-matched artifact while
every configured advisor applies the same real rubric. Confirm findings against
repository evidence and revise and re-review the spec before coding.

## Worker packets

For `optimized` profiles, keep planning, grounding, integration, and final
judgment with the host. Give workers bounded packets containing exact files,
relevant signatures, a reference implementation, acceptance checks, and these
constraints:

- edit only the current worktree;
- create no commit or remote change;
- do not modify files owned by another concurrent packet;
- preserve public contracts and permission boundaries;
- add or update the packet's tests;
- return changed paths and checks run.

Run file-disjoint packets concurrently only up to the profile's configured
limit. Verify each packet immediately and redispatch once with concrete failure
evidence before integrating it manually.

For `high-assurance`, express each packet as a versioned manifest with risk,
allowed paths, invariants, acceptance criteria, dependencies, non-goals, and
reference patterns. Use `packet-run` instead of the raw `worker` operation. The
runtime claims non-overlapping path leases, assigns blind reviewer lenses and
risk-scaled independent families, verifies candidate findings in a fresh
context, and gives verified findings to a separate fixer invocation within
explicit budgets.

After a packet reaches `awaiting_validation`, run trusted acceptance commands
or manual checks outside the model process. Map every criterion to observed
evidence, bind it to the ledger's diff SHA-256, and invoke `packet-gate`. Only a
`gated` packet may be integrated. `packet-release` is an explicit abort/manual
ownership transfer, not a successful result.

## Final review and stage

Build a newline-delimited allowlist of intended spec, production, test,
migration, generated, and documentation paths. Exclude raw reviewer artifacts.
Run the configured validation commands in order and the repository's
integration tests. For `standard` and `optimized`, create a new Claude context
with no inherited planning or implementation transcript and run
`om-code-review` there. For `multi`, `multi-optimized`, and `high-assurance`,
write version 1 validation evidence with the actual command arrays, exit codes,
and observed results. Run `prepare-review --kind implementation` with that
evidence and the allowlist so the subject includes tracked, staged, unstaged,
deleted, and newly created files. Follow the `om-harness` bound
`om-code-review` contract: serialize the new Claude context's matching review
artifact atomically while `review` invokes the configured advisors with the
same packet and allowlist. Start both branches concurrently and pass the
predeclared host path to the runtime.

Invoke every reviewer id in the profile; quorum values only decide whether
enough providers completed. The bundled result contains fresh Claude, Codex,
DeepSeek, Kimi, GLM, and MiMo, all applying `om-code-review`. Reconcile only
after every reviewer terminates, retain unique minority findings, and regenerate
both artifacts after any diff change.

Invoke the harness `stage` command with `START_STATE`; any ref or reflog change,
unexpected staged path, residual untracked file, or diff-check failure blocks
the handoff.
