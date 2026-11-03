#!/usr/bin/env python3
"""Exercise archival behavior on disposable fixtures, never the repository's runs."""

import datetime as dt
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest import mock

SCRIPT = Path(__file__).resolve().parents[1] / 'skills/om-ai-context-maintenance/scripts/rotate-runs.py'
spec = importlib.util.spec_from_file_location('rotate_runs', SCRIPT)
rotation = importlib.util.module_from_spec(spec)
sys.dont_write_bytecode = True
spec.loader.exec_module(rotation)
TODAY = dt.date(2026, 11, 3)


class RotationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.repo = Path(self.temporary.name)
        self.runs = self.repo / '.ai/runs'
        self.runs.mkdir(parents=True)

    def folder(self, name='2026-10-01-old run', plan=None):
        path = self.runs / name
        path.mkdir()
        (path / 'binary.dat').write_bytes(b'\x00\xfforiginal payload\n')
        (path / '.hidden').write_text('preserve hidden artifacts')
        (path / 'empty').mkdir()
        (path / 'binary.dat').chmod(0o640)
        if plan is not None:
            (path / 'PLAN.md').write_text(plan)
        return path

    def rotate(self, **kwargs):
        return rotation.rotate(self.repo, today=TODAY, **kwargs)

    def test_preview_is_read_only_and_boundary_is_inclusive(self):
        self.folder()
        self.folder('2026-10-20-boundary')
        self.folder('2026-10-21-recent')
        self.folder('2027-01-01-future')
        before = rotation.snapshot(self.runs)
        report = self.rotate()
        self.assertEqual(report['cutoff'], '2026-10-20')
        self.assertEqual([item['action'] for item in report['items']],
                         ['eligible', 'retained', 'retained', 'retained'])
        self.assertEqual(rotation.snapshot(self.runs), before)

    def test_apply_roundtrip_preserves_all_members_and_repeat_is_noop(self):
        source = self.folder()
        captured = rotation.snapshot(source)
        report = self.rotate(apply=True)
        self.assertEqual(report['items'][0]['action'], 'archived')
        self.assertFalse(source.exists())
        archive = Path(report['items'][0]['archive'])
        self.assertEqual(archive.parent, self.runs.resolve())
        rotation.verify(archive, captured)
        with tarfile.open(archive) as stream:
            names = stream.getnames()
            self.assertIn(source.name + '/.hidden', names)
            self.assertIn(source.name + '/empty', names)
            self.assertEqual(stream.extractfile(source.name + '/binary.dat').read(),
                             b'\x00\xfforiginal payload\n')
        self.assertEqual(self.rotate(apply=True)['items'], [])
        self.assertFalse((self.runs / '.context-maintenance.lock').exists())

    def test_multiple_runs_share_one_archive_and_restore_as_original_top_levels(self):
        folder = self.folder('2026-01-01-first', 'Status: complete\n')
        flat = self.runs / '2026-02-01-second.md'
        flat.write_text('Status: complete\n')
        another = self.folder('2026-03-01-third')
        captured = {}
        for source in (folder, flat, another):
            captured.update(rotation.snapshot(source))
        preview = self.rotate()
        self.assertEqual(len({item['archive'] for item in preview['items']}), 1)
        report = self.rotate(apply=True)
        self.assertTrue(all(item['action'] == 'archived' for item in report['items']))
        self.assertEqual(len(list(self.runs.iterdir())), 1)
        archive = Path(report['archive'])
        rotation.verify(archive, captured)
        with tempfile.TemporaryDirectory() as staging, tarfile.open(archive) as stream:
            stream.extractall(staging)
            restored = {}
            for source in Path(staging).iterdir():
                restored.update(rotation.snapshot(source))
            self.assertEqual(set(restored), set(captured))
            for name, original in captured.items():
                actual = restored[name]
                self.assertEqual(actual[:3], original[:3])
                self.assertEqual(actual[4], original[4])
                self.assertLess(abs(actual[3] - original[3]), 10000)

    def test_later_batch_uses_one_new_archive_and_preserves_previous_bytes(self):
        self.folder('2026-01-01-first')
        first = Path(self.rotate(apply=True)['archive'])
        original = first.read_bytes()
        self.folder('2026-01-01-second')
        preview = self.rotate()
        self.assertEqual(Path(preview['archive']).name, 'rotated-before-2026-10-20-2.tgz')
        second = Path(self.rotate(apply=True)['archive'])
        self.assertNotEqual(first, second)
        self.assertEqual(first.read_bytes(), original)
        self.assertEqual(len(list(self.runs.glob('*.tgz'))), 2)

    def test_batch_verification_failure_preserves_every_original(self):
        first = self.folder('2026-01-01-first')
        second = self.folder('2026-01-01-second')
        before = {source.name: rotation.snapshot(source) for source in (first, second)}
        with mock.patch.object(rotation, 'verify', side_effect=ValueError('bad batch')):
            report = self.rotate(apply=True)
        self.assertEqual([item['action'] for item in report['items']], ['error', 'error'])
        self.assertEqual({source.name: rotation.snapshot(source) for source in (first, second)}, before)
        self.assertTrue(first.exists() and second.exists())

    def test_source_change_in_one_run_keeps_entire_batch_unpublished(self):
        first = self.folder('2026-01-01-first')
        second = self.folder('2026-01-01-second')
        verify = rotation.verify

        def change_after_verify(*args):
            verify(*args)
            (second / 'new.md').write_text('concurrent work')

        with mock.patch.object(rotation, 'verify', side_effect=change_after_verify):
            report = self.rotate(apply=True)
        self.assertTrue(all(item['action'] == 'error' for item in report['items']))
        self.assertTrue(first.exists() and second.exists())
        self.assertFalse(list(self.runs.glob('*.tgz')))

    def test_verify_rejects_missing_members_and_corrupt_gzip_trailer(self):
        source = self.folder()
        captured = rotation.snapshot(source)
        missing = self.repo / 'missing.tgz'
        with tarfile.open(missing, 'w:gz') as stream:
            stream.add(source / 'binary.dat', arcname=source.name + '/binary.dat')
        with self.assertRaises(ValueError):
            rotation.verify(missing, captured)
        report = self.rotate(apply=True)
        archive = Path(report['archive'])
        corrupted = bytearray(archive.read_bytes())
        corrupted[-8] ^= 0xff
        archive.write_bytes(corrupted)
        with self.assertRaises(OSError):
            rotation.verify(archive, captured)

    def test_corrupt_or_unsafe_existing_batch_prevents_source_mutation(self):
        source = self.folder()
        archive = self.runs / 'rotated-before-2026-01-01.tgz'
        archive.write_bytes(b'invalid gzip')
        with self.assertRaises((OSError, tarfile.TarError)):
            self.rotate(apply=True)
        self.assertTrue(source.exists())
        with tarfile.open(archive, 'w:gz') as stream:
            member = tarfile.TarInfo('../outside')
            member.type = tarfile.DIRTYPE
            stream.addfile(member)
        with self.assertRaises(ValueError):
            self.rotate(apply=True)
        self.assertTrue(source.exists())
        self.assertFalse((self.runs / '.context-maintenance.lock').exists())

    def test_partial_batch_deletion_keeps_recovery_and_never_rotates_remnant(self):
        first = self.folder('2026-01-01-first')
        second = self.folder('2026-01-01-second')
        captured = {**rotation.snapshot(first), **rotation.snapshot(second)}
        remove = rotation.shutil.rmtree

        def fail_second(path):
            if path.name == second.name:
                raise OSError('delete denied')
            remove(path)

        with mock.patch.object(rotation.shutil, 'rmtree', side_effect=fail_second):
            report = self.rotate(apply=True)
        self.assertEqual([item['action'] for item in report['items']], ['archived', 'error'])
        self.assertFalse(first.exists())
        self.assertTrue(second.exists())
        rotation.verify(Path(report['archive']), captured)
        rerun = self.rotate(apply=True)
        self.assertEqual(rerun['items'][0]['reason'], 'already included in batch archive')
        self.assertNotIn('archive', rerun)
        self.assertEqual(len(list(self.runs.glob('*.tgz'))), 1)

    def test_configured_path_and_cli_retention(self):
        config = self.repo / '.ai/agentic.config.json'
        config.write_text(json.dumps({'paths': {'runs': 'context/history'}}))
        self.runs = self.repo / 'context/history'
        self.runs.mkdir(parents=True)
        self.folder('2026-10-15-older')
        self.assertEqual(self.rotate(keep_days=30)['items'][0]['action'], 'retained')
        self.assertEqual(self.rotate(keep_days=7)['items'][0]['action'], 'eligible')
        self.assertEqual(self.rotate(runs_dir='.ai/runs')['items'], [])

    def test_pending_uncertain_loop_and_handoff_are_protected(self):
        plans = [
            '## Progress\n- [ ] 1.1 Resume me\n',
            'Status: in-progress\n',
            '## Tasks\n| Step | Status |\n|---|---|\n| 1.1 | todo |\n',
            '## Tasks\n| Step | Status |\n|---|---|\n',
            '## Progress\nNo checklist available\n',
        ]
        for index, plan in enumerate(plans):
            self.folder('2026-01-01-active-' + str(index), plan)
        handoff = self.folder('2026-01-01-handoff', 'Status: complete\n')
        (handoff / 'HANDOFF.md').write_text('Status: blocked\n')
        report = self.rotate(apply=True)
        self.assertTrue(all(item['action'] == 'skipped' for item in report['items']))
        self.assertFalse(list(self.runs.glob('*.tgz')))

    def test_completed_loop_and_flat_plan_can_archive(self):
        self.folder('2026-01-01-loop',
                    '## Tasks\n| Step | Status |\n|---|---|\n| 1.1 | done |\n')
        (self.runs / '2026-01-01-plan.md').write_text('## Progress\n- [x] 1.1 Done\n')
        report = self.rotate(apply=True)
        self.assertTrue(all(item['action'] == 'archived' for item in report['items']))
        archives = list(self.runs.glob('*.tgz'))
        self.assertEqual(len(archives), 1)
        self.assertEqual({item['archive'] for item in report['items']}, {str(archives[0].resolve())})
        with tarfile.open(archives[0]) as stream:
            self.assertIn('2026-01-01-plan.md', stream.getnames())
            self.assertIn('2026-01-01-loop/PLAN.md', stream.getnames())

    def test_exclusions_collisions_archives_and_unrelated_files(self):
        excluded = self.folder('2026-01-01-protected')
        collision = self.folder('2026-01-01-collision')
        archive = collision.with_name(collision.name + '.tgz')
        archive.write_bytes(b'never overwrite')
        (self.runs / 'readme.txt').write_text('unrelated')
        report = self.rotate(apply=True, exclude=[excluded.name])
        self.assertTrue(all(item['action'] == 'skipped' for item in report['items']))
        self.assertTrue(excluded.is_dir())
        self.assertTrue(collision.is_dir())
        self.assertEqual(archive.read_bytes(), b'never overwrite')

    def test_symlinked_and_outside_paths_fail_without_mutation(self):
        source = self.folder()
        (source / 'link').symlink_to(self.repo)
        self.assertEqual(self.rotate(apply=True)['items'][0]['action'], 'error')
        self.assertTrue(source.is_dir())
        (self.repo / 'alias').symlink_to(self.runs, target_is_directory=True)
        for path in ('alias', '../outside', '.', '.git', '.git/objects', str(self.runs)):
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.rotate(runs_dir=path, apply=True)
        (self.runs / '2026-01-01-link').symlink_to(source)
        self.assertEqual(self.rotate()['items'][0]['reason'], 'symlink')

    def test_git_metadata_inside_a_run_prevents_archiving(self):
        source = self.folder()
        (source / '.git').write_text('gitdir: somewhere')
        self.assertEqual(self.rotate(apply=True)['items'][0]['action'], 'error')
        self.assertTrue(source.exists())
        self.assertFalse(list(self.runs.glob('*.tgz')))

    def test_verification_failure_keeps_original_and_cleans_temporary(self):
        source = self.folder()
        before = rotation.snapshot(source)
        with mock.patch.object(rotation, 'verify', side_effect=ValueError('bad archive')):
            report = self.rotate(apply=True)
        self.assertEqual(report['items'][0]['action'], 'error')
        self.assertEqual(rotation.snapshot(source), before)
        self.assertFalse(list(self.runs.glob('*.tgz')))
        self.assertFalse(list(self.runs.glob('.context-*')))

    def test_source_change_during_compression_keeps_original(self):
        source = self.folder()
        verify = rotation.verify

        def change_after_verify(*args):
            verify(*args)
            (source / 'new-work.md').write_text('concurrent work')

        with mock.patch.object(rotation, 'verify', side_effect=change_after_verify):
            report = self.rotate(apply=True)
        self.assertEqual(report['items'][0]['action'], 'error')
        self.assertTrue((source / 'new-work.md').is_file())
        self.assertFalse(list(self.runs.glob('*.tgz')))

    def test_publication_race_does_not_replace_archive_or_delete_source(self):
        source = self.folder()
        archive = self.runs / 'rotated-before-2026-10-20.tgz'
        link = os.link

        def race(temporary, destination):
            archive.write_bytes(b'another invocation won')
            link(temporary, destination)

        with mock.patch.object(rotation.os, 'link', side_effect=race):
            report = self.rotate(apply=True)
        self.assertEqual(report['items'][0]['action'], 'error')
        self.assertTrue(source.is_dir())
        self.assertEqual(archive.read_bytes(), b'another invocation won')

    def test_delete_failure_leaves_verified_archive_for_recovery(self):
        source = self.folder()
        captured = rotation.snapshot(source)
        with mock.patch.object(rotation.shutil, 'rmtree', side_effect=OSError('delete denied')):
            report = self.rotate(apply=True)
        self.assertEqual(report['items'][0]['action'], 'error')
        rotation.verify(Path(report['archive']), captured)
        self.assertTrue(source.exists())
        self.assertEqual(self.rotate(apply=True)['items'][0]['reason'], 'already included in batch archive')

    def test_lock_invalid_retention_and_invalid_dates(self):
        source = self.folder('2026-02-30-invalid')
        self.assertEqual(self.rotate()['items'][0]['action'], 'error')
        lock = self.runs / '.context-maintenance.lock'
        lock.mkdir()
        with self.assertRaises(FileExistsError):
            self.rotate(apply=True)
        self.assertTrue(lock.exists())
        self.assertTrue(source.exists())
        for keep in (0, -1, True, '14'):
            with self.subTest(keep=keep), self.assertRaises(ValueError):
                self.rotate(keep_days=keep)

    def test_undated_run_uses_newest_nested_mtime(self):
        source = self.folder('undated-run')
        old = dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc).timestamp()
        for child in [*source.rglob('*'), source]:
            os.utime(child, (old, old))
        self.assertEqual(self.rotate()['items'][0]['action'], 'eligible')
        (source / 'binary.dat').touch()
        self.assertEqual(self.rotate()['items'][0]['action'], 'retained')

    def test_cli_missing_root_is_noop_and_invalid_config_fails(self):
        missing = 'missing/history'
        process = subprocess.run([sys.executable, str(SCRIPT), '--repo-root', str(self.repo),
                                  '--runs-dir', missing, '--apply'], capture_output=True, text=True)
        self.assertEqual(process.returncode, 0, process.stderr)
        self.assertEqual(json.loads(process.stdout)['items'], [])
        self.assertFalse((self.repo / missing).exists())
        (self.repo / '.ai/agentic.config.json').write_text('{broken')
        process = subprocess.run([sys.executable, str(SCRIPT), '--repo-root', str(self.repo)],
                                 capture_output=True, text=True)
        self.assertEqual(process.returncode, 1)
        self.assertIn('error', json.loads(process.stdout))


if __name__ == '__main__':
    unittest.main()
