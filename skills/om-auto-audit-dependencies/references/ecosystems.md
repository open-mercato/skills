# Ecosystem detection and advisory sources

The table `om-auto-audit-dependencies` uses in steps 1–2: which files mark an
ecosystem, and where its advisories come from.

## Finding lockfiles

List lockfiles that git tracks, then exclude vendored/generated/build paths
(`node_modules`, `vendor`, `.dart_tool`, `build`, `target`, `.venv`, `Pods`,
`dist`). Tracked vendor files still need exclusion. Use NUL-delimited discovery
when executing commands so paths with spaces or newlines are preserved. For a
human-readable inventory:

```bash
git ls-files | grep -E '(^|/)(pubspec\.lock|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lock|Cargo\.lock|poetry\.lock|uv\.lock|Pipfile\.lock|requirements[^/]*\.txt|composer\.lock|Gemfile\.lock|go\.mod|gradle\.lockfile|packages\.lock\.json|Podfile\.lock|Package\.resolved|mix\.lock)$'
```

A manifest with no lockfile beside it (for example a `pubspec.yaml` or
`package.json` alone) is recorded as **not scanned (no lockfile)**: version
ranges do not say what actually ships, and resolving them would mean running an
install, which this skill never does.

## Sources per ecosystem

| Lockfile | Ecosystem (OSV name) | Preferred source | Fallback |
|---|---|---|---|
| `pubspec.lock` | Pub | OSV scan — the Dart/Flutter toolchain has no audit command that reports severity or fixed versions | — |
| `package-lock.json`, `npm-shrinkwrap.json` | npm | `npm audit --json --package-lock-only` | OSV scan |
| `pnpm-lock.yaml` | npm | `pnpm audit --json` | OSV scan (best-effort parser) |
| `yarn.lock` | npm | OSV scan | — |
| `Cargo.lock` | crates.io | `cargo audit --json` when installed | OSV scan |
| `poetry.lock`, `uv.lock`, `Pipfile.lock`, pinned `requirements*.txt` | PyPI | OSV scan | — |
| `composer.lock` | Packagist | `composer audit --locked --format=json` | OSV scan |
| `Gemfile.lock` | RubyGems | OSV scan | — |
| `go.mod` | Go | OSV scan (module versions; reachability is out of scope) | — |
| `gradle.lockfile` | Maven | OSV scan | — |
| `packages.lock.json` | NuGet | OSV scan | — |
| `Podfile.lock` | CocoaPods | **not scanned** — no advisory feed exists | — |
| `Package.resolved`, `mix.lock`, `bun.lock` | — | the ecosystem's native tool when installed | **not scanned** with the reason |

"OSV scan" means `references/osv-scan.md`. When the standalone OSV scanner CLI is
installed you may use it instead of the bundled script for the same lockfiles —
same source data — taking its JSON output with whatever flag the installed
version documents.

## Rules for native tools

- Use a native tool only when it is installed and runs **read-only** against the
  lockfile (the commands in the table do). Never substitute an install, update,
  get, or fetch command to "prepare" the tree.
- A native tool that exits non-zero because it found advisories is a success;
  one that fails for any other reason falls back to the OSV scan, and the report
  names the fallback.
- Before running a native tool, create a disposable directory and copy the
  selected current lockfile and required manifests into it, preserving relative
  layout. Copy the working-tree versions, including existing edits, rather than
  checking out HEAD. Resolve inputs inside the repository root; reject escaping
  symlinks. Do not copy secrets, credential/config files, or arbitrary repository
  content. Run the audit in that directory. If the tool requires unavailable
  workspace/config state, use the bundled scanner against the original inputs.
- Discard only the disposable directory created by this run. Never run
  `git checkout`, `git restore`, or `git clean` to undo scan effects in the user's
  tree; pre-existing edits and files must remain byte-for-byte unchanged.
- Native output is normalized into the same fields the OSV scan produces
  (`references/osv-scan.md`): package, installed version, advisory ids and
  aliases, severity, fixed versions, direct or transitive.
