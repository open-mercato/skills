# om-judge-agent-session

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

An LLM-as-judge for what a coding agent produced. Give it a result from your repository's eval harness or a shared session bundle (for example one made by [om-share-this-session](om-share-this-session.md)) and it returns a strict `pass`, `fail`, or `inconclusive` verdict. Controller-owned evidence counts first: the commands, tests, oracles, and fingerprints the harness recorded. A semantic review can add failures but can never cancel one. After that it checks the artifact against your project rules and your own judge-criteria file, runs [om-code-review](om-code-review.md) on the code, and applies your design contract to UI changes. For each failure the harness should have caught, it names the one smallest place to fix it: a root invariant, a router row, a guide, a skill reference, the facts extractor, a hook, a new case, or an oracle.

It is read-only. It never runs commands it finds in the session, never extracts archives outside a fresh temporary directory, and keeps raw transcripts, secrets, and home paths out of the report.

## Parameters

- `{input}` — a harness result, a session bundle directory, or a `session.json`.
- `--artifacts <dir>` — the generated-file tree that goes with a bare `session.json`.
- `--criteria <path>` — a judge-criteria file to use for this run instead of `judge.criteria`, which defaults to `.ai/judge-criteria.md`.

## Works with

[om-evolve-harness](om-evolve-harness.md) runs it as the isolated judge lane and turns its harness-owner findings into new cases. Design review uses the `.uxproof/` contract from [om-ux-setup](om-ux-setup.md) when you have one.

---
*Source: [`skills/om-judge-agent-session/SKILL.md`](../../skills/om-judge-agent-session/SKILL.md)*
