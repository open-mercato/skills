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
optional user-local overlay named by `OM_AGENT_HARNESS_CONFIG`. For `standard`
with no `agentHarness` section, skip `validate-config` and `probe` — no
external model is used. Otherwise validate and
probe the requested profile before implementation. Never execute adapter
settings from the task branch.

Immediately after `probe`, render its JSON as a readiness table and show it to
the user before any model is invoked — one row per selected model with its id,
requested binding, role, and status: ✅ for `ready`, 🟥 for `missing` or
`failed` with the probe note appended (same format as the staged issue
workflow). Include the table in the run report. Proceed only when every row the
profile requires is ✅; otherwise follow the reroute above.

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
`multi-optimized`, and `high-assurance`, run `prepare-review --kind spec`
against the exact spec (including acceptance criteria and relevant nested
instruction paths) and execute the bound council exactly as the `om-harness`
`references/code-review-contract.md` defines it. Confirm findings against
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

For `high-assurance`, express each packet as a versioned manifest and follow
the packet lifecycle exactly as the `om-harness`
`references/packet-contract.md` defines it: `packet-run` instead of the raw
`worker` operation, trusted gate evidence bound to the ledger's diff SHA-256,
`packet-gate` before integration, and `packet-release` only as an explicit
abort. Only a `gated` packet may be integrated.

## Final review and stage

Build a newline-delimited allowlist of intended spec, production, test,
migration, generated, and documentation paths. Exclude raw reviewer artifacts.
Run the configured validation commands in order and the repository's
integration tests. For `standard` and `optimized`, create a new Claude context
with no inherited planning or implementation transcript and run
`om-code-review` there. For `multi`, `multi-optimized`, and `high-assurance`,
write version 1 validation evidence with the actual command arrays, exit codes,
and observed results, run `prepare-review --kind implementation` with that
evidence and the allowlist so the subject includes tracked, staged, unstaged,
deleted, and newly created files, and execute the bound council per the
`om-harness` `references/code-review-contract.md`. Regenerate both artifacts
after any diff change, and bound the fix-and-re-review loop at three
iterations before stopping with the surviving findings.

Invoke the harness `stage` command with `START_STATE`; any ref or reflog change,
unexpected staged path, residual untracked file, or diff-check failure blocks
the handoff.
