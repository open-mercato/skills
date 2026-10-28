#!/usr/bin/env python3
"""Lockfile -> OSV advisory scan for om-auto-audit-dependencies (step 2 fallback).

Read-only: parses lockfiles, sends only (ecosystem, package, version) triples to
the OSV API, and prints one JSON document on stdout. Python 3 standard library;
TOML lockfiles require Python 3.11 or newer.

Usage:
  python3 -I osv-scan.py [--root DIR] [--api URL] [LOCKFILE ...]

With no LOCKFILE arguments it scans every lockfile git tracks under --root.
Exit code 0 even when advisories are found; 4 for unsupported/incomplete inputs;
2 for argument errors; 3 for incomplete API responses. Only valid JSON is a report.
"""
import argparse
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.request
from urllib.parse import quote

API = "https://api.osv.dev/v1"
NAME_RE = re.compile(r"^[A-Za-z0-9@._/+:-]+$")
VERSION_RE = re.compile(r"^[A-Za-z0-9._+!~-]+$")
LEVELS = {"unrated": 0, "low": 1, "moderate": 2, "high": 3, "critical": 4}
UNPINNED = ("", "", None)

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
            if "node_modules/" not in key or meta.get("link") or "version" not in meta:
                continue
            if str(meta.get("resolved", "")).startswith(("git", "file:", "link:", "workspace:")):
                out.append(UNPINNED)
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
                    name = spec[:at]
                    selector = spec[at + 1:]
                    if selector.startswith("npm:"):
                        selector = selector[4:]
                        alias_at = selector.find("@", 1)
                        if alias_at > 0:
                            name, selector = selector[:alias_at], selector[alias_at + 1:]
                    if not re.fullmatch(r"[A-Za-z0-9.*~^<>=| +_-]+", selector):
                        out.append(UNPINNED)
                        continue
                    names.append(name)
            continue
        m = re.match(r'^  version:?\s+"?([^"\s]+)"?\s*$', line)
        if m and names:
            out.extend((name, m.group(1), None) for name in dict.fromkeys(names))
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


def p_toml_packages(text, ecosystem=None):
    try:
        import tomllib
    except ImportError as exc:
        raise ValueError("TOML lockfiles require Python 3.11 or newer") from exc
    out = []
    for package in tomllib.loads(text).get("package", []):
        name, version, source = package.get("name"), package.get("version"), package.get("source")
        if isinstance(source, dict):
            if any(key in source for key in ("git", "path", "directory", "editable", "virtual", "url")):
                # Poetry's legacy PyPI source is the only supported URL source.
                if source.get("type") != "legacy" or source.get("url", "").rstrip("/") != "https://pypi.org/simple":
                    continue
            elif source.get("registry", "").rstrip("/") != "https://pypi.org/simple":
                continue
        elif isinstance(source, str):
            if source not in ("registry+https://github.com/rust-lang/crates.io-index", "sparse+https://index.crates.io/"):
                continue
        elif ecosystem == "crates.io":
            continue  # workspace/path crates are not published registry releases
        if name and version:
            out.append((name, version, None))
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
    for line in text.replace("\\\n", " ").splitlines():
        line = line.split("#", 1)[0].strip()
        if not line:
            continue
        m = re.fullmatch(r"([A-Za-z0-9._-]+)(?:\[[^\]]*\])?\s*===?\s*([A-Za-z0-9._+!~-]+)(?:\s*;[^\\]*)?(?:\s+--hash=[A-Za-z0-9:]+)*\s*", line)
        if m:
            out.append((m.group(1), m.group(2), True))
        else:
            out.append(UNPINNED)
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
    if re.search(r"^\s*replace\b", text, re.M):
        raise ValueError("go.mod replacements require the native scanner")
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
    epoch, separator, remainder = v.partition("!")
    epoch, v = (int(epoch), remainder) if separator and epoch.isdigit() else (0, v)
    m = re.match(r"^([0-9]+(?:\.[0-9]+)*)(.*)$", v)
    if not m:
        return (epoch, (0,), 0, ((0, v),))
    nums = tuple(int(x) for x in m.group(1).split("."))
    nums = nums + (0,) * (6 - len(nums)) if len(nums) < 6 else nums
    rest = m.group(2).lstrip("-._")
    if not rest:
        return (epoch, nums, 1, ())
    suffix = tuple((1, int(part)) if part.isdigit() else (0, part.lower()) for part in re.findall(r"[0-9]+|[^0-9]+", rest))
    if re.fullmatch(r"(?:post|rev|p|r)\.?[0-9]*", rest, re.I):
        return (epoch, nums, 2, suffix)
    return (epoch, nums, 0, suffix)


