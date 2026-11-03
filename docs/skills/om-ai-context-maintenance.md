# om-ai-context-maintenance

Archive old AI run context while keeping the last 14 days unpacked. Each eligible
folder becomes a `.tgz` archive beside the remaining runs; standalone Markdown
plans are supported too. The skill protects active and uncertain runs, checks
open PR references, and verifies archive contents before removing originals.

## Parameters

| Parameter | Default | Effect |
|---|---|---|
| `--keep-days <N>` | `14` | Retain dates on or after UTC today minus N days. |
| `--runs-dir <path>` | Configured `paths.runs`, otherwise `.ai/runs` | Select a repository-relative run root; archives stay there. |
| `--exclude <name>` | None | Protect an exact top-level name; repeat as needed. |
| `--dry-run` | Off | Preview eligibility without changing files. |

```text
/om-ai-context-maintenance --dry-run
/om-ai-context-maintenance --keep-days 30
```

Persist repository-specific defaults in
`.ai/skills/om-ai-context-maintenance/SKILL.md`. Requires Python 3.9+ and a local
filesystem that supports hard links. A normal invocation previews locally, then
uses `om-auto-create-pr` to archive in an isolated worktree and publish the archive
additions and source removals together for review. The caller's checkout stays
untouched. Dry runs and empty initial previews create no PR; a later empty
refresh reports any draft already opened. If the companion skill is
missing, the skill stops after preview. No schedule is installed. Coordinate
with workers before applying rotation.

A dated run uses its leading `YYYY-MM-DD`; an undated run uses its newest
filesystem modification date. Exact boundary dates remain unpacked. Archives
are never overwritten or expired automatically. Restore an archived run to its
original path before using an existing resume or retrospective reader; the
skill includes recovery and safe restoration guidance.

*Source: [`skills/om-ai-context-maintenance/SKILL.md`](../../skills/om-ai-context-maintenance/SKILL.md)*
