// Offline contract test for skills/om-auto-audit-dependencies/references/osv-scan.py:
// lockfile parsers, version ordering, CVSS scoring, verified upgrade selection,
// upgrade targets, the CLI flags and exit codes, and the JSON shape osv-scan.md
// documents. The OSV API is replaced by canned responses — CI never hits the network.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(import.meta.dirname, '..')
const docsDir = join(repoRoot, 'skills', 'om-auto-audit-dependencies', 'references')
const script = join(docsDir, 'osv-scan.py')
const scratch = mkdtempSync(join(tmpdir(), 'osv-scan-test-'))

const python = spawnSync('python3', ['--version'], { encoding: 'utf8' })
if (python.status !== 0) {
  console.log('osv-scan contract SKIPPED (python3 not installed)')
  process.exit(0)
}

function write(name, body) {
  const path = join(scratch, name)
  writeFileSync(path, body)
  return path
}

function run(args, options = {}) {
  return spawnSync('python3', ['-I', ...args], { cwd: options.cwd ?? scratch, encoding: 'utf8' })
}

// Python harness: loads the script as a module, swaps the HTTP client for canned
// advisories, and prints a JSON verdict for every unit case plus one full main() run.
const harness = String.raw`
import importlib.util, io, json, sys, contextlib, tempfile
from pathlib import Path
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("osv_scan", sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
P = m.PARSERS
out = {}

out["pubspec"] = P["pubspec"]("""packages:
  http:
    dependency: "direct main"
    description:
      name: http
    source: hosted
    version: "0.13.0"
  meta:
    dependency: transitive
    source: hosted
    version: "1.9.1"
  flutter:
    dependency: "direct main"
    source: sdk
    version: "0.0.0"
sdks:
  dart: ">=3.0.0"
""")
out["npm_v3"] = P["npm_lock"](json.dumps({"lockfileVersion": 3, "packages": {
    "": {"name": "app", "dependencies": {"lodash": "^4"}, "workspaces": ["packages/*"]},
    "node_modules/lodash": {"version": "4.17.15"},
    "node_modules/a/node_modules/minimist": {"version": "1.2.0"},
    "node_modules/utils": {"resolved": "packages/utils", "link": True},
    "packages/utils": {"name": "utils", "version": "1.0.0"}}}))
out["npm_v1"] = P["npm_lock"](json.dumps({"lockfileVersion": 1, "dependencies": {
    "a": {"version": "1.0.0", "dependencies": {"b": {"version": "2.0.0"}}},
    "c": {"version": "git+https://example.invalid/c.git"}}}))
out["yarn_v1"] = P["yarn_lock"]('''# yarn lockfile v1
"@babel/core@^7.0.0", "@babel/core@^7.1.0":
  version "7.1.2"
lodash@^4.17.0:
  version "4.17.15"
''')
out["yarn_berry"] = P["yarn_lock"]('''__metadata:
  version: 6
"lodash@npm:^4.17.0":
  version: 4.17.21
''')
out["pnpm"] = P["pnpm_lock"]('''lockfileVersion: '9.0'
packages:
  lodash@4.17.15:
    resolution: {integrity: sha512-x}
  '@babel/core@7.1.2':
    resolution: {integrity: sha512-y}
snapshots:
  lodash@4.17.15: {}
''')
out["cargo"] = P["toml_packages"]('''version = 3
[[package]]
name = "serde"
version = "1.0.100"
source = "registry+https://github.com/rust-lang/crates.io-index"
[[package]]
name = "mylib"
version = "0.1.0"
source = "git+https://example.invalid/mylib#abc"
[[package]]
name = "app"
version = "0.1.0"
''')
out["poetry"] = P["toml_packages"]('''[[package]]
name = "requests"
version = "2.19.0"

[package.dependencies]
idna = ">=2.5"

[[package]]
name = "private-lib"
version = "0.3.0"

[package.source]
type = "git"
url = "https://example.invalid/private-lib.git"

[metadata]
python-versions = "^3.9"
''')
out["pipfile"] = P["pipfile_lock"](json.dumps({"default": {"django": {"version": "==3.2.0"}},
    "dev" + "elop": {"pytest": {"version": "==7.0.0"}, "local": {"path": "."}}}))
out["requirements"] = P["requirements"]('''Django==3.2.0  # pinned
requests[security]===2.19.0
''')
out["composer"] = P["composer_lock"](json.dumps({"packages": [{"name": "guzzlehttp/guzzle", "version": "v7.4.0"}],
    "packages-dev": [{"name": "acme/tool", "version": "dev-main"}]}))
out["gemfile"] = P["gemfile_lock"]('''GEM
  remote: https://rubygems.org/
  specs:
    nokogiri (1.13.0-x86_64-linux)
      racc (~> 1.4)
    racc (1.6.0)

PLATFORMS
  x86_64-linux

DEPENDENCIES
  nokogiri
''')
out["go_mod"] = P["go_mod"]('''module example.invalid/app
go 1.21
require github.com/single/dep v1.0.0
require (
	golang.org/x/net v0.7.0
	golang.org/x/text v0.3.0 // indirect
)
''')
out["gradle"] = P["gradle_lock"]('''# comment
com.fasterxml.jackson.core:jackson-databind:2.9.0=compileClasspath
empty=
''')
out["nuget"] = P["nuget_lock"](json.dumps({"dependencies": {"net8.0": {
    "Newtonsoft.Json": {"type": "Direct", "resolved": "12.0.1"},
    "System.Text.Json": {"type": "Transitive", "resolved": "6.0.0"},
    "MyProj": {"type": "Project"}}}}))

out["vkey"] = [m.vkey("1.10.0") > m.vkey("1.9.9"), m.vkey("2.0.0-rc1") < m.vkey("2.0.0"),
               m.vkey("1.0.post1") > m.vkey("1.0"), m.vkey("v1.2.3") == m.vkey("1.2.3")]
out["cvss"] = [m.cvss3_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"),
               m.cvss3_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H"),
               m.cvss3_score("CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N"),
               m.cvss3_score("not a vector")]
out["rating"] = [m.rating(9.8), m.rating(7.0), m.rating(5.3), m.rating(3.1), m.rating(0.0)]

def adv(vid, ranges, severity=None, aliases=(), versions=None):
    a = {"package": {"ecosystem": "npm", "name": "pkg"}, "ranges": ranges}
    if versions:
        a["versions"] = versions
    v = {"id": vid, "aliases": list(aliases), "summary": vid + " summary", "affected": [a]}
    if severity:
        v["database_specific"] = {"severity": severity}
    return v

def eco(*events):
    return [{"type": "ECOSYSTEM", "events": [dict([e]) for e in events]}]

# Two release lines: 1.x fixed in 1.5.0, 2.x introduced at 2.0.0 and fixed in 2.3.0.
two_lines = adv("A-2", eco(("introduced", "0"), ("fixed", "1.5.0"), ("introduced", "2.0.0"), ("fixed", "2.3.0")), "HIGH")
only_major = adv("A-3", eco(("introduced", "0"), ("fixed", "3.0.0")), "LOW")
last_aff = adv("A-4", eco(("introduced", "1.0.0"), ("last_affected", "1.4.0")), "HIGH")
def fixture_target(records, installed, remaining):
    # Exercise the public scan path; API fixtures decide affected versions.
    database = {record["id"]: record for record in records}
    def fixture_post(api, path, payload):
        assert path == "/querybatch"
        return {"results": [{"vulns": [{"id": vid} for vid in remaining.get(query["version"], [])]}
                            for query in payload["queries"]]}
    with tempfile.TemporaryDirectory(dir=sys.argv[2]) as root:
        Path(root, "package-lock.json").write_text(json.dumps({"packages": {
            "node_modules/pkg": {"version": installed}}}))
        previous = sys.argv
        sys.argv = ["osv-scan.py", "--root", root, "--min-severity", "low", "package-lock.json"]
        m.post, m.get = fixture_post, lambda api, path: database[path.rsplit("/", 1)[1]]
        buffer = io.StringIO()
        try:
            with contextlib.redirect_stdout(buffer):
                assert m.main() == 0
        finally:
            sys.argv = previous
        return json.loads(buffer.getvalue())["findings"][0]["target"]
out["target"] = [
    fixture_target([two_lines], "1.2.0", {"1.2.0": ["A-2"]}),
    fixture_target([two_lines], "2.1.0", {"2.1.0": ["A-2"]}),
    fixture_target([two_lines, only_major], "1.2.0", {"1.2.0": ["A-2", "A-3"], "1.5.0": ["A-3"], "2.3.0": ["A-3"]}),
    fixture_target([last_aff], "1.2.0", {"1.2.0": ["A-4"]}),
]
out["severity"] = [m.severity_of(adv("S-1", [], "MODERATE"))[0],
                   m.severity_of({"severity": [{"type": "CVSS_V3",
                       "score": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"}]})[0],
                   m.severity_of({"severity": [{"type": "CVSS_V4", "score": "CVSS:4.0/AV:N"}]})[0]]

# Full main() against canned OSV responses.
DB = {
    "A-2": two_lines,
    "A-3": only_major,
    "CVE-1": adv("CVE-1", eco(("introduced", "0"), ("fixed", "1.5.0")), aliases=["GHSA-aaaa"]),
    "GHSA-aaaa": adv("GHSA-aaaa", eco(("introduced", "0"), ("fixed", "1.5.0")), "CRITICAL", aliases=["CVE-1"]),
    "W-1": dict(adv("W-1", eco(("introduced", "0"), ("fixed", "9.0.0")), "CRITICAL"), withdrawn="2026-01-01"),
}
def fake_post(api, path, payload):
    if path == "/querybatch":
        res = []
        for q in payload["queries"]:
            hit = q["package"]["name"] == "pkg" and q["version"] == "1.2.0"
            ids = ("A-2", "A-3", "CVE-1", "W-1") if hit else (("A-3",) if q["package"]["name"] == "pkg" and q["version"] in ("1.5.0", "2.3.0") else ())
            res.append({"vulns": [{"id": vid} for vid in ids]})
        return {"results": res}
    raise AssertionError("unexpected POST " + path)
def fake_get(api, path):
    return DB[path.rsplit("/", 1)[1]]
m.post, m.get = fake_post, fake_get
sys.argv = ["osv-scan.py", "--root", sys.argv[2], "--min-severity", "high", "package-lock.json", "ios/Podfile.lock"]
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    code = m.main()
out["main"] = {"exit": code, "report": json.loads(buf.getvalue())}
print(json.dumps(out))
`

