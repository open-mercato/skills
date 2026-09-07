# Verdict submission, label transitions, and author handoff

Detailed procedure for step 10 of `om-auto-review-pr`. The authoritative label invariants also live in the skill's **Rules** section; this file is the step-by-step mechanics.

## Submit the verdict

Submit the review via the tracker operation **review-pr**: verdict approve when approved; verdict request changes on any blocker, or any major without a documented waiver.

Post the concise `om-code-review` report as the authoritative review body.
Keep Verdict, Summary, severity fields, every actionable finding, and the
per-command Validation Gate table. Direction/scope questions remain separate
from verified defects. Omit empty sections and passing checklists. A re-review
leads with the delta and the disposition of earlier findings; later comments
link the review rather than reproducing it.

## Label mechanics

Every label mutation goes through the label guards from the tracker descriptor: additions via `apply_label` (missing labels degrade to a logged skip), removals only when `LABELS_ENABLED` is `true`. When `labels.enabled` is `false`, skip every label operation in this step and say so in the completion comment and report.

Pipeline labels: `review`, `changes-requested`, `qa`, `qa-failed`, `merge-queue`, `blocked`, `do-not-merge`.

Keep `in-progress` separate from the pipeline-state helper. It is a lock, not a workflow state.

Pipeline-label transitions go through the `set_pipeline_label` helper (usage: `set_pipeline_label <prNumber> <newLabel>`), one of the label guards from the tracker descriptor — do not redefine it here; its exact behavior is in `references/label-transitions.md`. Every applied label has one concise sentence in the single consolidated `🏷️ label rationale` comment, updated in place via **update-comment** — never repeat the label set in other reports or add a comment per change (template: `references/label-transitions.md`).

Label rules:

- If the PR has no pipeline label when review starts, set `review` before continuing so the state machine is explicit.
- If the verdict is changes requested, set `changes-requested`.
- If the verdict is approved, set `merge-queue` — both when the PR requires QA (`needs-qa` present, no `skip-qa`) and when it does not. Keep `needs-qa` in place when present; when `qaGate` is on, the QA-approval gate blocks the actual merge until a QA reviewer adds `qa-approved`. When `qaGate` is off, `needs-qa` is advisory only.
- **Never set the `qa` pipeline label from this skill.** `qa` means "manual QA is in progress" and is applied **manually by a QA reviewer** when they pick the PR up to test it. This skill only requests QA with the `needs-qa` meta label; it never sets, moves to, or removes `qa`.
- **Never apply `qa-approved` based on reading the diff** — code-review approval is not QA approval. `qa-approved` is earned only by manual QA (by a QA reviewer, or by an engineer via the self-QA exception). Until it lands, a `needs-qa` PR sits in `merge-queue` blocked by the QA-approval gate whenever `qaGate` is on.
- Never leave `review`, `changes-requested`, `qa`, `qa-failed`, and `merge-queue` on the same PR together.

Priority and risk labels (always ensure exactly one of each, when labels are enabled): infer and apply one when missing, keep the existing one unless the review shows it is clearly mis-rated, and remove the siblings when changing it. The full priority/risk inference rules and the suggested comment strings for every label live in `references/label-transitions.md`.

## Author handoff on `changes-requested`

When the verdict is `changes-requested`, reassign the PR back to the original PR author after the review and pipeline label are posted, unless the author is the current reviewer, a bot account, or otherwise unavailable.

Flow — `PR_AUTHOR` is the author login already captured by the step 2 **get-pr** (the author does not change between steps); no re-fetch is needed. If `PR_AUTHOR` is non-empty and differs from `$CURRENT_USER`:

1. **unassign-pr**: remove `$CURRENT_USER` from `{prNumber}`'s assignees.
2. **assign-pr**: add `$PR_AUTHOR` as the assignee.
3. Post the handoff comment via **comment-pr** (preserving multi-line formatting):

```markdown
@{PR_AUTHOR}, {concrete change needed; link the review}. Push the update and re-request review.
```

Rules:

- Do this for every `changes-requested` outcome, including verdicts driven by merge conflicts or failing required checks and the duplicate/already-merged early exit.
- If the author cannot be assigned (bot/deleted account/permission issue), keep the current assignee and leave the same handoff comment without the reassignment claim.
- Keep the handoff separate from a label-rationale comment when both are needed; link the findings rather than repeating them.
