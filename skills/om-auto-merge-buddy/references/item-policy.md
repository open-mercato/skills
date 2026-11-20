# Per-item queue policy

An open PR is authorized by the configured `AUTOMERGE_LABEL` or the exact
`automerge-now` label. Discover the union of both queues and deduplicate by PR
number. Removing both authorization labels stops the visit, including with
`--pr`. `automerge-force` and `automerge-prepare` require queue authorization.
All three policy labels are exact and case-sensitive. Operators apply them
with trusted queue-management access. Create the optional labels in the tracker
before use. Their names are independent of a custom queue label.

## Resolve each item afresh

Resolve the invocation mode from config/CLI using
`references/independent-review.md`. Keep that immutable baseline separate from
the effective per-item mode. At admission, entrance, before and after each stage,
after replacement, and immediately before either finish action, read current
labels through **get-pr** and resolve:

| Current modifiers | Effective item policy |
|---|---|
| Neither | Invocation mode and explicit risk flags only |
| `automerge-now` | Authorize queue intake and immediate processing by either fixer; apply ordinary approval policy |
| `automerge-force` | Apply the risk-only override to an authorized PR; invocation mode unchanged |
| `automerge-now` + `automerge-force` | Use the automation-only approval policy in `references/automerge-now.md` |
| `automerge-prepare` | Override config and CLI merge mode to `prepare-to-merge`; never merge this PR |
| Any labels with `automerge-prepare` | Apply the selected approval policy to preparation; remain prepare-only |

`automerge-prepare` is the per-item prepare mode, mapped to the existing
`prepare-to-merge` value. It does not introduce an `automerge-prepare` CLI mode.
In a globally prepare-only run, force never opts an item into merging.

The buddy’s `--skip-risk-checks` is an alias for its existing risk-only
`--force`; accepting both is idempotent. Apply explicit vetoes under `references/human-gates.md` in both policies.
Classify protected areas and enforce their risk checks under ordinary policy.
Skip classification only for the exact `automerge-now` + `automerge-force` pair.
Claims, explicit vetoes, automated code review, applicable auto-QA, actual CI
evidence and head/target guards still apply.
Only children’s documented `--skip-risk-checks --orchestrated` is forwarded;
never child `--force`, which means claim takeover.

Recompute in each worker from fresh inputs; never mutate invocation defaults or
share a mutable effective policy between workers. Incomplete or failed label reads
stop the visit before producing work or merging. Never use saved scheduler,
status, signal, handoff or dashboard policy as authority. Removing force with
no CLI risk flag requires strict CR reconciliation, including unchanged heads;
removing prepare restores current invocation mode only after full finish
revalidation. Newly added prepare prevents the next merge; a label-only change
must not reuse cached readiness. Loss of either member of the pair restores
ordinary gates and invalidates policy-dependent signals on the same head.
Keep the fresh label read adjacent to the guarded merge mutation.

## Audit and replacement

In the existing status comment and local run/handoff/policy checkpoint record
effective mode, source (`config`, `cli`, `default`, or `label automerge-prepare`),
current modifier labels, risk request source, protected-gate enforcement, head
and assessment time. Use the existing `Risk checks: skipped` / `enforced` shape
in `references/risk-override.md`; keep all parsed signal and `RESULT:` fields
unchanged. Preserve independent-review source separately. A policy change
invalidates cached policy readiness before recalculating `readyAt`.

On a credited fork replacement, re-read the original’s queue and modifiers at
transfer. Preserve a currently present `automerge-prepare` restriction on the
replacement via `apply_label`, verify it through **get-pr**, and block merging
if transfer cannot be verified. Never re-create a modifier removed by a human.
Transfer `automerge-force` only when still present on the original at transfer,
using the same guard/readback; if its transfer fails, continue with strict risk
checks and disclose it. Preserve existing replacement restrictions. Copy
`automerge-now` only from fresh original labels and verify it on the
replacement, just like the configured queue label. Never
create an automation-only pair by combining a lone modifier on the original
with a lone modifier on the replacement. Halt the transfer for explicit
authorization if the label union would create a new pair. Re-resolve
from the replacement’s actual labels; never reuse the old worker’s effective
values or turn a failed force-label write into an implicit CLI override.

The following decision function consumes normalized fresh label names and an
already validated invocation policy. Supply `protectedArea` from actual diff
classification only under ordinary policy. Missing queue authorization yields no stage flags.

```javascript
function resolveAutomergeItemPolicy({ labels, queueLabel = 'automerge', mode = 'prepare-and-merge', force = false, skipRiskChecks = false, protectedArea = false, requireIndependentReview = false }) {
  if (!Array.isArray(labels) || labels.some(label => typeof label !== 'string')) throw new Error('Incomplete label read')
  if (!['prepare-to-merge', 'prepare-and-merge'].includes(mode)) throw new Error('Invalid invocation mode')
  const immediate = labels.includes('automerge-now')
  const authorized = labels.includes(queueLabel) || immediate
  const prepare = labels.includes('automerge-prepare')
  const forced = labels.includes('automerge-force')
  const riskRequested = force || skipRiskChecks || forced
  const automationOnly = immediate && forced
  const riskChecksSkipped = authorized && riskRequested && (!protectedArea || automationOnly)
  return {
    authorized,
    immediate,
    automationOnly,
    requiresNativeReview: requireIndependentReview && !automationOnly,
    mode: prepare ? 'prepare-to-merge' : mode,
    modeSource: prepare ? 'label automerge-prepare' : 'invocation',
    riskChecksSkipped,
    riskSources: [force && 'cli --force', skipRiskChecks && 'cli --skip-risk-checks', forced && 'label automerge-force'].filter(Boolean),
    stageFlags: authorized ? ['--orchestrated', ...(riskChecksSkipped ? ['--skip-risk-checks'] : [])] : []
  }
}
```

## Tracker operations

Step 0 consumes **current-user**, **list-prs** / **search-prs**, **get-pr**, **checkout-pr**, **get-pr-checks**, **get-pr-files**, **get-pr-diff**, **get-pr-comment**, **get-review-comment**, **search-issues**, **list-runs**, **approve-pending-runs**, **comment-pr**, **close-pr** (optional on older descriptors; leave open when unavailable), **list-issue-comments** / **update-comment**, **list-review-comments** (first-visit bootstrap), **mark-pr-ready**, **merge-pr**, **assign-pr**, **unlabel-pr**, the `apply_label` / `label_exists` / `set_pipeline_label` guards, **get-run**, **get-run-failed-logs** (baseline CI comparison), and **create-label** (it creates its own labels when missing).
