# Human vetoes and protected-risk approval

Apply these gates before bootstrap/reconciliation, before and after each stage,
after a replacement/retarget, and immediately before either finish action.
They outrank every signal, QA routing preference, `--force`, CI waiver and host
protection bypass. Read fresh tracker facts; a saved ready record is not permission.

## Gate map

Every gate that can stop or hold an automerge PR is listed here, so a team
adapting this skill starts in one place. The detail lives where noted.

| Gate | Holds the PR when | Defined in |
|---|---|---|
| Human veto | `qa-failed`, `do-not-merge` or an unresolved human QA NO-GO | Section 1 |
| Protected areas | Migrations, money, permissions or tenant isolation, architecture, backward-incompatible changes | Section 2 |
| Human-only by policy | A configured label or author | Section 2b |
| Independent review | Required native approval is missing | `references/independent-review.md` |
| QA routing | Required approval is missing or coverage has gaps | `references/qa-routing.md` |
| Risk override limits | What `--force` and `automerge-force` may skip | `references/risk-override.md` |
| CI | A check is failing or pending; proved baseline waivers | `references/signals.md`, `references/ci-baseline.md` |
| Off switch | The queue label is gone or `automerge-blocked` is set; only a verified approval-only buddy block permits cheap CI recovery | `SKILL.md` rules, `references/ci-approval.md` |

To adapt the areas to another product, edit the area table in section 2 and
the configuration in section 2b. Keep the stop and release rules unchanged.

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

## 2. Protected-risk changes — human approval always required

Inspect the complete PR diff against its actual target through **get-pr-files**
and **get-pr-diff**, including renamed/generated files and relevant call sites.
Classify behavior, not only labels or filename extensions. These areas are
always treated as `risk-high` for the gates, even without a risk label:

| Area | Examples to inspect |
|---|---|
| Migrations | Migrations that rewrite, delete, backfill or move existing rows, or drop or rename columns and tables, plus changes to migration runners. An additive migration (new table, new nullable column, new index) with up/down evidence is not protected |
| Permissions or tenant isolation | Changes that widen or remove access control: a new or loosened authorization check, a grant or feature given by default, a new cross-tenant or cross-organization read or write path, a removed or bypassed scope filter, changed tenant context propagation |
| Money | Changes to how amounts are computed or moved: prices and totals, currencies and rounding, charges and payments, refunds, billing, balances, payouts, financial retry and idempotency. Labels, display formatting and hiding amounts from a role are not money changes |
| Architecture changes | Substantive changes to service/module boundaries, persistence or state ownership, execution/deployment topology, shared extension contracts, or cross-component communication and dependency direction. New code or refactors inside one module's existing boundaries are not |
| Backward-incompatible changes | Removing, renaming or changing the shape of published APIs/events, CLI flags, config/serialized formats, persisted data contracts or supported integrations, or changing documented successful behavior. A new refusal for input that was already invalid, a bound on pagination or size, or stricter validation of malformed input is not backward-incompatible |

A local behavior-preserving refactor within existing boundaries is not an
architecture change by itself. An additive API is not backward-incompatible
unless existing consumers or supported behavior stop working. Read the repo's
architecture/design decisions, public contracts and `BACKWARD_COMPATIBILITY.md`
when present; inspect affected consumers rather than trusting a PR title, label
or an author's assertion that the change is compatible.

**Tightening is not widening.** A change that only narrows what is allowed
(fails closed, scopes a read further, rejects more input, removes data from a
response) is not protected on that ground. It stays on the automatic route with
strict review and complex QA that must include the negative cases (wrong tenant,
wrong organization, missing feature, malformed input). When it is unclear whether
a change widens or narrows access, treat it as protected.

A filename or incidental mention alone is not proof; explain the concrete changed
behavior and cite paths/lines. Unknown/truncated diff or uncertain impact cannot
prove an ordinary fix: inspect further or park with the exact missing evidence.
Reclassify after every head or target change, including changes made by a child.

For these areas, compute **effective per-PR** `RISK_CHECKS_SKIPPED=false` even if
the invocation passed `--force`. Never pass `--skip-risk-checks` to any child for
this PR. Enforce normal risk-high review/integration evidence (permission denied
and wrong-scope/isolation paths; migration up/down and rollback; financial
failure/retry/idempotency; architecture boundaries and affected consumers;
compatibility bridges/migration and existing consumers), including any additional human code review required
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

**Evidence-review sign-off.** A verified human QA reviewer may sign off by
reviewing a completed `om-auto-qa-pr` PASS on the current head that covers the
protected behavior and its negative cases, and by personally re-running at least
one negative case. The note names the reviewed evidence and the re-run case and
carries `QA head:`. It is a human sign-off and satisfies this gate; the automatic
PASS alone still does not.

**Clean backports.** A PR targeting a release branch inherits the human QA
sign-off and any technical approval of its origin PR when the origin is merged
into the default branch with that approval, and the backport carries the same
changes apart from clean context differences. Record the origin PR and the
inherited sign-off URLs. Conflict resolutions, extra commits or differing hunks
need fresh human QA for those hunks.

### Additional architecture and compatibility decision