try {
  const harnessPath = write('harness.py', harness)
  write('package-lock.json', JSON.stringify({
    lockfileVersion: 3,
    packages: {
      '': { name: 'app', dependencies: { pkg: '^1.0.0' } },
      'node_modules/pkg': { version: '1.2.0' },
      'node_modules/safe': { version: '1.0.0' },
    },
  }))
  const result = run([harnessPath, script, scratch])
  assert.equal(result.status, 0, `harness failed:\n${result.stderr}`)
  const out = JSON.parse(result.stdout)
  const rows = (key) => out[key].map((r) => r.join('|'))

  // Parsers: (name, version, direct) rows.
  assert.deepEqual(rows('pubspec'), ['http|0.13.0|true', 'meta|1.9.1|false'], 'pubspec: hosted only, direct from dependency')
  assert.deepEqual(rows('npm_v3'), ['lodash|4.17.15|true', 'minimist|1.2.0|false'],
    'npm v3: nested installs are transitive; workspace links and member folders are not registry packages')
  assert.deepEqual(rows('npm_v1'), ['a|1.0.0|', 'b|2.0.0|false'], 'npm v1: walk nested deps, skip git/file versions')
  assert.deepEqual(rows('yarn_v1'), ['@babel/core|7.1.2|', 'lodash|4.17.15|'], 'yarn v1: scoped names and multi-spec headers')
  assert.deepEqual(rows('yarn_berry'), ['lodash|4.17.21|'], 'yarn berry: npm: protocol and __metadata skipped')
  assert.deepEqual(rows('pnpm'), ['lodash|4.17.15|', '@babel/core|7.1.2|'], 'pnpm v9: packages section only, scoped names')
  assert.deepEqual(rows('cargo'), ['serde|1.0.100|', 'app|0.1.0|'], 'Cargo.lock: git sources skipped')
  assert.deepEqual(rows('poetry'), ['requests|2.19.0|'],
    'poetry.lock: [package.source] git packages skipped; subtable keys never read as name/version')
  assert.deepEqual(rows('pipfile'), ['django|3.2.0|', 'pytest|7.0.0|'], 'Pipfile.lock: default + dev sections, pinned only')
  assert.deepEqual(rows('requirements'), ['Django|3.2.0|true', 'requests|2.19.0|true'], 'requirements: exact pins only')
  assert.deepEqual(rows('composer'), ['guzzlehttp/guzzle|7.4.0|'], 'composer.lock: v prefix stripped, dev- branches skipped')
  assert.deepEqual(rows('gemfile'), ['nokogiri|1.13.0|true', 'racc|1.6.0|false'], 'Gemfile.lock: platform suffix stripped')
  assert.deepEqual(rows('go_mod'), ['github.com/single/dep|1.0.0|true', 'golang.org/x/net|0.7.0|true', 'golang.org/x/text|0.3.0|false'],
    'go.mod: single and block requires, // indirect is transitive')
  assert.deepEqual(rows('gradle'), ['com.fasterxml.jackson.core:jackson-databind|2.9.0|'], 'gradle.lockfile: group:artifact')
  assert.deepEqual(rows('nuget'), ['Newtonsoft.Json|12.0.1|true', 'System.Text.Json|6.0.0|false'], 'packages.lock.json: projects skipped')

  // Versions and severity.
  assert.deepEqual(out.vkey, [true, true, true, true], 'vkey: numeric, pre-release, post-release, v-prefix ordering')
  assert.deepEqual(out.cvss, [9.8, 10, 3.1, null], 'cvss3_score: spec base scores, invalid vector → null')
  assert.deepEqual(out.rating, ['critical', 'high', 'moderate', 'low', null], 'rating thresholds')
  assert.deepEqual(out.severity, ['moderate', 'critical', null], 'severity: label wins, CVSS v3 scored, CVSS v4-only unrated')

  // Affected ranges and upgrade targets.
  assert.deepEqual(out.target, ['1.5.0', '2.3.0', '3.0.0', null],
    'public scan: smallest verified candidate across release lines; no invented target when none is verified')

  // Full run against canned OSV data.
  const { exit, report } = out.main
  assert.equal(exit, 4, 'main: unsupported lockfile reports incomplete coverage while preserving scanned results')
  assert.deepEqual(report.skipped, [{ lockfile: 'ios/Podfile.lock', reason: 'CocoaPods has no advisory feed in OSV' }])
  assert.deepEqual(report.scanned, [{ lockfile: 'package-lock.json', ecosystem: 'npm', packages: 2 }])
  assert.equal(report.findings.length, 1, 'main: only the vulnerable package becomes a finding')
  const finding = report.findings[0]
  for (const key of ['ecosystem', 'package', 'version', 'lockfiles', 'direct', 'advisories', 'target', 'target_clears_all', 'at_threshold']) {
    assert.ok(key in finding, `finding: documented field ${key} is present`)
  }
  assert.deepEqual(finding.advisories.map((a) => a.id), ['A-2', 'A-3', 'CVE-1'],
    'main: aliases merged into one advisory, withdrawn advisories dropped')
  assert.equal(finding.advisories[2].severity, 'critical', 'main: unrated advisory takes its GHSA alias rating')
  assert.equal(finding.direct, true)
  assert.equal(finding.at_threshold, 2, 'main: high + critical count at threshold high; the low one does not')
  assert.equal(finding.target, '1.5.0', 'main: target clears the at-threshold advisories')
  assert.equal(finding.target_clears_all, '3.0.0', 'main: target_clears_all also clears the low advisory')

  // CLI contract: the documented invocation parses, bad input is a usage error (2),
  // an unreachable database is 3 with valid JSON on stdout.
  const unreachable = run([script, '--root', scratch, '--min-severity', 'high', '--api', 'https://127.0.0.1:9', 'package-lock.json'])
  assert.equal(unreachable.status, 3, `unreachable database exits 3\n${unreachable.stderr}`)
  const skipped = JSON.parse(unreachable.stdout).skipped
  assert.deepEqual(skipped, [{ lockfile: 'package-lock.json', reason: 'advisory database unreachable' }])
  assert.equal(run([script, '--min-severity', 'severe']).status, 2, 'unknown severity is a usage error')
  assert.equal(run([script, '--api', 'http://insecure.invalid']).status, 1, 'non-https API refused')

  // The documented invocation must name only flags the script accepts.
  const help = run([script, '--help']).stdout
  for (const flag of ['--root', '--api', '--min-severity']) {
    assert.ok(help.includes(flag), `osv-scan.py --help lists ${flag}`)
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
}

console.log('osv-scan contract OK (15 lockfile fixtures across 12 parsers, versions, CVSS, verified targets, CLI exit codes)')
