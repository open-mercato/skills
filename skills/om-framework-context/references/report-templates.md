# Report templates

Lead with the answer. The evidence chain exists so a reader (or the calling
skill) can check it, not to narrate the lookup. Usually 5–10 lines.

## Single dependency

```markdown
🎯 `om-framework-context`: {repo-side conclusion in one sentence — what this repository should do or rely on}.

- Installed: `{dependency}@{exact version}` at `{repo-relative resolved root}` ({ecosystem}; resolved from `{consuming root}`)
- Knowledge chain: `{file}` → `{file}` → … (concern precedence; only files actually read)
- Inspected: `{file:line}`, `{file:line}` — {what each proved, when not obvious}
- 🔍 Search: `{query}` — {n} matches{, truncated at 200} (only with `--query`)
- ⚠️ Skew / limits: {version stamp vs installed, duplicates, dist-only, missing AGENTS.md, docs vs code} (only when present)

Status: {resolved | degraded | unresolved}
```

Omit the Search and Skew bullets when they carry nothing. Distinguish what the
installed code shows from what a knowledge file claims. For `unresolved`, the
first line says what is missing and the next action (install step, narrower
query, user choice between copies).

## Inventory mode (no `{dependency}`)

```markdown
🎯 `om-framework-context`: {n} knowledge sources configured — {n} resolved, {n} degraded, {n} unresolved.

| Source | Resolved to | Version | Knowledge files | Note |
|---|---|---|---|---|
| `{path or dependency}` | `{root}` | `{version or —}` | `{files}` | {skew / gap, or blank} |

Status: {worst status across the rows}
```

With no `knowledge.sources` configured, say that the repository's `AGENTS.md`
Task Router is the only knowledge source, and suggest the key (shape in
`references/knowledge-sources.md`) only when a declared dependency ships an
`AGENTS.md` that no source picks up.
