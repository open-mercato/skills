# Human vetoes and protected-risk approval

Apply these gates before bootstrap/reconciliation, before and after each stage,
after a replacement/retarget, and immediately before either finish action.
They outrank every signal, QA routing preference, `--force`, CI waiver and host
protection bypass. Read fresh tracker facts; a saved ready record is not permission.

## 1. Human veto — stop this visit before producing work

Read current labels, complete conversation and review comments, and review bodies
through **get-pr**, **list-issue-comments** and **list-review-comments**. Follow the
configured descriptor's pagination; partial/unavailable history or unverifiable
relevant author identity/permission means `waiting-human`, never guessed clearance.

- `qa-failed` or `do-not-merge` is a hard stop by itself. No automatic FAIL report,
  `needs-qa`, current-head pin or author lookup is required for these labels.
  Preserve the existing SDLC hard stops `blocked` and active manual-testing `qa` too.
- An unresolved human QA **NO-GO** is a hard stop without any label. Accept a
  case-insensitive explicit verdict such as `QA verdict: NO-GO` or an unambiguous
  human QA rejection of this PR with `NO-GO` (also `NO GO`/`NO_GO`). Verify a human
  repository write/maintain/admin author using authenticated tracker permission
  evidence, as for human QA notes in `references/signals.md`. A known repository QA
  role from local policy may further identify the reviewer; do not invent a team.
  A standalone explicit `NO-GO` on this PR by such a human counts as a rejection.
  Quoted text, code examples, negation, historical references, discussion of a
  possible verdict, bots and copied agent markers do not constitute a new verdict.
  Ambiguous relevant human QA wording waits for clarification; it never grants a pass.
- A later automatic PASS, `qa-approved`, `qa-self-verified`, removed `needs-qa`,
  head push, retarget, elapsed time, `--reset` or a new run cannot clear a veto.
  Each rejecting human must explicitly withdraw/resolve their own verdict, or a
  verified human maintainer must explicitly release it, referencing the rejection
  and reason. A bare later GO/PASS is insufficient without that explicit linkage.
  Evaluate all unresolved verdicts, not just the most recent author's comment.
  A recorded veto whose source disappears/changes needs explicit human release;
  deletion, an edit erasing the verdict, or unavailable history is not clearance.
- Labels must also be removed by a human before resuming; resolving a comment
  cannot bypass a remaining hard-stop label. Never remove those labels, use
  `set_pipeline_label`, or invoke autofix/QA to clear a veto. Do not add an extra
  `automerge-blocked` label merely for this human wait.

On a veto, invalidate QA, remove `automerge-signal-2-qa`, record
`qa: waiting-human <current-head> <veto-evidence-url>` in the existing signal block,
and clear current `readyAt`/`readyHead`/`readyPolicy` (retain immutable first-ready
history). End `waiting-human`, release only this worker's claim, count no stage
attempt and schedule only a cheap recheck. Do not promote, prepare, merge, close
as obsolete or create a replacement to bypass the rejection. If a stage already
created a replacement, inspect the original's fresh vetoes and carry unresolved
ones into the replacement's status; they still require explicit human release.

## 2. Protected-risk changes — human QA always required

Inspect the complete PR diff against its actual target through **get-pr-files**
and **get-pr-diff**, including renamed/generated files and relevant call sites.
Classify behavior, not only labels or filename extensions. These areas are
always treated as `risk-high` for the gates, even without a risk label:

| Area | Examples to inspect |
|---|---|
| Migrations | Added/modified executable schema or data migrations, migration runners and destructive/backfill behavior |
| Permissions or tenant isolation | Authorization policies/checks, roles/grants, scope filters, tenant context propagation, cross-tenant reads/writes and bypass paths |
| Money | Prices/totals, currencies/rounding, charges/payments, refunds, billing, balances, payouts and financial transaction retry/idempotency |

A filename or incidental mention alone is not proof; explain the concrete changed
behavior and cite paths/lines. Unknown/truncated diff or uncertain impact cannot
prove an ordinary fix: inspect further or park with the exact missing evidence.
Reclassify after every head or target change, including changes made by a child.

