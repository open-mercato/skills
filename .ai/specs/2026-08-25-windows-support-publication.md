# Windows Support Publication

## TLDR

Publish the compatibility matrix only after the single shell-neutral runtime and tooling implementations have supplied green evidence.

## Dependencies and scope

Depends on completion of the other sixteen roadmap specs and green required Ubuntu/Windows workflows. Exclusively owns `README.md` support-matrix and release-facing compatibility wording; it does not change runtime behavior, contracts, or CI.

## Proposed solution

Collect immutable workflow links and tested prerequisites, then document the same shell-neutral agent contract on macOS, Linux, and Windows. Name Git and tracker prerequisites; clarify that Node is required by this repository’s tools, not installed skills. Document legacy shell-entrypoint limitations separately rather than creating runtime support branches.

## Failure behavior

If any child spec is incomplete, a required lane is optional/failing, or native evidence invokes Bash, stop publication and list the missing evidence. Documentation cannot waive a failed route.

## Validation and plan

1.1 Build an evidence table mapping every support claim to required workflow/scenario results.

1.2 Update README wording only after the table is complete and green.

1.3 Check links, terminology, prerequisite boundaries, and consistency with `DECISIONS.md`, `SDLC.md`, and the roadmap; run repository lint.

## Completion Criteria

- Every published environment claim has current native evidence for every promised route.
- Prerequisites and limited/unsupported shells are explicit.
- Documentation makes no broader claim than CI proves.
