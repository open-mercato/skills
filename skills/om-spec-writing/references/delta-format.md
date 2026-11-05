# Delta and capability specs (steps 6–7)

A spec describes one change. The **Delta** section says what that change does to
the system's observable behavior, in a form the implementation PR applies to a
living **capability spec** under `${SPECS_DIR}/capabilities/`. The dated spec
stays where it is as the history; the capability file is the current truth.

Write a Delta when the change adds, changes, or removes behavior a user, caller,
or operator can observe. Omit it for refactors, tooling, and docs-only changes.

## Delta section shape

One `### Capability:` block per capability the change touches. A capability is
one independently understandable area of behavior (`checkout`, `issue-triage`),
named by a kebab-case slug that becomes its file name.

```markdown
## 📝 Delta

### Capability: {capability-slug}

#### ADDED Requirement: {Requirement name}
The system SHALL {observable behavior}.

##### Scenario: {Scenario name}
- WHEN {condition}
- THEN {observable outcome}

#### MODIFIED Requirement: {exact existing requirement name}
The system SHALL {the full replacement behavior, not a diff}.

##### Scenario: {Scenario name}
- WHEN {condition}
- THEN {observable outcome}

Frozen by: `{repo-relative path of the characterization test}`

#### REMOVED Requirement: {exact existing requirement name}
Reason: {why the behavior goes, and what replaces it if anything}
Frozen by: `{repo-relative path of the characterization test}`
```

Rules:

- One requirement states one behavior with `SHALL` (or `MUST`), and carries at
  least one `WHEN`/`THEN` scenario. A requirement that cannot be phrased as an
  observable scenario is design detail. Put it in Architecture instead.
- `MODIFIED` and `REMOVED` name the requirement exactly as it appears in the
  capability file. A rename is a `REMOVED` of the old name plus an `ADDED` of the
  new one.
- Before a capability file exists, existing behavior has not been recorded yet.
  A change to it is still `MODIFIED`, because it changes code that ships today,
  and the archive records it as a new requirement.
- Acceptance criteria may point at scenarios instead of repeating them.

## Characterization test (freeze before change)

Every `MODIFIED` and `REMOVED` requirement names in `Frozen by:` the test that
pins today's behavior before anything changes it. In the Implementation Plan
this becomes two steps in the requirement's phase:

1. **Characterize** — add a test that asserts the current behavior, run it green
   on the unchanged code, and commit it alone.
2. **Change** — implement the new behavior and update that same test to the new
   scenarios (`MODIFIED`), or delete it together with the behavior (`REMOVED`).

The test's diff in the PR is then the reviewable record of the behavior change.
When no test can reach the behavior, write `Frozen by: none — {reason}`. The
reviewer reports that line as a Medium finding.

## Archive step

When a spec carries a Delta, the Implementation Plan ends with one more step:
**Archive the Delta** into `${SPECS_DIR}/capabilities/{capability-slug}.md`,
following the capability file shape below. The step runs on the implementation
PR, so the capability file changes when the code that implements it merges and
never before. The spec file itself is not edited.

## Capability file shape

```markdown
# Capability: {capability-slug}

{One sentence: what this capability lets whom do.}

## Requirement: {Requirement name}
The system SHALL {observable behavior}.

### Scenario: {Scenario name}
- WHEN {condition}
- THEN {observable outcome}

Source: {spec path}
```
