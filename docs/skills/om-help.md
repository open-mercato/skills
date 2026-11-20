# om-help

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Answers "which skill should I use?", "what do I do next?", and "how do I do X here?" without a hand-written catalog. At run time it reads the repository's generated `SDLC.md` (the Ticket lifecycle table's "Driven by" column) and its own `AGENTS.md` Task Router, scans every installed skill root — repo-local `.ai/skills/`, project-level `.agents/skills/`/`.claude/skills/`/`.codex/skills/`, any extra `help.skillRoots`, the root this skill's own install lives under (`SKILLS_ROOT`), and user-level equivalents — for each skill's frontmatter `name` and `description`, adds the repository's own workflow data from `help.data` (default `.ai/help/*.md`, an optional hook nothing in the collection writes to), its own shipped `references/flow-map.md` for what SDLC structurally cannot carry (chain-only skills, deciding criteria between near-duplicates, and the layers outside the ticket lifecycle), and — for knowledge questions — the `knowledge.sources` entries via `om-framework-context`. It also probes cheap on-disk setup signals (a missing tracker descriptor, no Definition of Ready, no design contract, …) and tells context apart from a hard block. It recommends the smallest safe route, cites the row or description that justified it, flags drift (a skill the docs name but that is not installed, or whose installed description disagrees), and ends with a machine-parsed `Next:` line. Read-only: it never edits files, mutates the tracker, or runs the skill it recommends.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{question}` | no | The task or question. When omitted, the skill reads the current branch, working tree, specs, and your open PRs and answers "what next?". |

## Configuration (optional)

| Key | Default | Meaning |
|---|---|---|
| `help.data` | `[".ai/help/*.md"]` | Repository routing data — workflow sequences, task families, delivery shapes as Markdown tables. An optional repository hook; no skill in this collection generates it. |
| `help.skillRoots` | `[]` | Extra skill directories to scan, in addition to `SKILLS_ROOT` (the parent of this skill's own installed directory) and the standard roots. |
| `knowledge.sources` | `[]` | Repo-owned and dependency-shipped knowledge files for "how do I…" answers. Defined and resolved by `om-framework-context`; invoked when installed, else a bounded standalone fallback. |

## Works with

Recommends whichever installed skill of the `om-` set fits; it never invokes one, and it never routes to skills outside that set (other installs, user-level skills, plugins). Primary routing sources, in precedence order: the root `AGENTS.md` Task Router, `help.data`, `SDLC.md`'s Ticket lifecycle table (filtered to drop chain-only skills like `om-fix`/`om-open-pr`), then its own `references/flow-map.md`. The `Next:` line has the same shape as [om-brainstorm](om-brainstorm.md)'s, so a session orchestrator can act on either; both lines are protected contract surfaces (`BACKWARD_COMPATIBILITY.md` §5). A repo-local `.ai/skills/om-help/SKILL.md` extends it (for example with extra routing rules) through the standard override preflight.

---
*Source: [`skills/om-help/SKILL.md`](../../skills/om-help/SKILL.md)*
