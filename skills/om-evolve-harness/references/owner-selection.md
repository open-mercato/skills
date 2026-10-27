# Knowledge owner selection

Loaded by `om-evolve-harness` workflow step 4, after the failing assertion is reduced. The owner kinds are generic; the concrete paths are the repository's (its agent instruction files, guides directory, skills, facts generator, hooks, and any `knowledge.sources` shipped by dependencies).

| Failure | Smallest owner |
|---|---|
| Universal safety/writable-path invariant missing | Root agent-instructions (`AGENTS.md`) invariant. |
| Correct task family not selected | Root Task Router row or skill description. |
| Conceptual cross-task contract wrong | One guide document. |
| Branch procedure incomplete | One local skill reference. |
| Project/framework fact wrong (module ID, route, event, permission, registration key, extension point) | The generated-facts extractor, not hand-written prose. |
| Exact installed detail unavailable | The context resolver/snapshot, or the dependency's published knowledge (`knowledge.sources`). |
| Shared automation needs a standalone delta | A narrow repo-local skill override (`.ai/skills/<name>/SKILL.md`) or config key. |
| Skill dependency/layout missing | The skill installer manifest/closure. |
| Tool edits the wrong path or skips a guard | A tool hook or rule. |

Choose exactly one primary owner. Other files point to it. If the change needs two owners, split the assertion or justify why one contract spans both and add a consistency check. Knowledge a dependency ships belongs to that dependency — propose the change there instead of copying it into the repo.
