# om-brainstorm

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Runs the conversation before any artifact exists. Give it a vague idea, an itch, or a plain question and it explores: open questions one at a time, at least two alternatives plus an explicit "build nothing" option, a read-only check whether the tracker already covers it, and a fresh-context challenger subagent that attacks the conclusion before you see it. It never edits the repository; the only file it may write is one handoff brief, after you confirm the routing. Every run ends with a machine-parsed `Next:` line, so an orchestrator can fire the chosen next step autonomously.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{topic}` | no | A free-form idea, question, or itch; when omitted, the skill opens by asking what is on your mind. |

## Works with

Routes its conclusion to exactly one exit ramp: nothing (the answer is the report), [om-prepare-issue](om-prepare-issue.md) (park the idea as a labeled issue), [om-auto-write-spec](om-auto-write-spec.md) (the resolved unknowns in the brief replace the spec's autonomous defaults — the full-auto path), [om-spec-writing](om-spec-writing.md) (co-design the spec interactively), [om-auto-create-pr](om-auto-create-pr.md) (small change, straight to a PR), or [om-auto-fix-issue](om-auto-fix-issue.md) (the tracker check found an existing issue). Briefs land in `${SPECS_DIR}/briefs/`; the `Next:`/`Brief:` lines are parsed by session orchestrators. A repo-local extension may add repo-specific ramps.

---
*Source: [`skills/om-brainstorm/SKILL.md`](../../skills/om-brainstorm/SKILL.md)*
