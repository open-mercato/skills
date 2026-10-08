# om-gap-analysis

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Answers "how much of what the client asked for does the platform already do?" with evidence, not claims. Give it a folder of client materials — transcripts, requirement dumps, spec documents — and it builds an Epic/Story tree, forces every epic to address negative paths, abuse cases, races, tenant isolation, privacy, and audit (or state a client-confirmed reason why not), then verifies each story against a validated, freshly fast-forwarded checkout of the platform's integration branch. Read-only subagents investigate; five executable gates decide what may be written: a verdict whose grounding query does not re-run to the same result, disagrees with its own per-criterion rows, or cites a PR the snapshot does not contain never reaches the tree. The result is a summary (coverage split by license tier, top risks, sequencing) and a backlog, both in atomic commits. A single "does the platform do X?" question gets the same evidence rule without the batch machinery.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{input}` | yes | A directory of client docs (Phase 1), an existing gap-analysis MD (Phases 2–3, resume), or one quoted capability question. |
| `--phase <1\|2\|3>` | no | Force a phase instead of reading it from the MD's frontmatter. |
| `--project <slug>` | no | Kebab-case slug for the output filenames; asked for when unclear. |

## Works with

Reads its `platform` config section and, for anything it does not set, the platform's own knowledge — a `Platform facts` and `License tiers` section in the platform's `AGENTS.md` or in a file named by the `knowledge.sources` slot. Tracker access is read-only and always targets the platform repositories (open PRs and review state feed the Upstream-pipeline signal, never a verdict). The story critique in Phase 1 is delegated to [om-app-spec-writing](om-app-spec-writing.md) `--stories` when installed; that skill in turn uses this one's single-capability mode to ground the gap-matrix rows that decide a phase. Writes to `.ai/gap-analysis/` and gitignored `.ai/tmp/om-gap-analysis/`.

---
*Source: [`skills/om-gap-analysis/SKILL.md`](../../skills/om-gap-analysis/SKILL.md)*
