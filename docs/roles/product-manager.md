# 📋 Product Manager / Analyst

The pipeline turns your ideas into tracked, well-formed work and — when you want it — a written spec you can review before a single line of code exists. You describe the outcome; the skills dedupe against what already exists, link or author a covering spec, embed step-by-step guidance, and apply the full SDLC label set (category + priority + risk) so the backlog is ready for a developer to pick up. Nothing implements until you ask.

← Back to the [README](../../README.md#-workflows-by-role)

## Skills you'll use

| Skill | When | Example call | What you get |
|---|---|---|---|
| `om-prepare-issue` | Park an idea as one clean issue | `/om-prepare-issue "Bulk-archive orders from the grid"` | a deduped, SDLC-labeled issue with a linked spec or step-by-step guidance |
| `om-auto-manage-issues` | Triage or enrich the backlog | `/om-auto-manage-issues` | missing labels added, laconic issues clarified (screenshots analyzed), implementation-prep comment posted |
| `om-auto-manage-issues` | Clean up one issue | `/om-auto-manage-issues 123` | that issue relabeled and clarified in place |
| `om-auto-write-spec` | Review the plan before code | `/om-auto-write-spec 123` | a spec-first PR; implementation left for a later run |
| `om-spec-writing` | Draft or review a spec directly | `/om-spec-writing` | a staff-level spec, skeleton-first with an Open Questions gate |

## What happens automatically

- **SDLC labels on creation** — category, inferred priority, and risk are applied when the issue is filed.
- **Dedupe first** — `om-prepare-issue` searches existing issues and open PRs before creating anything.
- **Spec linkage** — a covering spec in the repo or an open PR is linked; a feature that needs one gets a spec authored on a design-only PR.
- **Claim locks** — batch triage is idempotent and claim-aware, so it never clobbers work another agent is mid-flight on.
- **Implementation-prep comments** — `om-auto-manage-issues` posts a read-only analysis as a comment; it never edits code.

## Tips

- Use `om-auto-write-spec <issue>` when you want to sign off on the approach before any implementation happens — it stops after the spec PR lands; a later `om-auto-fix-issue` run picks the spec up and implements it on the same PR.
- Specs are **autonomous by default**: `om-spec-writing --autonomous` posts its Open-Questions assumptions as a comment for you to override, rather than blocking. Pass `--interactive` (on `om-auto-fix-issue` / `om-prepare-issue`) when you'd rather answer the questions live.
- To override an autonomous assumption, just reply on the PR/issue comment — the defaults are posted precisely so you can correct them.
- Batch triage defaults to the last ~25 open issues, worst-described first; narrow it by state, label, author, or limit when you want a focused pass.
- `om-prepare-issue` files work but never implements it — reach for `om-auto-fix-issue` (or a developer) when you're ready to build.
