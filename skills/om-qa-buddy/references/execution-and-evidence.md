# Execution and evidence conventions

Detailed procedure for step 5 of `om-qa-buddy`: scripted first, exploratory
second.

## Hard rule: UI only

Every mutation during execution goes through the browser UI (clicks, form
fills) — **never** a direct API/fetch call. Bypassing the UI skips
client-side cache updates and produces false results: a state change that
looks correct via a raw API call may not actually render correctly for a
real user. This applies even when hitting an endpoint directly would be
faster.

## Executing scripted cases

- Screenshot before and after each key action, into
  `$ARTIFACTS_DIR/step-NN-<slug>.png` (verify each file is non-empty).
- Update the case's `Status` in `test-plan.md` as you go (Pass / Fail /
  Blocked).
- For a Fail: fill in `Actual` and note the screenshot filename — step 6
  (`references/bug-report-template.md`) needs this next.
- Pre-build any test data the scenario needs (records, accounts, fixtures)
  and capture the real IDs/links so the bug report or verdict can reference
  them precisely.

## UI patterns worth checking on a relevant case

**List views** — pagination and filters persist across navigation and
reload; sorting persists across pagination; a bulk action reports partial
failure per row, not just an overall failure; an empty result set shows a
clean empty state.

**Forms** — validation errors surface inline under the field, not only in a
toast; a 4xx maps to a field-level error, a 5xx to a flash message without
clearing the form; any custom/configurable fields render in the right
section and persist on save.

**Detail pages** — a loading state, not a blank screen; an error state with
a retry, not a silent failure.

Test both surfaces the change touches if it spans more than one (e.g. an
admin console and an end-user-facing app) — auth and session state are
often independent between them.

## Exploratory pass (after every scripted case)

Spend a short pass on the risk areas step 2-3 flagged. Focus on:

- Boundary values: empty input, max length + 1, special characters
  `<>'"%;()&+`, injection-style strings (`' OR '1'='1`).
- Workflow interruptions: back button after submit, double-click submit,
  refresh mid-process, the same page open in two tabs at once.
- The specific hotspot themes matched for this session.

Test from an end-user perspective and cover edge cases, not just the happy
path — both risk areas and edge cases get exercised every session, not only
when time allows.

## Output

`test-plan.md` with every case's final status filled in, `$ARTIFACTS_DIR`
populated with screenshots, and any pre-built test-data IDs recorded. Every
Fail or exploratory finding feeds step 6; the complete set feeds step 7's
verdict report.
