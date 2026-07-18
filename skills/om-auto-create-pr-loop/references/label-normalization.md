# Label normalization (step 10)

The full label taxonomy `om-auto-create-pr-loop` applies in step 10 after opening
the PR, plus the suggested per-label comment strings. Every mutation goes through
the `apply_label` guard from the tracker descriptor (missing labels degrade to a
logged skip; `labels.enabled: false` skips everything — note that in the summary
comment).

- Apply the `review` pipeline label. New PRs from this skill always start in `review` unless the run terminated early with an explicit blocker.
- Add `skip-qa` **only** for clearly low-risk non-user-facing changes (docs-only, dependency-only, CI-only, test-only, trivial typos, single-file maintenance).
- Add `needs-qa` when the run touches UI or other user-facing behavior that requires manual exercise.
- Never add both `needs-qa` and `skip-qa`.
- Add additive category labels when they clearly apply: `bug`, `feature`, `refactor`, `security`, `dependencies`, `documentation`.
- Apply exactly one priority label. Infer it from the brief and the diff: outage, data loss, or a security incident → `priority-extreme`; security hardening or a release-blocking regression → `priority-high`; ordinary bug or feature → `priority-medium`; cosmetic, docs, dependency bumps, or cleanup → `priority-low`. Never open the PR without a priority.
- Apply exactly one risk label. Infer it from the diff: changes to auth, session handling, data scoping, money, DB migrations, or shared contract surfaces, or broad cross-cutting edits → `risk-high`; an ordinary single-area change with tests → `risk-medium`; docs, dependency bumps, test-only, or isolated cleanup → `risk-low`. Never open the PR without a risk label.
- After each applied label, post a short PR comment explaining why.
- When `qaGate` is `true`, a `needs-qa` PR will not be mergeable until QA signs off with `qa-approved`. Do not add `qa-approved` from this skill — it is earned by manual QA or the self-QA exception. State in the PR summary that manual QA is still pending.

Suggested label comments:

- `review`: `🏷️ Label set to \`review\` because the PR is ready for code review.`
- `skip-qa`: `🏷️ Label set to \`skip-qa\` because this is a docs-only / low-risk change.`
- `needs-qa`: `🏷️ Label set to \`needs-qa\` because this touches {area} and must be manually exercised.`
- `priority-*`: `🏷️ Priority set to \`priority-{level}\` because {one-line rationale}.`
- `risk-*`: `🏷️ Risk set to \`risk-{level}\` because {one-line rationale}.`
