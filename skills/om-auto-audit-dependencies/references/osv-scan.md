# OSV scan and finding normalization

How `om-auto-audit-dependencies` collects advisories for ecosystems with no
usable native audit tool (step 2) and merges every source into one finding list
(step 3).

## Running the bundled scanner

`references/osv-scan.py` (Python 3, standard library only) parses the
lockfiles, queries the OSV database with `(ecosystem, package, version)` triples
only, and prints one JSON document. Run it in isolated mode from the repository
root, passing the lockfiles chosen in step 1 (none → every tracked lockfile):

```bash
python3 -I "<this skill's directory>/references/osv-scan.py" \
  --root . --min-severity "$MIN_SEVERITY" pubspec.lock app/package-lock.json > "$RUN_TMP/osv.json"
```

Exit code 2 means the database was unreachable: every lockfile lands in
`skipped` with reason `advisory database unreachable`, and the report names
those ecosystems as **not scanned** — never as clean.

Output shape:

```json
{
  "scanned":  [{"lockfile": "pubspec.lock", "ecosystem": "Pub", "packages": 87}],
  "skipped":  [{"lockfile": "ios/Podfile.lock", "reason": "CocoaPods has no advisory feed in OSV"}],
  "invalid_entries": 0,
  "errors":   [],
  "findings": [{
    "ecosystem": "npm", "package": "lodash", "version": "4.17.15",
    "lockfiles": ["package-lock.json"], "direct": true,
    "advisories": [{"id": "GHSA-…", "aliases": ["CVE-…"], "summary": "…",
                    "severity": "high", "cvss": 7.4, "fixed": ["4.17.19", "4.17.21"],
                    "url": "https://osv.dev/vulnerability/GHSA-…", "withdrawn": false}],
    "target": "4.17.21", "target_clears_all": "4.17.21", "at_threshold": 2
  }]
}
```

- `direct` is `true`, `false`, or `null` when the lockfile format does not say
  (`Cargo.lock`, `composer.lock`, `yarn.lock`, …); resolve `null` from the
  manifest in step 4.
- `target` is the smallest published fixed version that no advisory at or above
  `--min-severity` still affects; `null` means no such version exists.
  `target_clears_all` does the same across every severity.
- Version ordering in the script is an approximation that covers semver, dotted,
  and common PEP 440 forms; when an ecosystem's ordering is exotic (epochs,
  calendar tags), confirm the target against the advisory page before filing.

## Severity

Taken in this order, first hit wins:

1. The advisory's own label (`database_specific.severity`, or the affected
   entry's `ecosystem_specific` / `database_specific` severity). `MEDIUM` →
   `moderate`.
2. A CVSS v3 vector, scored to its base score: ≥9.0 critical, ≥7.0 high, ≥4.0
   moderate, otherwise low.
3. The rating of a `GHSA-` alias.
4. Otherwise `unrated` — reported with its link, never filed, never dropped
   silently.

Native tools that report their own severity keep it, mapped onto the same four
levels.

## Merging into findings (step 3)

- One finding per `(ecosystem, package, installed version)`. The same package at
  two versions is two findings that share one issue in step 5.
- An advisory reached under several ids (`GHSA-…`, `CVE-…`, an ecosystem id) is
  one advisory; keep the first id and list the rest as aliases. When a native
  tool and the OSV scan both report it, keep the record with the richer fix data.
- Drop withdrawn advisories.
- Drop advisories whose id or any alias matches an active `dependencyAudit.ignore`
  entry; count them per entry for the report.
- A finding is **kept** when at least one remaining advisory is at or above the
  threshold. Kept findings go to step 4; the rest are counted as below threshold.