def affected_and_fixed(vuln, ecosystem, name, version):
    """Return the fixed versions newer than `version` for this package, or [] if none."""
    fixed = []
    norm = re.sub(r"[-_.]+", "-", name).lower() if ecosystem == "PyPI" else name
    for aff in vuln.get("affected", []):
        pkg = aff.get("package", {})
        pname = pkg.get("name", "")
        if ecosystem == "PyPI":
            pname = re.sub(r"[-_.]+", "-", pname).lower()
        if pkg.get("ecosystem", "").split(":")[0] != ecosystem or pname != norm:
            continue
        for rng in aff.get("ranges", []):
            if rng.get("type") == "GIT":
                continue
            for ev in rng.get("events", []):
                if "fixed" in ev and VERSION_RE.fullmatch(ev["fixed"]) and vkey(ev["fixed"]) > vkey(version):
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


def page_ids(page):
    if not isinstance(page, dict):
        raise ValueError("query result is not an object")
    vulns = page.get("vulns", [])
    token = page.get("next_page_token", "")
    if not isinstance(vulns, list) or not isinstance(token, str):
        raise ValueError("query result has invalid vulnerabilities or page token")
    if any(not isinstance(v, dict) or not isinstance(v.get("id"), str) or not v["id"] for v in vulns):
        raise ValueError("query result has an invalid advisory id")
    return [v["id"] for v in vulns], token


def query_ids(api, queries):
    ids = []
    for start in range(0, len(queries), 1000):
        chunk = queries[start:start + 1000]
        response = post(api, "/querybatch", {"queries": chunk})
        res = response.get("results") if isinstance(response, dict) else None
        if not isinstance(res, list) or len(res) != len(chunk):
            raise ValueError("querybatch answered %s results for %d queries"
                             % (len(res) if isinstance(res, list) else "no", len(chunk)))
        for q, r in zip(chunk, res):
            found, token = page_ids(r)
            seen_tokens = set()
            while token:
                if token in seen_tokens:
                    raise ValueError("query pagination repeated a page token")
                seen_tokens.add(token)
                next_ids, token = page_ids(post(api, "/query", dict(q, page_token=token)))
                found += next_ids
            ids.append(found)
    return ids


def validate_advisory(data):
    if not isinstance(data, dict) or not isinstance(data.get("id"), str) or not data["id"]:
        raise ValueError("advisory has no valid identity")
    for field in ("affected", "aliases", "severity"):
        if not isinstance(data.get(field, []), list):
            raise ValueError("invalid advisory " + field)
    if any(not isinstance(alias, str) for alias in data.get("aliases", [])):
        raise ValueError("invalid advisory aliases")
    if not isinstance(data.get("summary") or "", str):
        raise ValueError("invalid advisory summary")
    if not isinstance(data.get("database_specific") or {}, dict):
        raise ValueError("invalid advisory metadata")
    for severity in data.get("severity", []):
        if not isinstance(severity, dict) or not isinstance(severity.get("score", ""), str):
            raise ValueError("invalid advisory severity")
    for affected in data.get("affected", []):
        if not isinstance(affected, dict) or not isinstance(affected.get("package", {}), dict):
            raise ValueError("invalid affected package")
        if not all(isinstance(affected.get("package", {}).get(k, ""), str) for k in ("name", "ecosystem")):
            raise ValueError("invalid affected package identity")
        for field in ("database_specific", "ecosystem_specific"):
            if not isinstance(affected.get(field) or {}, dict):
                raise ValueError("invalid affected metadata")
        if not isinstance(affected.get("versions", []), list) or not isinstance(affected.get("ranges", []), list):
            raise ValueError("invalid affected versions or ranges")
        for rng in affected.get("ranges", []):
            if not isinstance(rng, dict) or not isinstance(rng.get("events", []), list):
                raise ValueError("invalid affected range")
            for event in rng.get("events", []):
                if not isinstance(event, dict) or any(not isinstance(v, str) for v in event.values()):
                    raise ValueError("invalid affected event")
    return data


