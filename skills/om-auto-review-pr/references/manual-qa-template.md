# Manual-QA instructions comment (step 10)

Post only after approval when `needs-qa` is present without `skip-qa`, routed to
`merge-queue`. Skip when `labels.enabled` is false. This skill requests testing;
it never sets the human-owned `qa` label or grants `qa-approved` from a review.
Keep claim/completion protocol comments, but link the review instead of
repeating its verdict or findings here.

Derive tests from the actual diff and user-visible behavior. Use P0 for
permissions/sessions/data-scoping/money/reliability, P1 for primary UI/features,
and P2 for docs/tooling. Give each distinct check once: setup/route, action,
expected result, and the relevant failure or boundary. Include web cold-load,
loading state, responsiveness, and mobile checks when applicable. Omit empty
priorities. Preserve sufficient detail to execute every required QA check.

Update the same instructions comment on re-runs via **update-comment**; accept
an older comment with the `Manual QA instructions` heading when locating it.

```markdown
## 🧪 Manual QA instructions (`needs-qa`)

Exercise {changed behavior}. {Link to approved review and evidence, if available}.

| Priority | Setup and action | Expected result / boundary |
|----------|------------------|----------------------------|
| P0 | {role, fixture, route, concrete action} | {expected result; permission or isolation check} |
| P1 | {route and concrete action} | {observable outcome and relevant empty/error case} |

QA reviewer: move `merge-queue` → `qa` when starting. All checks pass → replace
`qa` with `merge-queue` and `qa-approved`. A failure → replace `qa` with
`qa-failed` and report the failed action, expected result, and observation.
{When qaGate is true: Required QA approval still gates merge. When false:
needs-qa is advisory in this repository.}
```

Never invent routes, fields, or behavior. For a change that cannot be exercised
manually, state the limitation and the closest observable check. Never include
secrets, tokens, `.env` content, or real credentials.