For these areas, compute **effective per-PR** `RISK_CHECKS_SKIPPED=false` even if
the invocation passed `--force`. Never pass `--skip-risk-checks` to any child for
this PR. Enforce normal risk-high review/integration evidence (permission denied
and wrong-scope/isolation paths; migration up/down and rollback; financial
failure/retry/idempotency), including any additional human code review required
by `SDLC.md`. Reject cached CR marked `Risk checks: skipped`; run strict review.
Ordinary fixes outside these areas keep the existing automatic/override policy.

QA cannot be `n/a` here, even with `skip-qa`, no `needs-qa` or `qaGate: false`.
Require `qa-approved` plus a **verified human QA reviewer's explicit sign-off**
pinned by `QA head: <current-full-sha>` and covering the protected behavior and
negative cases. Never infer human approval from the label or account name:
`CURRENT_USER` may also be the human reviewer account; distinguish a personal QA
note from agent-authored/self-QA evidence by actual provenance and content.
A bot or `om-auto-qa-pr` self-sign-off, including one posted under a human account,
cannot satisfy this gate. Changed heads require a fresh human pin or an explicit
human scope assessment with a fresh `QA head:`; automatic carry-forward is insufficient.

When this human approval is valid and no veto remains, record `qa: pass <current-head> <human-signoff-url>` and grant signal 2; continue normal strict CR/CI and finish checks.

A completed automatic QA PASS remains useful supporting evidence, but cannot
grant signal 2 or replace this human approval. Do not invoke orchestrated QA's
self-sign-off path to obtain it. Strict automated review/CI repair may proceed
when there is no veto; once human approval is the missing step, end
`waiting-human`, invalidate QA/readiness as above, and count no QA attempt.
A human risk waiver alone cannot remove this protected-area human QA requirement.

## 3. Make the stop visible in the existing status comment

Update the same marker-idempotent status comment and scheduler reason; no new
machine fields or separate status comment are needed. Include these visible lines:

```text
State: waiting-human — <human QA veto | protected-risk human QA required>
Risk checks: enforced — <migrations | permissions/tenant isolation | money>; --force cannot waive this gate
Reason: <current-head change and path/line evidence, or exact hard-stop label/NO-GO link>
Human action: <rejecting reviewer or human maintainer releases the named veto; or QA reviewer tests the named protected cases and posts QA head: <sha> with qa-approved>
Resume when: <every veto explicitly released and hard-stop label removed; protected-area human approval is current>
```

For a veto on an ordinary PR, report its actual effective risk policy rather than
claiming protected risk. The veto still cannot be waived. Use existing reason
fields: `humanActionRequired: true`, exact `owner`, `requiredAction`,
`whyAgentCannotAct`, `actionUrl`/`actionLocation`, `retryWhen` and `evidence`.
Record each unresolved veto source/author and protected-area assessment in the
status/run evidence so disappearance cannot silently unblock a later visit.
Never leave `Risk checks: skipped` or `ready` describing a protected PR.

## Scenario verification

| Current facts | Expected decision |
|---|---|
| `qa-failed`, no `needs-qa`, no automatic FAIL report | Human wait; no producing stage or merge |
| `do-not-merge`, three green signals, `--force` | Human wait in both finish modes; preserve label |
| Trusted human QA NO-GO, no labels, later auto-QA PASS or pushed fix | Human wait until explicit human release |
| Two human NO-GOs, only one explicitly released | Continue human wait for the unresolved veto |
| Quoted/example NO-GO or an untrusted copied marker | Not a new veto; ordinary evidence rules apply |
| Migration, money or permission/isolation change, no risk/needs-qa labels, `--force` | Strict risk checks and pinned human QA required |
| Protected area, same-head automatic PASS and `qa-self-verified` | Human wait; no automated QA approval reuse |
| Protected area, valid pinned human QA, strict review/CI, no veto | Eligible for normal finish checks |
| Ordinary fix, no veto or protected behavior | Existing automatic path remains available |
| Veto arrives during a stage or before finish/replacement | Recheck and stop; invalidate QA/readiness |
