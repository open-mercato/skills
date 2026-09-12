# Report templates

Use after step 9. Follow `references/rules.md` and the user's language in
`references/voice.md`. Aim for 3–6 lines for a final handoff; allow more for gaps
or recovery instructions. Say what changes for the team, link the diff for the
artifact inventory, and omit empty optional sections. Explain terms such as
markers or anchors only when they locate a required action. This skill defines
no chaining reference lines.

## Final run report

```markdown
🎯 `om-setup-discovery-pipeline`: {repo}

**Result:** {✅ product layer added | ✅ product layer refreshed | ✅ already current | ⚠️ added with gaps}. {Explain what the team can now do, or the limitation that still prevents it.}

📋 {Explain that tickets now face the Definition of Ready in `om-auto-manage-issues` and `om-auto-fix-issue`, `om-backlog` files only from a ready brief, and `om-code-review` blocks contradictions of the brief's non-goals, rules, or decisions without a superseding entry. State only the gates actually installed.}
{Name the declared roles and why: the Product owner is always accountable, with the maintainer filling in when needed; include the Domain expert and Designer only when declared, and explain their responsibilities in `SDLC.md`.}
📝 {Link the diff for the config, each SDLC section and its placement, the replaced Discovery and Intake rows, the research directory, and the agent routing row. State what already existed and was preserved; note an absent routing table or any section that could not be placed.}
{✅ All required product skills are installed. | ⚠️ Name each missing skill, give its paste-ready `npx skills add` command, and explain what remains unavailable.}
🔁 {Give one next command: `/om-discover` when no brief exists, or `/om-discover --refresh` when it does.}
⚠️ {Name any pending commit, section requiring manual placement, or edited section preserved for the team to resolve. If the delivery process lacks the current risk-high table, `QA head` line, or after-merge paragraph, say which are missing and point to the template to copy from.}
```

On the first successful setup, explain how to remove the layer using
`references/sdlc-sections.md` → *Removing the product layer*: first restore the
delivery-only Discovery and Intake rows, then remove the remaining
discovery-marked sections, routing entry, and `discovery` config key. Preserve
the delivery Designer. Show the removal diff before applying it.
Do not recommend rerunning `om-setup-agent-pipeline` to update an existing delivery
process; it does not regenerate existing files. Keep missing-skill commands and
manual recovery instructions even when the report exceeds its length target.

For an already-current run, give the result and next command, plus any remaining
limitation. Do not repeat the earlier artifact inventory or role explanations.

## Dry run

Replace the result with `**Result:** 📋 dry run — nothing was written.` Describe
the proposed outcomes and gaps in conditional language, link the proposed diff,
and omit the commit offer. Retain every change the user would need to review.
