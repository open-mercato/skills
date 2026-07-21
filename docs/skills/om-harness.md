# om-harness

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Internal shared runtime behind the staged-only wrappers — not a skill you invoke directly. It provides the provider-neutral model adapters, hash-bound `om-code-review` packets, fresh-Claude attestation, the multi-model review council and its result matrix, evidence-gated work packets with path leases, the prevention hooks, and the staged-handoff verifier that proves `HEAD`, refs, and reflogs never moved. See its [README](../../skills/om-harness/README.md) for the full flow and diagrams.

## Parameters

Invoked indirectly. Its runtime commands (`probe`, `prepare-review`, `review`, `worker`, `packet-run`, `capture`, `stage`, and others) are documented in the skill body.

## Works with

Consumed by [om-fix-issue](om-fix-issue.md), [om-implement-feature](om-implement-feature.md), and [om-setup-agent-harness](om-setup-agent-harness.md). Binds the installed [om-code-review](om-code-review.md) rubric into every review packet.

---
*Source: [`skills/om-harness/SKILL.md`](../../skills/om-harness/SKILL.md)*
