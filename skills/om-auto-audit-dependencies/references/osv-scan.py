#!/usr/bin/env python3
"""Lockfile -> OSV advisory scan for om-auto-audit-dependencies (step 2 fallback).

Read-only: parses lockfiles, sends only (ecosystem, package, version) triples to
the OSV API, and prints one JSON document on stdout. Python 3 stdlib only.

Usage:
  python3 -I osv-scan.py [--root DIR] [--api URL] [LOCKFILE ...]

With no LOCKFILE arguments it scans every lockfile git tracks under --root.
Exit code 0 even when advisories are found; 2 when the API was unreachable for
every query (the caller reports the ecosystems as "not scanned").
"""
import argparse
import json
import math
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

API = "https://api.osv.dev/v1"
NAME_RE = re.compile(r"^[A-Za-z0-9@._/+:-]+$")
VERSION_RE = re.compile(r"^[A-Za-z0-9._+~-]+$")

# basename (or glob-ish suffix) -> (ecosystem, parser name)
LOCKFILES = {
    "pubspec.lock": ("Pub", "pubspec"),
    "package-lock.json": ("npm", "npm_lock"),
    "npm-shrinkwrap.json": ("npm", "npm_lock"),
    "yarn.lock": ("npm", "yarn_lock"),
    "pnpm-lock.yaml": ("npm", "pnpm_lock"),
    "Cargo.lock": ("crates.io", "toml_packages"),
    "poetry.lock": ("PyPI", "toml_packages"),
    "uv.lock": ("PyPI", "toml_packages"),
    "Pipfile.lock": ("PyPI", "pipfile_lock"),
    "composer.lock": ("Packagist", "composer_lock"),
    "Gemfile.lock": ("RubyGems", "gemfile_lock"),
    "go.mod": ("Go", "go_mod"),
    "gradle.lockfile": ("Maven", "gradle_lock"),
    "packages.lock.json": ("NuGet", "nuget_lock"),
}
UNSUPPORTED = {
    "Podfile.lock": "CocoaPods has no advisory feed in OSV",
    "Package.resolved": "SwiftPM pins git revisions; OSV matching needs the native tool",
    "mix.lock": "no bundled parser; use the native tool",
    "bun.lock": "no bundled parser; use the native tool",
}


def classify(path):
    base = os.path.basename(path)
    if base in LOCKFILES:
        return LOCKFILES[base]
    if re.match(r"^requirements[^/]*\.txt$", base):
        return ("PyPI", "requirements")
    return None


# ---------------------------------------------------------------- parsers
# Each parser returns a list of (name, version, direct) with direct True/False/None.

def p_pubspec(text):
    out, cur, body = [], None, {}
    in_pkgs = False
    for line in text.splitlines():
        if line.startswith("packages:"):
            in_pkgs = True
            continue
        if in_pkgs and line and not line.startswith(" "):
            break
        if not in_pkgs:
            continue
        m = re.match(r"^  ([A-Za-z0-9_]+):\s*$", line)
        if m:
            if cur:
                out.append(_pub_entry(cur, body))
            cur, body = m.group(1), {}
            continue
        m = re.match(r"^    (dependency|source|version):\s*\"?([^\"]*)\"?\s*$", line)
        if m and cur:
            body[m.group(1)] = m.group(2)
    if cur:
        out.append(_pub_entry(cur, body))
    return [e for e in out if e]


def _pub_entry(name, body):
    if body.get("source") != "hosted" or not body.get("version"):
        return None  # sdk, git, and path packages have no registry advisories
    dep = body.get("dependency", "")
    return (name, body["version"], dep.startswith("direct") if dep else None)


def p_npm_lock(text):
    data = json.loads(text)
    out = []
    pkgs = data.get("packages")
    if pkgs:
        root = pkgs.get("", {})
        direct = set(root.get("dependencies", {})) | set(root.get("devDependencies", {})) \
            | set(root.get("optionalDependencies", {}))
        for key, meta in pkgs.items():
            if not key or meta.get("link") or "version" not in meta:
                continue
            name = meta.get("name") or key.rsplit("node_modules/", 1)[-1]
            out.append((name, meta["version"], key == "node_modules/" + name and name in direct))
        return out

    def walk(deps, top):  # lockfileVersion 1
        for name, meta in (deps or {}).items():
            if "version" in meta and not str(meta["version"]).startswith(("file:", "git", "http")):
                out.append((name, meta["version"], None if top else False))
            walk(meta.get("dependencies"), False)
    walk(data.get("dependencies"), True)
    return out


