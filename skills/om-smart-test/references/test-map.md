# The test map — changed files → affected units → tests

Loaded by `om-smart-test` step 4. The map is **repo data**: it names the units of
the codebase, what they depend on, which tests cover them, and which files are
cross-cutting. It holds names and globs only — never commands. When there is no
map, the same information is derived from the workspace manifest (below).

## Map file (`smartTest.map`, default `.ai/test-map.json`)

```json
{
  "version": 1,
  "ignore": ["**/*.md", "docs/**"],
  "wide": ["<root runner config>", "<shared build/compiler config>", "<lockfile>", "<shared library root>/**"],
  "units": [
    {
      "name": "billing",
      "paths": ["src/billing/**"],
      "dependsOn": ["accounts"],
      "tests": { "integration": ["e2e/billing/**"] }
    }
  ],
  "unitPattern": "src/modules/{unit}/**",
  "declarations": [
    { "glob": "src/modules/*/e2e/deps.json", "keys": ["dependsOn"] }
  ],
  "layers": [
    { "name": "style", "paths": ["**/*.css", "<design-token dir>/**"], "skipSuites": ["integration"] },
    { "name": "presentation", "paths": ["**/components/**"], "followDependents": false }
  ]
}
```

| Field | Meaning |
|---|---|
| `ignore` | Changed files dropped before classification (reported as dropped). Default when the map or field is absent: `**/*.md` and `docs/**`. Set `[]` to consider everything. |
| `wide` | Cross-cutting files — shared libraries, root runner/compiler/build config, lockfiles, root manifests. Any match → full run of every suite. |
| `units[]` | Explicit units: `name`, owned `paths` globs, `dependsOn` (unit names), and optional `tests.<suite>` globs listing the suite's tests that cover this unit (default: the suite's `files` globs under the unit's paths). |
| `unitPattern` | Path template with one `{unit}` segment; every matching directory is a unit named by that segment (explicit `units[]` entries win on name clash). Units with the same name under different roots are **different units** — identity is the unit root path, never the bare name. |
| `declarations[]` | Dependency declarations kept next to the tests: for each file matching `glob`, read the string arrays under the listed `keys` (JSON, YAML, or a literal array in source) as `dependsOn` of the unit that owns the file. Values are unit names — validate them; ignore anything else. |
| `layers[]` | Change classes that bound the blast radius. `skipSuites` — a suite is skipped only when **every** remaining changed file belongs to a layer that lists it. `followDependents: false` — changes in this layer affect their own unit only, not its dependents. |

A unit matched by several globs belongs to the **most specific** (longest
literal prefix) one. Unknown fields are ignored; an unparseable map is reported
and treated as absent (derive from the manifest).

## Deriving units without a map

Detect the repository's workspace layout from the manifest(s) it already has —
never assume one package manager or ecosystem:

| Manifest | Units | Internal dependencies |
|---|---|---|
| `package.json` `workspaces` (array or `.packages`), `pnpm-workspace.yaml` `packages` | each member directory | `dependencies` / `devDependencies` / `peerDependencies` naming another member's `name` |
| `Cargo.toml` `[workspace] members` | each crate | `path =` dependencies on sibling crates |
| `go.work` `use` | each module | `require` of a sibling module path |
| `pyproject.toml` workspace tables (e.g. `[tool.uv.workspace] members`) | each member | dependencies naming another member |
| `pom.xml` `<modules>`, `settings.gradle(.kts)` `include` | each module | project/module dependencies |

- No workspace manifest → the whole repository is **one unit**; selection then
  relies on the runner's own import graph (`related`) or runs full.
- Files outside every unit directory (root manifests, lockfiles, root-level
  runner or compiler config) are **wide**, unless ignored.
- Test ownership per unit = the suite's `files` globs under the unit's directory.
- The derived map is used for this run only; the report may suggest committing
  it as `.ai/test-map.json` when narrowing needed data the manifest lacked
  (e.g. integration tests outside the unit directories).

## Resolving affected units

1. `changedUnits` = the owning unit of every changed file (after `ignore`).
2. `affected` = `changedUnits` ∪ every unit that depends on one of them,
   transitively — except that a unit whose changed files all sit in
   `followDependents: false` layers adds no dependents.
3. A changed file that belongs to no unit and is not ignored is wide (step 4 of
   the skill body): the mapping cannot bound its effect.
