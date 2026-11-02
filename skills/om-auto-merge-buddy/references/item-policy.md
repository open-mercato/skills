# Per-item queue policy

Treat `automerge-force` and `automerge-prepare` as exact, case-sensitive PR label
modifiers. They are operator policy inputs, never review/QA/CI evidence. Both
require the configured `AUTOMERGE_LABEL` on the open PR, including with `--pr`;
neither modifier enrolls a PR or replaces the human off switch. Operators apply
these labels with the same trusted queue-management access as `AUTOMERGE_LABEL`.
The buddy never adds a modifier to opt an ordinary PR in. No config migration
or automatic label creation is needed: create the optional modifier labels in
the tracker when using them. Do not derive their names from a custom queue label.

## Resolve each item afresh

Resolve the invocation mode from config/CLI using
`references/independent-review.md`. Keep that immutable baseline separate from
the effective per-item mode. At admission, entrance, before and after each stage,
after replacement, and immediately before either finish action, read current
labels through **get-pr** and resolve:

| Current modifiers | Effective item policy |
|---|---|
| Neither | Invocation mode and explicit risk flags only |
| `automerge-force` | As if this buddy received `--skip-risk-checks --force` for this PR; invocation mode unchanged |
| `automerge-prepare` | Override config and CLI merge mode to `prepare-to-merge`; never merge this PR |
| Both | Apply the force request to preparation; remain prepare-only |

`automerge-prepare` is the per-item prepare mode, mapped to the existing
`prepare-to-merge` value. It does not introduce an `automerge-prepare` CLI mode.
In a globally prepare-only run, force never opts an item into merging.

The buddy’s `--skip-risk-checks` is an alias for its existing risk-only
`--force`; accepting both is idempotent. Apply protected-area classification
and vetoes under `references/human-gates.md` before using the request:
protected changes always enforce risk checks. Claims, full review, required QA,
independent review, CI, head/target guards and human vetoes retain their gates.
Only children’s documented `--skip-risk-checks --orchestrated` is forwarded;
never child `--force`, which means claim takeover.

Recompute in each worker from fresh inputs; never mutate invocation defaults or
share a mutable effective policy between workers. Incomplete or failed label reads
stop the visit before producing work or merging. Never use saved scheduler,
status, signal, handoff or dashboard policy as authority. Removing force with
no CLI risk flag requires strict CR reconciliation, including unchanged heads;
removing prepare restores current invocation mode only after full finish
revalidation. Newly added prepare prevents the next merge; a label-only change
must not reuse cached readiness. These checks cannot undo an already completed
merge; keep the fresh label read adjacent to the guarded merge mutation.

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
checks and disclose it. Preserve existing replacement restrictions. Re-resolve
from the replacement’s actual labels; never reuse the old worker’s effective
values or turn a failed force-label write into an implicit CLI override.

The following decision function consumes normalized fresh label names and an
already validated invocation mode; `protectedArea` comes from actual diff
classification. Missing queue authorization yields no stage flags.

```javascript
function resolveAutomergeItemPolicy({ labels, queueLabel = 'automerge', mode = 'prepare-and-merge', force = false, skipRiskChecks = false, protectedArea = false }) {
  if (!Array.isArray(labels) || labels.some(label => typeof label !== 'string')) throw new Error('Incomplete label read')
  if (!['prepare-to-merge', 'prepare-and-merge'].includes(mode)) throw new Error('Invalid invocation mode')
  const authorized = labels.includes(queueLabel)
  const prepare = labels.includes('automerge-prepare')
  const forced = labels.includes('automerge-force')
  const riskRequested = force || skipRiskChecks || forced
  const riskChecksSkipped = authorized && riskRequested && !protectedArea
  return {
    authorized,
    mode: prepare ? 'prepare-to-merge' : mode,
    modeSource: prepare ? 'label automerge-prepare' : 'invocation',
    riskChecksSkipped,
    riskSources: [force && 'cli --force', skipRiskChecks && 'cli --skip-risk-checks', forced && 'label automerge-force'].filter(Boolean),
    stageFlags: authorized ? ['--orchestrated', ...(riskChecksSkipped ? ['--skip-risk-checks'] : [])] : []
  }
}
```

## Tracker operations

Step 0 consumes **current-user**, **list-prs** / **search-prs**, **get-pr**, **get-pr-checks**, **get-pr-files**, **get-pr-diff**, **get-pr-comment**, **get-review-comment**, **search-issues**, **list-runs**, **approve-pending-runs**, **comment-pr**, **close-pr** (optional on older descriptors; leave open when unavailable), **list-issue-comments** / **update-comment**, **list-review-comments** (first-visit bootstrap), **mark-pr-ready**, **merge-pr**, **assign-pr**, **unlabel-pr**, the `apply_label` / `label_exists` / `set_pipeline_label` guards, **get-run**, **get-run-failed-logs** (baseline CI comparison), and **create-label** (it creates its own labels when missing).
