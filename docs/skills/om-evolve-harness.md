# om-evolve-harness

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Turns a real agent failure into one reproducible case in your repository's agent eval harness, then fixes it with the smallest durable knowledge change. The method is strict. The new case must fail before anything changes. It asserts meaning (routing, decisions, required and forbidden context, artifact properties), never whole model output. The fix goes into exactly one knowledge owner, and the other files point to it. Context budgets are measured from the case's own footprint, not copied from a neighbouring case. The change is done only when the case, its related and mandatory safety cases, the catalog gate, the writable-target validation, code review, the [om-judge-agent-session](om-judge-agent-session.md) lane, and the release suite all pass on pinned versions.

The harness belongs to your repository. The skill drives it through command slots in `.ai/agentic.config.json` under `harness.commands`: `validateCase`, `validateAll`, `fixture`, `validateWritable`, `judge`, `release`, `validateKnowledgeChange`, and a few others. A slot you have not configured is reported as `NOT RUN` and never as a pass. The skill leaves the change in your working tree and never commits.

## Parameters

- `{evidence}` — a prompt, a transcript or session bundle, a PR, an issue, or a judge report.
- `--case <id>` — correct an existing case instead of adding a new one.
- `--runner <name>` / `--portability-runner <name>` — the primary live runner, and an optional second runner for the read-only portability lane.

## Works with

[om-judge-agent-session](om-judge-agent-session.md) finds the failures and names the harness owner to fix. [om-share-this-session](om-share-this-session.md) brings in sessions from users. [om-code-review](om-code-review.md) reviews the harness diff. When the change is ready, [om-check-and-commit](om-check-and-commit.md) commits it.

---
*Source: [`skills/om-evolve-harness/SKILL.md`](../../skills/om-evolve-harness/SKILL.md)*