def p_yarn_lock(text):
    out, names = [], []
    for line in text.splitlines():
        if line and not line.startswith((" ", "#")) and line.rstrip().endswith(":"):
            names = []
            for spec in line.rstrip()[:-1].split(","):
                spec = spec.strip().strip('"')
                if spec.startswith("__metadata"):
                    continue
                at = spec.find("@", 1)
                if at > 0:
                    names.append(spec[:at])
            continue
        m = re.match(r'^  version:?\s+"?([^"\s]+)"?\s*$', line)
        if m and names:
            out.append((names[0], m.group(1), None))
            names = []
    return out


def p_pnpm_lock(text):
    out, in_pkgs = [], False
    for line in text.splitlines():
        if re.match(r"^(packages|snapshots):\s*$", line):
            in_pkgs = line.startswith("packages")
            continue
        if line and not line.startswith(" "):
            in_pkgs = False
        if not in_pkgs:
            continue
        m = re.match(r"^  '?/?((?:@[^@/\s']+/)?[^@/\s'(]+)[@/]([0-9][^\s:'(]*)", line)
        if m:
            out.append((m.group(1), m.group(2), None))
    return out


def p_toml_packages(text):
    out, name, ver = [], None, None
    for line in text.splitlines() + ["[[package]]"]:
        if line.strip() == "[[package]]":
            if name and ver:
                out.append((name, ver, None))
            name = ver = None
            continue
        m = re.match(r'^(name|version)\s*=\s*"([^"]+)"', line)
        if m:
            if m.group(1) == "name":
                name = m.group(2)
            else:
                ver = m.group(2)
        elif line.startswith("source") and "registry" not in line and "pypi" not in line.lower():
            # git / path sources are not registry releases
            if "git" in line or "path" in line:
                name = None
    return out


def p_pipfile_lock(text):
    data = json.loads(text)
    out = []
    for section in ("default", "dev" + "elop"):
        for name, meta in (data.get(section) or {}).items():
            v = str(meta.get("version", ""))
            if v.startswith("=="):
                out.append((name, v[2:], None))
    return out


def p_requirements(text):
    out = []
    for line in text.splitlines():
        line = line.split("#", 1)[0].strip()
        m = re.match(r"^([A-Za-z0-9._-]+)(\[[^\]]*\])?\s*===?\s*([A-Za-z0-9._+!-]+)", line)
        if m:
            out.append((m.group(1), m.group(3), True))
    return out


def p_composer_lock(text):
    data = json.loads(text)
    out = []
    for section in ("packages", "packages-dev"):
        for meta in data.get(section) or []:
            v = str(meta.get("version", "")).lstrip("v")
            if meta.get("name") and v and not v.startswith("dev-"):
                out.append((meta["name"], v, None))
    return out


def p_gemfile_lock(text):
    out, direct, section = [], set(), None
    for line in text.splitlines():
        if line and not line.startswith(" "):
            section = line.strip()
            continue
        if section == "GEM":
            m = re.match(r"^    ([A-Za-z0-9._-]+) \(([^)]+)\)\s*$", line)
            if m:
                out.append((m.group(1), m.group(2).split("-")[0], None))
        elif section == "DEPENDENCIES":
            m = re.match(r"^  ([A-Za-z0-9._-]+)", line)
            if m:
                direct.add(m.group(1))
    return [(n, v, n in direct) for n, v, _ in out]


def p_go_mod(text):
    out, block = [], False
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("require ("):
            block = True
            continue
        if block and s == ")":
            block = False
            continue
        m = None
        if block:
            m = re.match(r"^(\S+)\s+(v\S+)(.*)$", s)
        elif s.startswith("require "):
            m = re.match(r"^require\s+(\S+)\s+(v\S+)(.*)$", s)
        if m:
            out.append((m.group(1), m.group(2).lstrip("v"), "// indirect" not in m.group(3)))
    return out


def p_gradle_lock(text):
    out = []
    for line in text.splitlines():
        m = re.match(r"^([^#:=\s]+):([^:=\s]+):([^:=\s]+)=", line)
        if m:
            out.append((m.group(1) + ":" + m.group(2), m.group(3), None))
    return out


def p_nuget_lock(text):
    data = json.loads(text)
    seen = {}
    for deps in (data.get("dependencies") or {}).values():
        for name, meta in deps.items():
            v = meta.get("resolved")
            if v and meta.get("type") != "Project":
                seen[(name, v)] = seen.get((name, v)) or meta.get("type") == "Direct"
    return [(n, v, d) for (n, v), d in seen.items()]


PARSERS = {k[2:]: v for k, v in globals().items() if k.startswith("p_")}


# ---------------------------------------------------------------- versions

