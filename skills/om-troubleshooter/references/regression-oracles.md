# Regression oracles

Load the relevant oracle family before implementing the fix. Use the
repository's own test runner and conventions (Task Router → testing route).

- **Scope:** at least two tenants / organizations (or accounts); permitted,
  denied, null, all-scope, and wildcard cases. An invalid or missing scope
  never widens access.
- **Atomic write:** inject a failure between phases; no partial data and no
  premature event, cache, or index side effect.
- **Locking:** the current update succeeds; a stale update, delete, or action
  returns the repository's structured conflict response and the UI shows the
  conflict.
- **Field:** create, reload, edit, clear to null, reload — request, storage,
  response, and UI agree at every step.
- **Bootstrap:** the same registry or service behavior in every runtime the
  app uses (browser/server, CLI, worker, queue), exercised from a packaged
  install when the failure only shows there.
- **Cache / search:** a read right after a write follows the defined
  consistency; convergence polling has a deadline and no arbitrary sleep.
- **Hydration:** server and client initial output match across representative
  locale, timezone, and environment values.
- **Provider:** duplicate, concurrent, retried, timed-out, and failed-page
  deliveries; idempotency and cursor/mapping state stay correct; no secrets in
  logs or fixtures.

The oracle must fail on the pre-fix code for the intended reason — show that
failure in the report — and clean up its own fixtures.
