# om-spec-writing

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Writes and reviews feature specifications to staff-engineer standards. It drafts skeleton-first with a hard Open Questions gate (it stops and waits for your answers before designing), researches against open-source market leaders, and breaks delivery down into phases and testable steps that each leave the app working. It can also produce a severity-ranked architectural review of an existing spec. Use it when starting a new spec or auditing one; an optional `--autonomous` mode resolves the gate itself for unattended runs.

## Parameters

This skill takes no parameters.

## Works with

Writes specs into the configured specs directory (`paths.specs`, default `.ai/specs`) using the `{YYYY-MM-DD}-{kebab-case-title}.md` filename shape. Its phased implementation breakdown maps directly onto [om-auto-create-pr](om-auto-create-pr.md)'s execution plan (spec referenced as `Source doc:`), and once a spec ships as a PR [om-followup-issue-from-pr](om-followup-issue-from-pr.md) can file the `Implement:` tracking issue; `--autonomous` runs are driven by an `om-auto-*` caller.

---
*Source: [`skills/om-spec-writing/SKILL.md`](../../skills/om-spec-writing/SKILL.md)*
