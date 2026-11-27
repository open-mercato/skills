# Category, priority and risk (step 3)

Every triaged PR ends with at least one category label, exactly one priority
label and exactly one risk label. The inference rules match the ones
`om-auto-review-pr` applies at review time, so both skills reach the same
answer on the same diff. When `SDLC.md` names different label sets, use the
project's names.

## Category

| Change, judged from the diff and the conventional title | Category |
|---|---|
| closes a vulnerability, an auth or data-scoping flaw, or a vulnerable dependency | `security` |
| new capability or public API (`feat`) | `feature` |
| incorrect behavior corrected (`fix`) | `bug` |
| refactor, performance, tests, CI, build or chore with no user-visible change | `refactor` |
| dependency bumps | `dependencies` |
| docs only | `documentation` |

One category is the norm. `security` goes next to `bug` or `dependencies`
when the change closes a vulnerability.

- Missing: add the category that fits.
- Present and clearly wrong: keep it, and write in the comment which category
  fits and why. Correcting it is the author's or the reviewer's call.

## Priority (exactly one)

Missing: infer it. An outage, data loss or a security incident is
`priority-extreme`. Security hardening, a release-blocking regression, or a
fix touching auth, sessions, data scoping, money or event reliability is
`priority-high`. An ordinary bug or feature is `priority-medium`. Cosmetics,
docs, dependency bumps and cleanup are `priority-low`.

Present: keep it. Priority is the team's urgency call, not a property of the
diff.

## Risk (exactly one)

Infer it from the diff. Auth, sessions, data scoping, money, migrations or
schema, encryption, event reliability, shared contract surfaces, or broad
cross-cutting edits are `risk-high`. An ordinary single-area change with
tests is `risk-medium`. Docs, dependency bumps, test-only changes, a typo or
an isolated cleanup are `risk-low`.

- Missing: add the inferred label.
- Present and lower than the inference: add the higher label, then remove the
  lower one (one risk label per PR), and say why in the comment.
- Present and higher than the inference: keep it.

Risk describes blast radius. When the project's CI scope file lists a risk
label under `implies`, raising risk also raises the CI level; say so on the CI
line of the comment.
