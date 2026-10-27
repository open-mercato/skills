# Input normalization

Loaded by `om-judge-agent-session` workflow step 1. Normalize one of these input shapes into the evidence model below.

## Harness result

Require a schema-valid result from the repository's eval harness, its bounded generated-file snapshot, the case ID and prompt hash, runner/model versions, the final artifact fingerprint, the controller oracle result, and the declared command/test attestations. The result schema belongs to the repo's harness (see the `om-evolve-harness` skill's `harness.*` config); read it, never guess its shape. Prefer a controller-produced judge-validation artifact when present. Reject evidence whose case, target, or fingerprint does not bind to the source result.

## User-shared session

Accept either a native/sanitized `session.json` plus an artifact directory (`--artifacts`), or a session-share bundle such as the one `om-share-this-session` produces:

- `session.json`
- `generated-files.zip` or an already extracted generated-files directory
- `manifest.json`
- `privacy-report.json`

Validate manifest hashes and privacy status when supplied. Inspect archive entries before extraction; reject absolute paths, `..`, NUL bytes, symlinks, special files, duplicate normalized names, oversized entries, or paths outside a fresh temporary directory. Never extract over the source bundle. Missing hashes or artifacts produce `unavailable` evidence, not a pass.

Read `manifest.stopCause` when present. Normalize an absent or malformed stop cause from an older bundle to `unknown`; never infer successful completion from missing termination evidence.

## Evidence model

Record:

- input kind, schema/bundle version, session or case ID, and source hashes;
- framework/app version and project-rule version;
- bounded changed/generated text files and declared route paths;
- fixed attestations for every required check (`judge.requiredAttestations`, or those the harness result declares — typically generate, typecheck, lint, build, tests, controller oracles, route uniqueness);
- code-review and design-contract review evidence;
- privacy/redaction status and every missing, stale, or unverifiable field;
- termination classification and the bounded sanitized last-entry error summary, if present.

Do not copy raw prompt or transcript bodies into the normalized record. Keep only identifiers, hashes, bounded excerpts needed for a finding, and redacted summaries.
