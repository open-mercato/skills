# Pipeline-label mechanics, priority/risk inference, and comment text (step 10)

The detailed label machinery `om-auto-review-pr` uses in step 10 once the verdict
is known. The body keeps the core verdict→label decisions and the QA safety
rules; this file holds the `set_pipeline_label` helper's behavior, the
priority/risk inference rules, and the suggested comment strings.

## The `set_pipeline_label` helper

Pipeline-label transitions go through the `set_pipeline_label` helper (usage: `set_pipeline_label <prNumber> <newLabel>`), which is one of the label guards from the tracker descriptor — do not redefine it here. It operates over the pipeline group:

```bash
PIPELINE_LABELS="review changes-requested qa qa-failed merge-queue blocked do-not-merge"
```

When `LABELS_ENABLED` is not `true`, the guard skips the pipeline label change (log that labels are disabled in config).

The helper:

- adds `newLabel`
- removes every other pipeline label from the list above
- preserves category labels (`bug`, `feature`, `refactor`, `security`, `dependencies`, `documentation`), meta labels (`needs-qa`, `skip-qa`, `qa-approved`, `qa-self-verified`, `in-progress`), priority labels (`priority-low`, `priority-medium`, `priority-high`, `priority-extreme`), and risk labels (`risk-low`, `risk-medium`, `risk-high`)

After every pipeline-label change, post a short PR comment explaining why that label was chosen. Keep it to one short sentence.

## Priority label (always ensure exactly one, when labels are enabled)

- If the PR carries no priority label, infer one from the diff and the linked issue, apply it through the guard, then post a one-line comment naming the chosen priority and why. Inference rule: outage, data loss, or a security incident → `priority-extreme`; security hardening, a release-blocking regression, or fixes touching auth/session/data-scoping/money/event-reliability → `priority-high`; ordinary bug or feature → `priority-medium`; cosmetic, docs, dependency bumps, or cleanup → `priority-low`.
- If the PR already has a priority label, keep it unless the review reveals the scope is clearly mis-rated (e.g. a "cleanup" PR that actually touches auth) — then adjust it and explain why in the comment.
- Priority is mutually exclusive: when changing it, remove the other three priority labels.

## Risk label (always ensure exactly one, when labels are enabled)

- If the PR carries no risk label, infer one from the diff and the linked issue, apply it through the guard, then post a one-line comment naming the chosen risk and why. Inference rule: auth/session/data scoping/money, migrations or schema, encryption, event reliability, shared contract surfaces, or broad cross-cutting edits → `risk-high`; ordinary single-area change with tests → `risk-medium`; docs, dependency bumps, test-only, typo, or isolated cleanup → `risk-low`.
- If the PR already has a risk label, keep it unless the review reveals the scope is clearly mis-rated (e.g. a "docs" PR that actually changes a migration) — then adjust it and explain why in the comment. A `risk-high` rating reinforces the case for `needs-qa` and deeper review even when the PR would otherwise look routine.
- Risk is mutually exclusive: when changing it, remove the other two risk labels.

## Suggested label comments

- `review`: `🏷️ Label set to \`review\` because this PR is ready for code review.`
- `changes-requested`: `🏷️ Label set to \`changes-requested\` because review found actionable issues.`
- `merge-queue` (QA still required): `🏷️ Label set to \`merge-queue\` because code review passed; \`needs-qa\` stays on so the QA-approval gate holds the merge until a QA reviewer adds \`qa-approved\`.`
- `merge-queue` (no QA required): `🏷️ Label set to \`merge-queue\` because the required review gates passed and QA is not required (or \`qa-approved\` is already present).`
- `blocked`: `🏷️ Label set to \`blocked\` because progress depends on an external blocker.`
- `do-not-merge`: `🏷️ Label set to \`do-not-merge\` because this PR should not merge yet.`
- `priority-*`: `🏷️ Priority set to \`priority-{level}\` because {one-line rationale}.`
- `risk-*`: `🏷️ Risk set to \`risk-{level}\` because {one-line rationale}.`
