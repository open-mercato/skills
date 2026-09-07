# Report templates — final report (step 9)

How `om-setup-discovery-pipeline` reports back after a run. Reporting style contract: `references/rules.md` — full sentences, explain the why, never compress. Voice: `references/voice.md` — the report says what changed for the team in their repository, in their language; the skill's own terms (markers, anchors, blocks) appear at most once, explained. This skill defines no chaining reference lines.

## Final run report

```markdown
## 🎯 om-setup-discovery-pipeline — {repo}

**Result:** {✅ product layer added | ✅ product layer refreshed | ✅ already current | ⚠️ added with gaps} — {one full sentence on the outcome}

### 📋 What was written
{One bullet per artifact, in full sentences: the `discovery` block in `.ai/agentic.config.json` (which roles were declared and why); each block placed in `SDLC.md` with its anchor, and the delivery-only Discovery and Intake rows it replaced; the research directory; the routing row in `AGENTS.md`, or that no routing table exists. Say what already existed and was left untouched, and name any block that could not be placed at its anchor.}

### 🏷️ Roles now in the process
{Full sentences: Product owner (always), Domain expert and Designer when declared, and that the maintainer plays the product owner when nobody else does. One sentence on what each role is now accountable for in `SDLC.md`.}

### {✅ Product skills installed | ⚠️ Missing product skills}
{When complete: one sentence. When not: each missing skill with the paste-ready `npx skills add` command and what stays unavailable until it is installed.}

### 🚀 What is unlocked
{Full sentences: tickets are checked against the Definition of Ready by `om-auto-manage-issues` and `om-auto-fix-issue`; `om-backlog` files only from a ready brief; `om-code-review` blocks a change that contradicts a non-goal, rule, or decision in the brief without a superseding entry. Then the one next command: `/om-discover` when there is no brief, `/om-discover --refresh` when there is.}

### ⚠️ Follow-ups
{Only when something needs the user: the pending commit, a block the team must place by hand, an edited block left as is. Omit when there is nothing left to do.}
```

## Dry run

Replace the *Result* line with `**Result:** 📋 dry run — nothing was written`, keep the same sections describing what would change, and omit the commit offer.