def vkey(v):
    """Approximate ordering across semver, PEP 440, and dotted versions."""
    v = str(v).lstrip("vV").split("+", 1)[0]
    m = re.match(r"^([0-9]+(?:\.[0-9]+)*)(.*)$", v)
    if not m:
        return ((0,), 0, v)
    nums = tuple(int(x) for x in m.group(1).split("."))
    nums = nums + (0,) * (6 - len(nums)) if len(nums) < 6 else nums
    rest = m.group(2).lstrip("-._")
    if not rest:
        return (nums, 1, "")
    if re.match(r"^(post|p|r)[0-9]*", rest, re.I):  # post-releases sort after the release
        return (nums, 2, rest)
    return (nums, 0, rest)  # pre-release / dev sorts before the release


def affected_and_fixed(vuln, ecosystem, name, version):
    """Return the fixed versions newer than `version` for this package, or [] if none."""
    fixed = []
    norm = name.lower().replace("_", "-") if ecosystem == "PyPI" else name
    for aff in vuln.get("affected", []):
        pkg = aff.get("package", {})
        pname = pkg.get("name", "")
        if ecosystem == "PyPI":
            pname = pname.lower().replace("_", "-")
        if pkg.get("ecosystem", "").split(":")[0] != ecosystem or pname != norm:
            continue
        for rng in aff.get("ranges", []):
            if rng.get("type") == "GIT":
                continue
            for ev in rng.get("events", []):
                if "fixed" in ev and vkey(ev["fixed"]) > vkey(version):
                    fixed.append(ev["fixed"])
    return sorted(set(fixed), key=vkey)


# ---------------------------------------------------------------- severity

CVSS3_W = {
    "AV": {"N": 0.85, "A": 0.62, "L": 0.55, "P": 0.2},
    "AC": {"L": 0.77, "H": 0.44},
    "UI": {"N": 0.85, "R": 0.62},
    "C": {"H": 0.56, "L": 0.22, "N": 0.0},
}


def _roundup(x):
    i = int(round(x * 100000))
    return i / 100000.0 if i % 10000 == 0 else (math.floor(i / 10000) + 1) / 10.0


def cvss3_score(vector):
    try:
        m = dict(p.split(":", 1) for p in vector.split("/")[1:])
        changed = m["S"] == "C"
        pr = {"N": 0.85, "L": 0.68 if changed else 0.62, "H": 0.5 if changed else 0.27}[m["PR"]]
        iss = 1 - (1 - CVSS3_W["C"][m["C"]]) * (1 - CVSS3_W["C"][m["I"]]) * (1 - CVSS3_W["C"][m["A"]])
        impact = 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15 if changed else 6.42 * iss
        expl = 8.22 * CVSS3_W["AV"][m["AV"]] * CVSS3_W["AC"][m["AC"]] * pr * CVSS3_W["UI"][m["UI"]]
        if impact <= 0:
            return 0.0
        raw = 1.08 * (impact + expl) if changed else impact + expl
        return _roundup(min(raw, 10))
    except (KeyError, ValueError, IndexError):
        return None


def rating(score):
    if score is None:
        return None
    if score >= 9.0:
        return "critical"
    if score >= 7.0:
        return "high"
    if score >= 4.0:
        return "moderate"
    return "low" if score > 0 else None


def severity_of(vuln):
    label = (vuln.get("database_specific") or {}).get("severity")
    for aff in vuln.get("affected", []):
        label = label or (aff.get("ecosystem_specific") or {}).get("severity") \
            or (aff.get("database_specific") or {}).get("severity")
    score = None
    for s in vuln.get("severity", []):
        if s.get("type") == "CVSS_V3":
            score = cvss3_score(s.get("score", ""))
    if isinstance(label, str):
        lab = label.strip().lower()
        lab = {"medium": "moderate", "important": "high"}.get(lab, lab)
        if lab in ("low", "moderate", "high", "critical"):
            return lab, score
    return rating(score), score


# ---------------------------------------------------------------- OSV client

