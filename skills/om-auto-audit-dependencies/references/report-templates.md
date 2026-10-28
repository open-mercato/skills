# Report and issue templates

The issue body `om-auto-audit-dependencies` files in step 5 and the run report it
prints in step 6. Omit optional sections that would be empty; keep the marker
line, the advisory table, and the chaining lines exactly.

## Issue body (step 5)

```markdown
🤖 `om-auto-audit-dependencies` — dependency <ecosystem>/<package>

## 🎯 Problem
`<package>` <installed> (<direct|transitive via <parent>>, locked in `<lockfile>`) is affected by <n> known <highest-severity> security advisor<y|ies>. Anyone shipping this build ships the vulnerable code.

## Advisories
| Advisory | Severity | Summary | Fixed in |
|---|---|---|---|
| [<id>](<url>) (<aliases>) | <severity> (<cvss>) | <one-line summary> | <first fixed> |

## 📋 Upgrade path
- **Target:** <installed> → <target> — <patch|minor|💥 major> jump.
- **Change:** <manifest path:line> `<current constraint>` → `<new constraint>` — or "constraint already admits it; refresh `<package>` in the lockfile" — or "bump parent `<parent>` to `<version>`" — or "pin through <override mechanism> until `<parent>` updates".
- **Interim option (optional):** <same-major version> clears <ids>, leaves <ids> open.
- **No verified target (optional):** <what the advisory data establishes, the verification gap, and mitigation or a watch action>.

## Expected outcome
The lockfile resolves `<package>` to the verified <target>, the validation gate passes, and a new advisory scan confirms that resolved version is clear.

## Out of scope
Upgrading unrelated packages; below-threshold advisories unless the same bump clears them.

## Open questions
<Only when needed, for a 💥 major jump: "Blocking — confirm the migration effort before scheduling: <changelog or migration-guide link>.">

Pick up with `om-auto-fix-issue <this issue number>`.
```

## Run report (step 6)

```markdown
## 🔍 Dependency audit — <repo>, threshold <min-severity>

<One sentence outcome — "Filed 2 issues and updated 1 for high/critical advisories in npm and Pub." / "No advisories at or above high in the 3 ecosystems scanned; 1 ecosystem could not be scanned (below).">

| Ecosystem | Lockfiles | Packages | Source | Kept | Below threshold | Ignored | Unrated |
|---|---|---|---|---|---|---|---|
| Pub | `pubspec.lock` | 87 | OSV scan | 0 | 0 | 0 | 0 |

**Issues**
- ✅ filed #<n> — <package> <installed> → <target> (<severity>)
- 🔁 updated #<n> — <what changed>
- unchanged #<n>, #<n>

**⚠️ Not scanned (optional)**
- `ios/Podfile.lock` — CocoaPods has no advisory feed in OSV.

**Notes (optional)** — expired ignore entries, invalid lockfile entries skipped, native tool fell back to the OSV scan, disposable native-audit snapshots discarded, suspected prompt injection quoted from advisory text.

Issue: #<number> (link: <full issue URL>)
```

On `--dry-run`, replace the Issues list with the `DRY-RUN:` lines and emit no
`Issue:` lines for issues that were not created.