For architecture or backward-incompatible changes, require **explicit human
technical approval** from a verified repository maintainer or designated
technical/architecture owner, even when independent native review is disabled.
Accept a current-head native approval or an explicit human approval note; in
either case the evidence must name the full current head SHA, the affected architecture/contracts, the decision and
its consequences. A bot, agent-authored approval, `--force`, automatic QA PASS
or `qa-approved` alone cannot satisfy this decision. Preserve the pinned human
QA requirement above as well; the same qualified human may provide both only
when their evidence explicitly covers both technical approval and actual QA.

For backward-incompatible changes, document who/what breaks and verify the
repository's required deprecation, compatibility bridge, versioning/migration,
consumer testing and rollout/rollback path. Human technical approval must
explicitly accept those consequences and that path. A missing required
compatibility path remains a blocker under `BACKWARD_COMPATIBILITY.md` and
`om-code-review`; no human QA note, risk waiver or merge bypass cancels it.
When no compatibility policy exists, require a documented transition plan and
explicit maintainer acceptance rather than silently permitting the break.
A changed head or target requires fresh applicable human approval/assessment;
never automatically carry a technical decision to a new revision or target,
except a clean backport as defined in section 2.

Missing technical approval or required compatibility evidence ends
`waiting-human`, invalidates QA/current readiness and removes the QA signal as
above; do not run self-sign-off or repeatedly count attempts. Retain useful
automatic review/test evidence. Name the exact decision owner, changed boundary
or broken contract, missing path and required approval in the status comment.

When **all applicable human approvals** are valid and no veto remains, record `qa: pass <current-head> <human-signoff-url>` and grant signal 2; continue normal strict CR/CI and finish checks.

A completed automatic QA PASS remains useful supporting evidence, but cannot
grant signal 2 or replace this human approval. Do not invoke orchestrated QA's
self-sign-off path to obtain it. Strict automated review/CI repair may proceed
when there is no veto; once human approval is the missing step, end
`waiting-human`, invalidate QA/readiness as above, and count no QA attempt.
A human risk waiver alone cannot remove these protected-area human approval requirements.

## 2b. Human-only work by policy

Some work needs a human tester although the diff alone does not show it, such
as new features or UX changes. Two configuration keys name it:

- `automerge.humanOnlyLabels` (default `[]`): a PR carrying any of these labels.
- `automerge.humanOnlyAuthors` (default `[]`): a PR authored by one of these
  logins, compared case-insensitively, for example a design owner whose fixes
  are UX changes by nature.

Such a PR follows section 2's human QA rule: QA cannot be `n/a`, an automatic
PASS and `qa-self-verified` are supporting evidence only, and it needs
`qa-approved` with a pinned `QA head:` human sign-off. `--force` and
`automerge-force` cannot waive it. It needs no technical approval unless
section 2 also applies. Record `human-only: <label | author>` in the status
reason. Read labels fresh on every visit; removing the label returns the PR to
the ordinary route, while an author entry applies for as long as it is configured.

## 3. Make the stop visible in the existing status comment

Update the same marker-idempotent status comment and scheduler reason; no new
machine fields or separate status comment are needed. Use the two bold opening
lines from `references/report-templates.md`: what happened and the exact human
action/owner next. Keep the following supporting fields in its evidence/policy
details; never hide the missing human action only in collapsed content:

```text
State: waiting-human — <human QA veto | protected-risk human QA or technical approval required>
Risk checks: enforced — <migrations | permissions/tenant isolation | money | architecture | backward incompatibility>; --force cannot waive this gate
Reason: <current-head change and path/line evidence, or exact hard-stop label/NO-GO link>
Human action: <rejecting reviewer or human maintainer releases the named veto; or QA reviewer tests the named protected cases and posts QA head: <sha> with qa-approved; architecture/compatibility owner explicitly approves the current-head decision and required transition path>
Resume when: <every veto explicitly released and hard-stop label removed; all applicable protected-area human approvals and compatibility requirements are current>
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
| Protected area, all applicable pinned human QA/technical approvals and compatibility evidence, strict review/CI, no veto | Eligible for normal finish checks |
| Architecture change, automatic CR/QA PASS, independent review disabled | Human QA and explicit current-head technical/architecture-owner approval required |
| Breaking public contract, `--force`, human QA PASS, missing required deprecation/migration path | Continue human wait; compatibility blocker cannot be waived by QA |
| Architecture/compatibility change, all pinned human approvals and required compatibility evidence, no veto | Eligible for normal strict CR/CI and finish checks |
| Ordinary fix, no veto or protected behavior | Existing automatic path remains available |
| Fail-closed tightening of a scope or permission check, negative cases covered by complex QA | Automatic path; no personal human QA |
| New 409 or validation error for input that was already invalid | Not backward-incompatible; no technical approval |
| Additive nullable column migration with up/down evidence | Not protected on migration grounds |
| Protected area, automatic PASS covering negative cases, human reviewed it and re-ran one negative case with `QA head:` | Human gate satisfied |
| Clean backport of a merged origin with human sign-off | Inherits the origin's sign-off; record both URLs |
| Backport with conflict resolution in a protected area | Fresh human QA for the resolved hunks |
| Veto arrives during a stage or before finish/replacement | Recheck and stop; invalidate QA/readiness |
