# 🧪 QA

The pipeline lets you boot the app once and reuse it for everything: UI verification of a PR in a real browser, and integration/E2E tests written against the live app with real locators. QA skills never modify source — they explore, capture screenshots, and report a verdict. The QA gate is yours: automated skills request QA (`needs-qa`); a human grants it (`qa-approved`). The one exception is a documented self-QA sign-off on a fully-green run, opted into explicitly.

← Back to the [README](../../README.md#-workflows-by-role)

## Skills you'll use

| Skill | When | Example call | What you get |
|---|---|---|---|
| `om-prepare-test-env` | Boot the app for QA/tests | `/om-prepare-test-env` | a reusable booted app + shared test-env descriptor the other skills reuse |
| `om-auto-verify-pr-ui` | QA a PR's UI (evidence only) | `/om-auto-verify-pr-ui 123` | screenshots + a pass/fail report on the PR; no labels changed |
| `om-auto-verify-pr-ui` | Sign off your own green run | `/om-auto-verify-pr-ui 123 --self-qa-signoff` | `qa-approved` + `qa-self-verified` when fully green with screenshots on a `needs-qa` PR |
| `om-auto-verify-pr-ui` | Flag a broken UI | `/om-auto-verify-pr-ui 123 --apply-failure` | `qa-failed` applied with a comment on why |
| `om-integration-tests` | Add or run E2E coverage | `/om-integration-tests` | integration/E2E tests against the live app, with artifact-based failure diagnosis |

## What happens automatically

- **Shared test env** — `om-auto-verify-pr-ui` and `om-integration-tests` reuse the same booted app from `om-prepare-test-env` instead of each spinning up their own.
- **Browser provider provisioned** — the configured provider (agent-browser by default; Playwright supported) is set up autonomously.
- **Evidence posted** — screenshots + a pass/fail report land as a PR comment via the tracker's image-evidence op (or saved locally when no tracker).
- **Labels stay untouched by default** — verification changes no labels unless you pass a sign-off/failure flag.
- **Native runners preserved** — integration tests respect the repo's own test runner; real locators and runtime fixtures, no hardcoded IDs.

## Tips

- `qa-approved` is **human-owned** — the QA gate blocks merge until a person adds it, no matter how green the checks are.
- `--self-qa-signoff` is the only path to an automated `qa-approved` (+ `qa-self-verified`), and only when the run is fully green **AND** screenshots were attached **AND** the PR carries `needs-qa` without `skip-qa`. Never sign off a partial or environment-limited run.
- Use `--apply-failure` to mark `qa-failed` when the UI is broken; it never combines with `qa-approved`.
- Run `/om-prepare-test-env` once at the start of a QA session — the other skills warm-reuse it, which is much faster than re-booting per PR.
- Integration tests explore the running app first for real selectors — boot the env before writing them so `om-integration-tests` sees live locators.
