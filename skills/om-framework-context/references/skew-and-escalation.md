# Skew and escalation

Load this when resolution is degraded or the sources disagree (workflow step 6).
Each case names the report consequence; none of them is solved by guessing.

| Case | What to do | Status |
|---|---|---|
| **Fact / version mismatch** — a repo-owned knowledge file (generated facts, a snapshot manifest, a doc header) carries a version stamp different from the installed version | Do not use the stale facts with the newer code. Report both versions and the regeneration step the repository documents for it (its `AGENTS.md` Task Router or the dependency's own `AGENTS.md`); do not run it from this skill. Answer from the installed code and the dependency's own knowledge only. | `degraded` |
| **Duplicate installed copies** | Use the copy the consuming root resolves; list every candidate with version and location. If the consuming root is ambiguous (several workspace members at different versions), ask the user which one the question is about. | `degraded` when ambiguity remains |
| **Mixed versions in a package family** | Keep context package-specific; never combine knowledge or code across the versions. | `degraded` |
| **No source, only build output** | Continue with compiled output plus type declarations; state that source-level analysis is limited. | `degraded` |
| **Dependency ships no `AGENTS.md` / no configured `files` match** | Continue with the repository's rules, repo-owned sources, and the exact installed code; report the gap. | `degraded` |
| **Not installed / archive-only install** | Report `unresolved` with the reason (not installed, zero-install archive, remote cache). Suggest the repository's own install step to the user; never install from this skill. | `unresolved` |
| **Rule contradiction** between knowledge files | Apply the concern precedence in `references/knowledge-sources.md`, confirm both files belong to the installed version, and stop on that point if still unresolved — quote both, never blend. | `unresolved` for that point |
| **Docs versus code divergence** | Code is current behavior; docs are intended behavior. Report the divergence with both citations; the conclusion follows the code and flags the doc. | `degraded` |
| **Framework change required** — the question can only be answered by changing the dependency | Say so. Recommend an upstream issue or PR carrying the installed version and a minimal reproduction, or the dependency's documented extension or override mechanism. Never patch the installed copy. | `resolved` (with that recommendation) |
| **Network source needed** — e.g. the published package omits source | Ask the user explicitly. With a yes, pin the fetch to the exact installed release or commit, keep it read-only, and outside the repository's tracked files. | depends on outcome |

Never copy a different checkout of the dependency (another branch, a local
clone, a newer release) and present it as the installed contract.