# ---------------------------------------------------------------- main

def tracked_lockfiles(root):
    try:
        files = subprocess.run(["git", "-C", root, "ls-files", "-z"], capture_output=True,
                               text=True, check=True).stdout.split("\0")
    except (OSError, subprocess.CalledProcessError):
        files = []
        for d, dirs, names in os.walk(root):
            dirs[:] = [x for x in dirs if x not in {".git", "node_modules", "vendor", ".dart_tool",
                                                    "build", "target", ".venv", "Pods", "dist"}]
            files += [os.path.relpath(os.path.join(d, n), root) for n in names]
    excluded = {".git", "node_modules", "vendor", ".dart_tool", "build", "target", ".venv", "Pods", "dist"}
    return [f for f in files if not (set(Path(f).parts) & excluded)
            and (classify(f) or os.path.basename(f) in UNSUPPORTED)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--api", default=API)
    ap.add_argument("--min-severity", choices=list(LEVELS)[1:], default="high")
    ap.add_argument("lockfiles", nargs="*")
    a = ap.parse_args()
    if not re.match(r"^https://", a.api):
        sys.exit("--api must be an https URL")

    report = {"scanned": [], "skipped": [], "incomplete": [], "findings": [], "invalid_entries": 0, "errors": []}
    root = Path(a.root).resolve()
    entries = []  # (lockfile, ecosystem, name, version, direct)
    for rel in a.lockfiles or tracked_lockfiles(a.root):
        try:
            path = (root / rel).resolve()
            path.relative_to(root)
        except (OSError, ValueError, RuntimeError):
            report["skipped"].append({"lockfile": rel, "reason": "lockfile is outside the repository root"})
            continue
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
            with path.open(encoding="utf-8") as fh:
                text = fh.read()
            rows = p_toml_packages(text, eco) if parser == "toml_packages" else PARSERS[parser](text)
            if not rows:
                raise ValueError("no supported pinned registry packages found")
        except (OSError, ValueError, TypeError, AttributeError, KeyError) as exc:
            report["skipped"].append({"lockfile": rel, "reason": "unreadable or unsupported lockfile (%s)" % exc.__class__.__name__})
            continue
        good = unpinned = 0
        for name, ver, direct in rows:
            if (name, ver, direct) == UNPINNED:
                unpinned += 1
                continue
            if not (isinstance(name, str) and NAME_RE.fullmatch(name) and VERSION_RE.fullmatch(str(ver))):
                report["invalid_entries"] += 1
                continue
            entries.append((rel, eco, name, str(ver), direct))
            good += 1
        if good != len(rows):
            reason = "unpinned or non-registry entries; coverage incomplete" if unpinned else "invalid package entries; coverage incomplete"
            report["skipped"].append({"lockfile": rel, "reason": reason})
        else:
            report["scanned"].append({"lockfile": rel, "ecosystem": eco, "packages": good})

    uniq = sorted({(e[1], e[2], e[3]) for e in entries})
    try:
        ids = query_ids(a.api, [{"package": {"ecosystem": e, "name": n}, "version": v} for e, n, v in uniq])
    except (urllib.error.URLError, OSError, ValueError, KeyError, TypeError, AttributeError) as exc:
        report["errors"].append("OSV query failed (%s)" % exc.__class__.__name__)
        report["scanned"], report["skipped"] = [], report["skipped"] + [
            {"lockfile": s["lockfile"], "reason": "advisory database unreachable"} for s in report["scanned"]]
        report["incomplete"] = list(report["skipped"])
        print(json.dumps(report, indent=2))
        return 3

    cache = {}

    def vuln(vid):
        if vid not in cache:
            record = validate_advisory(get(a.api, "/vulns/" + quote(vid, safe="")))
            if not isinstance(record, dict) or record.get("id") != vid or not isinstance(record.get("affected"), list):
                raise ValueError("invalid advisory detail")
            cache[vid] = record
        return cache[vid]

    def normalized(vids, eco, name, ver):
        advisories = []
        for vid in vids:
            record = vuln(vid)
            if record.get("withdrawn"):
                continue
            aliases = sorted(set(record.get("aliases", [])) - {vid})
            group = {vid, *aliases}
            related = [record]
            for alias in aliases:
                if not alias.startswith("GHSA-"):
                    continue
                try:
                    alias_record = vuln(alias)
                except (urllib.error.URLError, OSError, ValueError, KeyError, TypeError, AttributeError):
                    # Alias-only identifiers are not always standalone OSV records.
                    continue
                if not alias_record.get("withdrawn"):
                    related.append(alias_record)
            severity, score = severity_of(record)
            for alias_record in related[1:]:
                alias_severity, alias_score = severity_of(alias_record)
                if LEVELS.get(alias_severity, 0) > LEVELS.get(severity, 0):
                    severity, score = alias_severity, alias_score
            current = {
                "id": vid, "aliases": aliases, "summary": (record.get("summary") or "").strip()[:200],
                "severity": severity or "unrated", "cvss": score,
                "fixed": sorted({fixed for item in related for fixed in affected_and_fixed(item, eco, name, ver)}, key=vkey),
                "url": "https://osv.dev/vulnerability/" + quote(vid, safe=""), "withdrawn": False,
            }
            overlaps = [adv for adv in advisories if group & {adv["id"], *adv["aliases"]}]
            for previous in overlaps:
                group.update((previous["id"], *previous["aliases"]))
                current["fixed"] = sorted(set(current["fixed"] + previous["fixed"]), key=vkey)
                if LEVELS[previous["severity"]] > LEVELS[current["severity"]]:
                    current["severity"], current["cvss"] = previous["severity"], previous["cvss"]
                current["summary"] = previous["summary"] or current["summary"]
                current["id"], current["url"] = previous["id"], previous["url"]
                advisories.remove(previous)
            current["aliases"] = sorted(group - {current["id"]})
            advisories.append(current)
        return advisories

    hits = {k: v for k, v in zip(uniq, ids) if v}
    for (eco, name, ver), vids in sorted(hits.items()):
        lockfiles = sorted({entry[0] for entry in entries if entry[1:4] == (eco, name, ver)})
        advisories = None
        target = target_all = None
        try:
            advisories = normalized(vids, eco, name, ver)
            candidates = sorted({fixed for adv in advisories for fixed in adv["fixed"]}, key=vkey)
            candidate_ids = query_ids(a.api, [{"package": {"ecosystem": eco, "name": name}, "version": candidate} for candidate in candidates])
            target = target_all = None
            for candidate, remaining_ids in zip(candidates, candidate_ids):
                remaining = normalized(remaining_ids, eco, name, candidate)
                if target is None and not any(LEVELS[adv["severity"]] >= LEVELS[a.min_severity] or adv["severity"] == "unrated" for adv in remaining):
                    target = candidate
                if target_all is None and not remaining:
                    target_all = candidate
        except (urllib.error.URLError, OSError, ValueError, KeyError, TypeError, AttributeError) as exc:
            report["errors"].append("Advisory or target verification failed (%s)" % exc.__class__.__name__)
            report["skipped"].extend({"lockfile": rel, "reason": "advisory details or target verification incomplete"} for rel in lockfiles)
            if advisories is None:
                continue
            target = target_all = None
        if not advisories:
            continue
        direct_values = [entry[4] for entry in entries if entry[1:4] == (eco, name, ver)]
        report["findings"].append({
            "ecosystem": eco, "package": name, "version": ver,
            "lockfiles": lockfiles,
            "direct": True if any(direct_values) else (None if None in direct_values else False),
            "advisories": advisories,
            "target": target, "target_clears_all": target_all,
            "at_threshold": sum(LEVELS[adv["severity"]] >= LEVELS[a.min_severity] for adv in advisories),
        })
    skipped_files = {entry["lockfile"] for entry in report["skipped"]}
    report["scanned"] = [entry for entry in report["scanned"] if entry["lockfile"] not in skipped_files]
    report["incomplete"] = list(report["skipped"])
    print(json.dumps(report, indent=2))
    return 3 if report["errors"] else (4 if report["skipped"] else 0)


if __name__ == "__main__":
    sys.exit(main())
