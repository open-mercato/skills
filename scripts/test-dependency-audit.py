#!/usr/bin/env python3
"""Offline fixtures for the dependency scanner's public command and OSV contract."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
SCANNER = ROOT / "skills/om-auto-audit-dependencies/references/osv-scan.py"
SPEC = importlib.util.spec_from_file_location("osv_scan", SCANNER)
scan = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(scan)


def advisory(vid="GHSA-example", severity="HIGH", fixed="1.2.0", withdrawn=False):
    return {
        "id": vid, "summary": "Example advisory", "withdrawn": "2026-01-01" if withdrawn else None,
        "database_specific": {"severity": severity},
        "affected": [{"package": {"ecosystem": "npm", "name": "example"},
                      "ranges": [{"type": "SEMVER", "events": [
                          {"introduced": "0"}, *([{"fixed": fixed}] if fixed else [])]}]}],
    }


class ParserTests(unittest.TestCase):
    def test_supported_formats(self):
        fixtures = [
            ("pubspec", 'packages:\n  example:\n    dependency: "direct main"\n    source: hosted\n    version: "1.0.0"\n', [("example", "1.0.0", True)]),
            ("npm_lock", json.dumps({"lockfileVersion": 3, "packages": {"": {"dependencies": {"example": "^1"}}, "node_modules/example": {"version": "1.0.0"}}}), [("example", "1.0.0", True)]),
            ("yarn_lock", 'example@^1:\n  version "1.0.0"\n  resolved "https://registry.yarnpkg.com/example/-/example-1.0.0.tgz"\n', [("example", "1.0.0", None)]),
            ("yarn_lock", '"example@npm:^1":\n  version: 1.0.0\n  resolution: "example@npm:1.0.0"\n', [("example", "1.0.0", None)]),
            ("pnpm_lock", "packages:\n  '@scope/example@1.0.0':\n    resolution: {integrity: abc}\n", [("@scope/example", "1.0.0", None)]),
            ("pnpm_lock", "packages:\n  /example/1.0.0:\n    resolution: {integrity: abc}\n", [("example", "1.0.0", None)]),
            ("toml_packages", '[[package]]\nname = "example"\nversion = "1.0.0"\nsource = "registry+https://github.com/rust-lang/crates.io-index"\n', [("example", "1.0.0", None)]),
            ("pipfile_lock", '{"default":{"example":{"version":"==1.0.0"}},"develop":{}}', [("example", "1.0.0", None)]),
            ("requirements", "example==1.0.0 # pinned\n", [("example", "1.0.0", True)]),
            ("composer_lock", '{"packages":[{"name":"vendor/example","version":"v1.0.0"}]}', [("vendor/example", "1.0.0", None)]),
            ("gemfile_lock", "GEM\n  specs:\n    example (1.0.0)\nDEPENDENCIES\n  example\n", [("example", "1.0.0", True)]),
            ("go_mod", "require (\n example.org/example v1.0.0 // indirect\n)\n", [("example.org/example", "1.0.0", False)]),
            ("gradle_lock", "org.example:example:1.0.0=runtimeClasspath\n", [("org.example:example", "1.0.0", None)]),
            ("nuget_lock", '{"dependencies":{"net8.0":{"Example":{"type":"Direct","resolved":"1.0.0"}}}}', [("Example", "1.0.0", True)]),
        ]
        for parser, text, expected in fixtures:
            with self.subTest(parser=parser, text=text):
                self.assertEqual(scan.PARSERS[parser](text), expected)

    def test_nested_toml_source_does_not_rename_package(self):
        text = '[[package]]\nname = "example"\nversion = "1.0.0"\n[package.source]\ntype = "legacy"\nurl = "https://pypi.org/simple"\nname = "PyPI"\n'
        self.assertEqual(scan.p_toml_packages(text), [("example", "1.0.0", None)])

    def test_uv_local_and_git_packages_are_not_registry_releases(self):
        text = '[[package]]\nname="local"\nversion="1.0.0"\nsource={editable="."}\n[[package]]\nname="git-dep"\nversion="1.0.0"\nsource={git="https://example.invalid/repo"}\n'
        self.assertEqual(scan.p_toml_packages(text), [])

    def test_unpinned_and_included_requirements_are_explicitly_incomplete(self):
        for text in ("example>=1\n", "-r nested.txt\n", "example==1.*\n", "example==1.0.0\nother>=2\n"):
            with self.subTest(text=text):
                self.assertIn(scan.UNPINNED, scan.p_requirements(text))

    def test_pinned_requirements_with_hashes_and_markers(self):
        text = 'example==1.0.0 ; python_version >= "3.8" \\\n    --hash=sha256:abcdef\n'
        self.assertEqual(scan.p_requirements(text), [("example", "1.0.0", True)])

    def test_git_yarn_and_go_replacements_are_explicitly_incomplete(self):
        self.assertIn(scan.UNPINNED, scan.p_yarn_lock('"example@git+https://example.invalid/repo.git":\n  version "1.0.0"\n'))
        with self.assertRaises(ValueError):
            scan.p_go_mod('require example.org/example v1.0.0\nreplace example.org/example => ../local\n')

    def test_pep440_epoch_is_not_discarded(self):
        self.assertRegex("1!2.3.4", scan.VERSION_RE)

    def test_cargo_local_sources_are_not_queried(self):
        text = '[[package]]\nname="workspace"\nversion="1.0.0"\n'
        self.assertEqual(scan.p_toml_packages(text, "crates.io"), [])

    def test_npm_git_source_is_not_a_registry_release(self):
        text = json.dumps({"packages": {"node_modules/example": {"version": "1.0.0", "resolved": "git+https://example.invalid/repo.git"}}})
        self.assertIn(scan.UNPINNED, scan.p_npm_lock(text))

    def test_python_package_normalization_matches_fixed_events(self):
        record = {"affected": [{"package": {"ecosystem": "PyPI", "name": "Example_Package"}, "ranges": [{"events": [{"fixed": "2.0.0"}]}]}]}
        self.assertEqual(scan.affected_and_fixed(record, "PyPI", "example.package", "1.0.0"), ["2.0.0"])


class ClientTests(unittest.TestCase):
    def test_batch_length_mismatch_fails(self):
        with patch.object(scan, "post", return_value={"results": []}):
            with self.assertRaises(ValueError):
                scan.query_ids(scan.API, [{"version": "1.0.0"}])

    def test_batch_pagination_preserves_query(self):
        query = {"package": {"ecosystem": "npm", "name": "example"}, "version": "1.0.0"}
        responses = [{"results": [{"vulns": [{"id": "A"}], "next_page_token": "next"}]}, {"vulns": [{"id": "B"}]}]
        with patch.object(scan, "post", side_effect=responses) as post:
            self.assertEqual(scan.query_ids(scan.API, [query]), [["A", "B"]])
            self.assertEqual(post.call_args_list[1].args[2], dict(query, page_token="next"))

    def test_cvss_known_vector(self):
        self.assertEqual(scan.cvss3_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"), 9.8)

    def test_repeated_pagination_token_fails(self):
        responses = [{"results": [{"next_page_token": "same"}]}, {"next_page_token": "same"}]
        with patch.object(scan, "post", side_effect=responses), self.assertRaises(ValueError):
            scan.query_ids(scan.API, [{"version": "1.0.0"}])


class CommandTests(unittest.TestCase):
    def run_scan(self, files, records=None, hits=None, extra=(), fail_detail=False):
        records = {"GHSA-example": advisory()} if records is None else records
        hits = {"1.0.0": list(records)} if hits is None else hits
        with tempfile.TemporaryDirectory() as root:
            for rel, data in files.items():
                path = Path(root) / rel
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(data)

            def post(api, path, payload):
                self.assertTrue(api.startswith("https://"))
                self.assertEqual(path, "/querybatch")
                return {"results": [{"vulns": [{"id": vid} for vid in hits.get(q["version"], [])]} for q in payload["queries"]]}

            def get(api, path):
                if fail_detail:
                    raise OSError("unavailable")
                return records[path.rsplit("/", 1)[1]]

            out = io.StringIO()
            argv = [str(SCANNER), "--root", root, *extra, *files]
            with patch.object(sys, "argv", argv), patch.object(scan, "post", side_effect=post), patch.object(scan, "get", side_effect=get), contextlib.redirect_stdout(out):
                code = scan.main()
            return code, json.loads(out.getvalue())

    def lock(self):
        return json.dumps({"lockfileVersion": 3, "packages": {"": {"dependencies": {"example": "^1"}}, "node_modules/example": {"version": "1.0.0"}}})

    def test_documented_option_and_verified_target(self):
        code, report = self.run_scan({"package-lock.json": self.lock()}, extra=("--min-severity", "high"))
        self.assertEqual(code, 0)
        finding = report["findings"][0]
        self.assertEqual(finding["target"], "1.2.0")
        self.assertEqual(finding["target_clears_all"], "1.2.0")
        self.assertEqual(finding["at_threshold"], 1)

    def test_candidate_must_clear_all_high_advisories(self):
        records = {"A": advisory("A", fixed="1.2.0"), "B": advisory("B", fixed="1.3.0")}
        code, report = self.run_scan({"package-lock.json": self.lock()}, records=records, hits={"1.0.0": ["A", "B"], "1.2.0": ["B"]})
        self.assertEqual(code, 0)
        self.assertEqual(report["findings"][0]["target"], "1.3.0")

    def test_threshold_and_all_severity_targets_can_differ(self):
        records = {"A": advisory("A", fixed="1.2.0"), "B": advisory("B", severity="LOW", fixed="1.3.0")}
        code, report = self.run_scan({"package-lock.json": self.lock()}, records=records, hits={"1.0.0": ["A", "B"], "1.2.0": ["B"]})
        self.assertEqual(code, 0)
        self.assertEqual(report["findings"][0]["target"], "1.2.0")
        self.assertEqual(report["findings"][0]["target_clears_all"], "1.3.0")

    def test_no_fixed_release_is_not_a_guessed_upgrade(self):
        code, report = self.run_scan({"package-lock.json": self.lock()}, records={"A": advisory("A", fixed=None)})
        self.assertEqual(code, 0)
        self.assertIsNone(report["findings"][0]["target"])

    def test_failed_detail_is_incomplete_coverage(self):
        code, report = self.run_scan({"package-lock.json": self.lock()}, fail_detail=True)
        self.assertEqual(code, 3)
        self.assertEqual(report["scanned"], [])
        self.assertEqual(len(report["skipped"]), 1)
        self.assertTrue(report["errors"])

    def test_empty_or_unpinned_input_is_not_reported_as_scanned(self):
        for filename, text in (("requirements.txt", "example>=1\n"), ("pnpm-lock.yaml", "unrecognized: data\n")):
            with self.subTest(filename=filename):
                code, report = self.run_scan({filename: text}, records={}, hits={})
                self.assertEqual(code, 4)
                self.assertEqual(report["scanned"], [])
                self.assertTrue(report["skipped"])

    def test_aliases_merge_and_withdrawn_are_dropped(self):
        first = advisory("A")
        first["aliases"] = ["B"]
        records = {"A": first, "B": advisory("B"), "C": advisory("C", withdrawn=True)}
        code, report = self.run_scan({"package-lock.json": self.lock()}, records=records)
        self.assertEqual(code, 0)
        self.assertEqual(len(report["findings"][0]["advisories"]), 1)

    def test_alias_merge_keeps_richer_fix_data(self):
        first = advisory("A", fixed=None)
        first["aliases"] = ["B"]
        code, report = self.run_scan({"package-lock.json": self.lock()}, records={"A": first, "B": advisory("B")})
        self.assertEqual(code, 0)
        self.assertEqual(report["findings"][0]["target"], "1.2.0")

    def test_candidate_verification_failure_does_not_claim_clean_coverage(self):
        record = advisory("A")
        code, report = self.run_scan({"package-lock.json": self.lock()}, records={"A": record}, hits={"1.0.0": ["A"], "1.2.0": ["missing"]})
        self.assertEqual(code, 3)
        self.assertEqual(report["scanned"], [])

    def test_below_threshold_advisories_stay_visible(self):
        code, report = self.run_scan({"package-lock.json": self.lock()}, records={"A": advisory("A", severity="LOW")})
        self.assertEqual(code, 0)
        self.assertEqual(report["findings"][0]["at_threshold"], 0)
        self.assertEqual(report["findings"][0]["advisories"][0]["severity"], "low")

    def test_external_lockfile_and_symlink_are_rejected(self):
        with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as outside:
            external = Path(outside) / "package-lock.json"
            external.write_text(self.lock())
            link = Path(root) / "package-lock.json"
            link.symlink_to(external)
            for path in (str(external), str(link)):
                result = subprocess.run([sys.executable, "-I", str(SCANNER), "--root", root, path], capture_output=True, text=True)
                self.assertEqual(result.returncode, 4)

    def test_pinned_findings_survive_incomplete_requirements(self):
        record = advisory()
        record["affected"][0]["package"]["ecosystem"] = "PyPI"
        code, report = self.run_scan({"requirements.txt": "example==1.0.0\nother>=2\n"}, records={"GHSA-example": record})
        self.assertEqual(code, 4)
        self.assertEqual(report["scanned"], [])
        self.assertTrue(report["incomplete"])
        self.assertEqual(report["findings"][0]["package"], "example")
                self.assertEqual(json.loads(result.stdout)["scanned"], [])


if __name__ == "__main__":
    unittest.main()
