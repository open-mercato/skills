# Windows Security-Audit Tooling

## TLDR

Make the collection’s informational skills audit cross-platform without changing its findings policy.

## Scope

Exclusively owns `scripts/audit-skills.sh`, new `scripts/audit-skills.mjs`, and `.github/workflows/skills-audit.yml`.

## Proposed solution

Move authoritative discovery, third-party audit invocation, and result normalization to Node. Keep the shell file as a compatibility wrapper if users call it directly. Run the informational workflow on Ubuntu and Windows with identical fixture expectations.

## Compatibility and failures

Preserve informational/non-blocking CI status, audited skill set, severity/result presentation, and exit conventions. Missing third-party tooling, network failure, and malformed output remain distinguishable; do not turn an unavailable audit into a pass.

## Validation and plan

1.1 Capture golden results for clean, finding, missing-tool, network-error, and malformed-output fixtures.

1.2 Implement Node audit and optional wrapper parity.

1.3 Add Windows/Ubuntu workflow lanes and compare normalized outputs.

## Completion Criteria

- Both OS lanes classify every fixture identically.
- The job remains informational and does not weaken or silently skip findings.
- Existing direct shell entrypoint remains compatible if retained.