def post(api, path, payload):
    req = urllib.request.Request(api + path, json.dumps(payload).encode(),
                                 {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def get(api, path):
    with urllib.request.urlopen(api + path, timeout=60) as r:
        return json.load(r)


def query_ids(api, queries):
    ids = []
    for start in range(0, len(queries), 1000):
        chunk = queries[start:start + 1000]
        res = post(api, "/querybatch", {"queries": chunk})["results"]
        for q, r in zip(chunk, res):
            found = [v["id"] for v in r.get("vulns", [])]
            token = r.get("next_page_token")
            while token:
                page = post(api, "/query", dict(q, page_token=token))
                found += [v["id"] for v in page.get("vulns", [])]
                token = page.get("next_page_token")
            ids.append(found)
    return ids


# ---------------------------------------------------------------- main

def tracked_lockfiles(root):
    try:
        files = subprocess.run(["git", "-C", root, "ls-files"], capture_output=True,
                               text=True, check=True).stdout.splitlines()
    except (OSError, subprocess.CalledProcessError):
        files = []
        for d, dirs, names in os.walk(root):
            dirs[:] = [x for x in dirs if x not in {".git", "node_modules", "vendor", ".dart_tool",
                                                    "build", "target", ".venv", "Pods", "dist"}]
            files += [os.path.relpath(os.path.join(d, n), root) for n in names]
    return [f for f in files if classify(f) or os.path.basename(f) in UNSUPPORTED]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--api", default=API)
    ap.add_argument("lockfiles", nargs="*")
    a = ap.parse_args()
    if not re.match(r"^https://", a.api):
        sys.exit("--api must be an https URL")

    report = {"scanned": [], "skipped": [], "findings": [], "invalid_entries": 0, "errors": []}
    entries = []  # (lockfile, ecosystem, name, version, direct)
    for rel in a.lockfiles or tracked_lockfiles(a.root):
        base = os.path.basename(rel)
        if base in UNSUPPORTED:
            report["skipped"].append({"lockfile": rel, "reason": UNSUPPORTED[base]})
            continue
        kind = classify(rel)
        if not kind:
            report["skipped"].append({"lockfile": rel, "reason": "not a recognized lockfile"})
            continue
        eco, parser = kind
        try:
            with open(os.path.join(a.root, rel), encoding="utf-8") as fh:
                rows = PARSERS[parser](fh.read())
        except (OSError, ValueError) as exc:
            report["skipped"].append({"lockfile": rel, "reason": "unreadable: %s" % exc.__class__.__name__})
            continue
        good = 0
        for name, ver, direct in rows:
            if not (NAME_RE.match(name) and VERSION_RE.match(str(ver))):
                report["invalid_entries"] += 1
                continue
            entries.append((rel, eco, name, str(ver), direct))
            good += 1
        report["scanned"].append({"lockfile": rel, "ecosystem": eco, "packages": good})

    uniq = sorted({(e[1], e[2], e[3]) for e in entries})
    try:
        ids = query_ids(a.api, [{"package": {"ecosystem": e, "name": n}, "version": v} for e, n, v in uniq])
    except (urllib.error.URLError, OSError, ValueError, KeyError) as exc:
        report["errors"].append("OSV query failed: %s" % exc)
        report["scanned"], report["skipped"] = [], report["skipped"] + [
            {"lockfile": s["lockfile"], "reason": "advisory database unreachable"} for s in report["scanned"]]
        print(json.dumps(report, indent=2))
        return 2

    cache = {}

    def vuln(vid):
        if vid not in cache:
            try:
                cache[vid] = get(a.api, "/vulns/" + urllib.request.quote(vid))
            except (urllib.error.URLError, OSError, ValueError) as exc:
                report["errors"].append("detail %s: %s" % (vid, exc))
                cache[vid] = {"id": vid}
        return cache[vid]

    hits = {k: v for k, v in zip(uniq, ids) if v}
    for (eco, name, ver), vids in sorted(hits.items()):
        advisories, seen = [], set()
        for vid in vids:
            v = vuln(vid)
            aliases = sorted(set(v.get("aliases", [])) - {vid})
            group = {vid, *aliases}
            if group & seen:
                continue  # same advisory reached through another alias
            seen |= group
            sev, score = severity_of(v)
            if sev is None:  # fall back to a rated alias (GHSA usually carries one)
                for al in aliases:
                    if al.startswith("GHSA-"):
                        sev, score = severity_of(vuln(al))
                        if sev:
                            break
            advisories.append({
                "id": vid, "aliases": aliases,
                "summary": (v.get("summary") or "").strip()[:200],
                "severity": sev or "unrated", "cvss": score,
                "fixed": affected_and_fixed(v, eco, name, ver),
                "url": "https://osv.dev/vulnerability/" + vid,
                "withdrawn": bool(v.get("withdrawn")),
            })
        advisories = [x for x in advisories if not x["withdrawn"]]
        if not advisories:
            continue
        where = sorted({(e[0], e[4]) for e in entries if (e[1], e[2], e[3]) == (eco, name, ver)})
        report["findings"].append({
            "ecosystem": eco, "package": name, "version": ver,
            "lockfiles": [w[0] for w in where],
            "direct": True if any(w[1] for w in where) else (None if any(w[1] is None for w in where) else False),
            "advisories": advisories,
        })
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
