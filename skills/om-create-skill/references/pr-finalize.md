# PR finalize — the canonical label contract generated skills mirror

`om-create-skill` opens no PRs itself. This file is this skill's own copy of the
label-normalization contract from the canonical PR-finalize procedure of the
pipeline's PR-opening skills (`om-open-pr` and the PR-driving `om-auto-*`
skills), so authored/split skills reuse this contract instead of inventing a
parallel one. Referenced from `references/shared-boilerplate.md`
(Communication contract).

## Label normalization

Apply labels from the config's taxonomy after opening the PR, always through the `apply_label` guard from the tracker descriptor (missing labels degrade to a logged skip; `labels.enabled: false` skips everything — note that in the summary comment). This is the canonical label contract for every PR-opening skill; `om-open-pr` carries the same rules and the two must stay in sync.

- Apply the `review` pipeline label. New PRs always start in `review` unless the run terminated early with an explicit blocker.
- Add `skip-qa` **only** for clearly low-risk non-user-facing changes (docs-only, dependency-only, CI-only, test-only, trivial typos, single-file maintenance).
- Add `needs-qa` when the run touches UI or other user-facing behavior that requires manual exercise.
- Never add both `needs-qa` and `skip-qa`.
- Add additive category labels when they clearly apply: `bug`, `feature`, `refactor`, `security`, `dependencies`, `documentation`.
- Apply exactly one priority label. Infer it from the brief and the diff: outage, data loss, or a security incident → `priority-extreme`; security hardening or a release-blocking regression → `priority-high`; ordinary bug or feature → `priority-medium`; cosmetic, docs, dependency bumps, or cleanup → `priority-low`.
- Apply exactly one risk label. Infer it from the diff: changes to auth, session handling, data scoping, money, DB migrations, or shared contract surfaces, or broad cross-cutting edits → `risk-high`; an ordinary single-area change with tests → `risk-medium`; docs, dependency bumps, test-only, or isolated cleanup → `risk-low`.
- After applying the label set, post **one** consolidated rationale comment covering every applied label — never one comment per label (that spams the PR timeline and multiplies tracker API calls). Labels are still applied individually through the `apply_label` guard; only the commentary consolidates. The comment carries the standard idempotent marker, so a re-run updates it in place.
- When `qaGate` is `true`, a `needs-qa` PR will not be mergeable until QA signs off with `qa-approved`. Do not add `qa-approved` from an authoring skill — it is earned by manual QA or the self-QA exception. State in the PR summary that manual QA is still pending.

Consolidated label-rationale comment — **one** comment listing only the labels you actually applied, each with a one-line reason (drop the segments for labels you did not apply). A generated skill substitutes its own name for `<skill>`:

```
🤖 `<skill>` — 🏷️ label rationale: `review` (ready for code review) · `<category>` ({why this category}) · `needs-qa`|`skip-qa` ({why it needs / can skip manual QA}) · `priority-{level}` ({why this priority}) · `risk-{level}` ({why this risk})
```

## om-create-skill specifics

- A generated PR-opening skill gets its **own** copy of this contract in its
  `references/pr-finalize.md` (adapted to its vars and tracker operations),
  never a pointer into another skill's `references/` — cross-skill invocations
  stay, cross-skill reference-file pointers do not.
