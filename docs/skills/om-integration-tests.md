# om-integration-tests

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Creates and runs integration/E2E tests by exploring the live application with the configured browser provider rather than guessing selectors or flows. It prescribes no environment — it discovers how the repo starts the app, provisions ports, and sets up a test database from the repo itself, and reuses the shared test-env descriptor when one is running. It preserves the repository's own test runners and conventions, and when a run fails it diagnoses each failure from concrete artifacts (screenshots, traces, error context) in a per-test table with a suggested owner. Use it to author new integration tests or to just run existing suites with disciplined failure reporting.

## Parameters

This skill takes no parameters.

## Works with

Attaches to the shared test environment produced by [om-prepare-test-env](om-prepare-test-env.md) (the `<paths.qa>/test-env.json` descriptor), invoking that skill to discover or provision one when none is valid. It reads specs from the repo's design-doc area (e.g. those written via [om-spec-writing](om-spec-writing.md)) or recent changes to decide what to test, and reports failures classified by owner rather than modifying source.

---
*Source: [`skills/om-integration-tests/SKILL.md`](../../skills/om-integration-tests/SKILL.md)*
