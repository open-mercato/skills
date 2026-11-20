# Entrance state reconciliation

Resolve the live item policy before applying `references/human-gates.md`. Human vetoes stop work. Protected-area approvals apply under ordinary policy. For the exact two-label pair, follow `references/automerge-now.md` and publish the notice before producing stages.

Resolve fresh per-item mode/risk inputs under `references/item-policy.md`, then apply protected gates to the effective risk request. Reconcile changed policy even on unchanged heads.

Apply this on every PR visit before checking continued value or producing stages.

2. **Read state** — **get-pr** (head SHA, base, title, labels, reviews, mergeability, draft) and the status comment's signal record. Reconcile each signal at the entrance against its real source evidence and the exact delta since that evidence, even when signal labels are already present (`references/reconcile.md`). Inspect the actual changes and tested behavior, decide retain/carry-forward/delta-review/retest/current-head-CI per signal, and record evidence revisions, scope judgment and next actions before any producing stage. Recompute the independent-review requirement from current config/CLI and fresh native evidence (`references/independent-review.md`), never saved policy. Update the same status comment’s concrete reason/action/owner/retry condition each visit, including changed facts under unchanged outcomes (`references/scheduler.md`). Revalidate target, risk mode, labels, approvals and checks even on an unchanged head, using `references/signals.md`. Invalidate records with a missing or changed target, revoked evidence, or a mismatched head. **No record yet** (first visit) → bootstrap it from the PR's real state — labels, reviews and comments, CI checks — and record every signal that already holds, so the ladder starts at the first one still missing (`references/signals.md` → Bootstrap).

Also apply `references/qa-verdicts.md` §1 on every visit: a human `qa-approved` or `qa-failed` drops `needs-qa`, and this skill makes that label change itself.
