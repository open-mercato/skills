# Human-lane classification

Apply this skill’s own rules before proposing or applying a queue label.

Inspect the complete PR diff against its actual target through **get-pr-files**
and **get-pr-diff**, including renamed/generated files and relevant call sites.
Classify behavior, not only labels or filename extensions. These areas are
always treated as `risk-high` for the gates, even without a risk label:

| Area | Examples to inspect |
|---|---|
| Migrations | Added/modified executable schema or data migrations, migration runners and destructive/backfill behavior |
| Permissions or tenant isolation | Authorization policies/checks, roles/grants, scope filters, tenant context propagation, cross-tenant reads/writes and bypass paths |
| Money | Prices/totals, currencies/rounding, charges/payments, refunds, billing, balances, payouts and financial transaction retry/idempotency |
| Architecture changes | Substantive changes to service/module boundaries, persistence or state ownership, execution/deployment topology, shared extension contracts, or cross-component communication and dependency direction |
| Backward-incompatible changes | Removing, renaming or incompatibly changing published APIs/events, CLI flags, config/serialized formats, persisted data contracts, supported integrations, or externally relied-on behavior |

A local behavior-preserving refactor within existing boundaries is not an
architecture change by itself. An additive API is not backward-incompatible
unless existing consumers or supported behavior stop working. Read the repo's
architecture/design decisions, public contracts and `BACKWARD_COMPATIBILITY.md`
when present; inspect affected consumers rather than trusting a PR title, label
or an author's assertion that the change is compatible.

A filename or incidental mention alone is not proof; explain the concrete changed
behavior and cite paths/lines. Unknown/truncated diff or uncertain impact cannot
prove an ordinary fix: inspect further or park with the exact missing evidence.
Reclassify after every head or target change, including changes made by a child.

A label in HUMAN_ONLY_LABELS or a case-insensitive author match in
HUMAN_ONLY_AUTHORS also routes to the human lane. Read current labels, full
diff and consumers; unavailable evidence prevents a proposal with a precise
reason. No companion skill or its reference files are required to classify.
Keep these classification rules aligned with the buddy when the area policy changes.
