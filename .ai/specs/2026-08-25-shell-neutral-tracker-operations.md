# Shell-Neutral Tracker Operations

## TLDR

Rewrite tracker descriptors as one ordered operation model using direct client argv and structured files.

## Dependency and scope

Depends on config/setup. Owns tracker template, shipped GitHub descriptor, repo `.ai/trackers/github.md`, tracker sections of `BACKWARD_COMPATIBILITY.md`, and mock contract tests.

## Proposed solution

For every operation/guard, specify inputs, ordered invocations, parsed result, postcondition, failure, and cleanup. Preserve names/outputs. GitHub uses direct `gh` argv and temporary body/evidence files. Old customized descriptors are never silently overwritten.

## Validation and plan

1.1 Inventory all routes/postconditions. 1.2 update all three descriptors together. 1.3 mock every auth/read/search/claim/PR/comment/label/handback/error/cleanup route on Ubuntu/Windows with exact argv assertions.

## Completion Criteria

- Every named route has cross-OS evidence.
- Multiline/untrusted data is file-backed and never evaluated.
- Names, outputs, idempotency, and legacy safety remain compatible.
