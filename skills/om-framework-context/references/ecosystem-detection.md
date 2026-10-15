# Ecosystem detection, resolution, and bounded search

Load this on every dependency lookup (workflow steps 2–5). The goal is one
resolved, installed copy of one dependency, its exact version, and the files
under it — found the way the repository itself resolves it.

## 1. Detect the ecosystem

Start at the repository root; in a multi-package workspace, start at the
workspace member that imports the dependency (the nearest manifest above the
file under investigation). Detect from manifests and lockfiles — never assume a
package manager. More than one ecosystem may be present; pick the one whose
manifest declares the dependency.

| Marker files | Ecosystem / manager | Installed root of `<dep>` | Exact installed version from |
|---|---|---|---|
| `package.json` + `package-lock.json` / `npm-shrinkwrap.json` | Node — npm | first `node_modules/<dep>/` walking up from the consuming root | `<root>/package.json` → `version` |
| `package.json` + `pnpm-lock.yaml` | Node — pnpm | `node_modules/<dep>` is a symlink into `node_modules/.pnpm/…`; resolve it | same |
| `package.json` + `yarn.lock` with a `node_modules/` tree | Node — Yarn (node-modules linker) | as npm | same |
| `package.json` + `yarn.lock` + `.pnp.cjs` / `.pnp.loader.mjs`, no `node_modules/` | Node — Yarn Plug'n'Play | packages live in zip archives in the cache; not directly readable | the lockfile entry; ask the package manager's own `why`/`info` command, or report `degraded` |
| `package.json` + `bun.lock` / `bun.lockb` | Node — Bun | as npm | same |
| `pyproject.toml` / `requirements*.txt` + `uv.lock` / `poetry.lock` / `Pipfile.lock` | Python | the active environment's `site-packages/<import_name>/` (`$VIRTUAL_ENV`, else `.venv/`, `venv/`) | `site-packages/<dist>-<version>.dist-info/METADATA` → `Version` |
| `composer.json` + `composer.lock` | PHP — Composer | `vendor/<vendor>/<package>/` | `vendor/composer/installed.json` → the package's `version` |
| `Gemfile` + `Gemfile.lock` | Ruby — Bundler | `bundle info --path <gem>` (or `vendor/bundle/…`) | `Gemfile.lock` specs entry |
| `go.mod` + `go.sum` | Go modules | `vendor/<module>/` when vendored, else `go list -m -f '{{.Dir}}' <module>` | `go list -m -f '{{.Version}}' <module>` (or the `go.mod` require line) |
| `Cargo.toml` + `Cargo.lock` | Rust — Cargo | `cargo metadata --format-version 1` → the package's `manifest_path` directory | `Cargo.lock` `[[package]]` entry |
| `*.csproj` + `packages.lock.json` / `obj/project.assets.json` | .NET — NuGet | the global packages folder `<id-lowercase>/<version>/` | `packages.lock.json` resolved version |
| `pom.xml` / `build.gradle*` | JVM — Maven / Gradle | jars in the local repository cache; knowledge files usually absent | the resolved dependency tree of the build tool |

Tool commands in this table are read-only queries of the package manager. Run
one only when the manager is installed and the repo uses it; otherwise read the
lockfile. Never run an install, update, or network fetch to make a dependency
appear.

## 2. Resolve one installed copy (Node example, POSIX shell)

The shape generalizes: walk up from the consuming root, take the first match,
resolve symlinks, read the version from the installed manifest.

```bash
dep="$1"   # validated per agentic-setup.md before use
start="${2:-$PWD}"
d=$(cd "$start" && pwd -P)
found=''
while :; do
  if [ -f "$d/node_modules/$dep/package.json" ]; then found="$d/node_modules/$dep"; break; fi
  [ "$d" = "/" ] && break
  d=$(dirname "$d")
done
[ -n "$found" ] || { echo "unresolved: $dep is not installed below $start"; exit 0; }
root=$(cd "$found" && pwd -P)            # follows pnpm-style symlinks portably
version=$(sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$root/package.json" | head -n 1)
echo "resolved: $dep@${version:-unknown} ($root)"
```

Rules that hold in every ecosystem:

- The copy the consuming root resolves is the one that runs. Do not pick a
  "newer" copy you happen to find elsewhere.
- Check the installed manifest's `name` equals the requested dependency before
  trusting the version.
- **Duplicates / mixed versions.** List other installed copies with a capped
  search (Node: `find node_modules -name package.json -path "*/node_modules/$dep/package.json" 2>/dev/null | head -n 1000`;
  pnpm: `ls -d node_modules/.pnpm/<dep-with-/-as-+>@* 2>/dev/null`). When a
  related family of packages (same scope or vendor) is installed at different
  versions, say so — context stays per package.
- **Source versus build output.** Prefer shipped source (`src/`, `lib/` with
  sources) when it exists; with only compiled output plus type declarations,
  continue but mark the answer `degraded` ("source-level analysis limited").

## 3. Find knowledge files under the root

For each `files` glob of the matching `knowledge.sources` entry (default
`["AGENTS.md"]`), list matches under `$root` (`find "$root" -path "$root/<glob>" -type f`
or the shell's own glob expansion). Then, for a question about a sub-path,
walk from that sub-path up to `$root` and collect every `AGENTS.md` on the way.
Skip any match whose resolved path leaves `$root`.

## 4. Bounded search (`--query` only)

One fixed-string search, inside `$root` only, deterministic, capped at **200
matching lines**:

```bash
q="$QUERY"   # passed as one quoted argument, never spliced into a pattern
if command -v rg >/dev/null 2>&1; then
  rg --no-ignore --hidden --fixed-strings --line-number --sort path \
     --max-columns 500 --glob '!node_modules' --glob '!.ssh' \
     --glob '!.npmrc' --glob '!.netrc' --glob '!*.pem' --glob '!*.key' --glob '!*.p12' \
     --glob '!credentials*' --glob '!secrets*' --glob '!id_rsa*' --glob '!.env*' \
     -- "$q" "$root" | head -n 201
else
  grep -rnFI --exclude-dir=node_modules --exclude-dir=.ssh \
     --exclude='.npmrc' --exclude='.netrc' --exclude='*.pem' --exclude='*.key' --exclude='*.p12' \
     --exclude='credentials*' --exclude='secrets*' --exclude='id_rsa*' --exclude='.env*' \
     -- "$q" "$root" 2>/dev/null | sort | head -n 201
fi
```

- A 201st line means the result is truncated — report it and ask for a
  narrower query rather than raising the cap.
- `--no-ignore` matters: install directories are usually ignored by the VCS, and
  a search that silently skips them returns a false "no matches".
- Skip credential and key material (`.npmrc`, `.netrc`, `*.pem`, `*.key`,
  `*.p12`, `credentials*`, `secrets*`, `id_rsa*`, `.env*`, the `.ssh/` directory) and binary files —
  the snippet above excludes exactly this list (keep the two in sync; `rg` skips
  binary files by default, `grep -I` does the same). Never print their contents
  even when matched.
- Never widen the search to the whole install directory or to other
  dependencies. A second query is a new, equally narrow search.
