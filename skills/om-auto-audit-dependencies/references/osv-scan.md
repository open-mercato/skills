# OSV scan and finding normalization

How `om-auto-audit-dependencies` collects advisories for ecosystems with no
usable native audit tool (step 2) and merges every source into one finding list
(step 3).

## Running the bundled scanner

`references/osv-scan.py` (Python 3, standard library only; TOML lockfiles require
Python 3.11+) parses the
lockfiles, queries the OSV database with `(ecosystem, package, version)` triples
only, and prints one JSON document. Run it in isolated mode from the repository
root, passing the lockfiles chosen in step 1 (none → every tracked lockfile):

```bash
RUN_TMP=$(mktemp -d)
# Retain the JSON until the run report is assembled; remove this directory only.
python3 -I "<this skill's directory>/references/osv-scan.py" \
  --root . --min-severity "$MIN_SEVERITY" pubspec.lock app/package-lock.json > "$RUN_TMP/osv.json"
```

Exit code 3 means advisory queries/details or target verification failed. Exit
code 4 means unsupported/incomplete inputs; code 2 is an argument error. Treat stdout
as a report only after parsing valid JSON with the documented keys; an argument
error with no JSON is an execution failure. Inspect `skipped` and `errors`,
retain results from successfully scanned lockfiles, and report each skipped
lockfile as **not scanned**. Unreachable/malformed responses, failed advisory
details, unsupported formats, invalid entries, unpinned requirements and escaping
paths are never reported as clean. Zero supported packages is also a skip.
Non-registry/local sources are outside registry-version matching; Go replacements
and non-registry Yarn/npm entries require a native scanner. Do not install tools
to fill these gaps. An incomplete native result may still contribute findings,
but does not establish complete coverage.

Output shape:

```json
{
  "scanned":  [{"lockfile": "pubspec.lock", "ecosystem": "Pub", "packages": 87}],
  "skipped":  [{"lockfile": "ios/Podfile.lock", "reason": "CocoaPods has no advisory feed in OSV"}],
  "invalid_entries": 0,
  "incomplete": [],
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
- `target` is the lowest ordered candidate among the advisory's fixed versions
  for which an OSV re-query reports no remaining at-threshold or unrated advisory.
  `target_clears_all` requires no remaining advisory at any severity. `null` means
  no candidate was verified, not proof that no fixed release exists. Confirm
  publication and ecosystem-specific ordering before filing an upgrade issue.
- `at_threshold` counts rated advisories meeting `--min-severity`; below-threshold
  and unrated records remain in `advisories` for the run's coverage accounting.
- Version ordering in the script is an approximation that covers semver, dotted,
  and common PEP 440 forms; when an ecosystem's ordering is exotic (epochs,
  calendar tags), confirm the target against the advisory page and registry before filing.

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

CVSS v2/v4 vectors are not scored by the bundled script. Without a source label
or a rated GHSA alias, these records remain explicitly unrated in the report.

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
