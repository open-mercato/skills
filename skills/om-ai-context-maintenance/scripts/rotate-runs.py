#!/usr/bin/env python3
"""Archive quiescent old runs; preview by default. Uses only the standard library."""

import argparse
import datetime as dt
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import tarfile
import tempfile


def snapshot(source):
    """Capture names, metadata, and bytes; refuse links and special files."""
    result = {}

    def visit(path):
        if path.name == '.git':
            raise ValueError('Git metadata inside candidate run')
        meta = path.lstat()
        relative = path.relative_to(source.parent).as_posix()
        if stat.S_ISREG(meta.st_mode):
            digest = hashlib.sha256()
            with path.open('rb') as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b''):
                    digest.update(block)
            result[relative] = ('file', meta.st_mode & 0o7777, meta.st_size,
                                meta.st_mtime_ns, digest.hexdigest())
        elif stat.S_ISDIR(meta.st_mode):
            result[relative] = ('dir', meta.st_mode & 0o7777, 0, meta.st_mtime_ns, None)
            for child in sorted(path.iterdir()):
                visit(child)
        else:
            raise ValueError('symlink or special file in run')

    visit(source)
    return result


def unfinished(source):
    plans = [source] if source.is_file() else [source / 'PLAN.md', source / 'HANDOFF.md']
    for plan in plans:
        if not plan.is_file():
            continue
        text = plan.read_text(encoding='utf-8')
        statuses = re.findall(r'^Status:\s*(.*?)\s*$', text, re.M | re.I)
        if any(value.lower() != 'complete' for value in statuses):
            return True
        if re.search(r'^\s*- \[ \]', text, re.M):
            return True
        for section in re.finditer(r'^## (Tasks|Progress)\s*\n(.*?)(?=^## |\Z)', text, re.M | re.S):
            kind, body = section.groups()
            if kind == 'Progress':
                if not re.search(r'^\s*- \[[xX]\]', body, re.M):
                    return True
            else:
                rows = [[cell.strip().strip('`') for cell in line.strip().strip('|').split('|')]
                        for line in body.splitlines() if line.strip().startswith('|')]
                if not rows or 'Status' not in rows[0]:
                    return True
                column = rows[0].index('Status')
                data = [row for row in rows[1:] if not all(re.fullmatch(r'[-: ]+', cell) for cell in row)]
                if not data or any(len(row) <= column or row[column] != 'done' for row in data):
                    return True
    return False


def run_date(source, captured):
    match = re.match(r'^(\d{4}-\d{2}-\d{2})(?:[-.]|$)', source.name)
    if match:
        return dt.date.fromisoformat(match[1])
    latest = max(value[3] for value in captured.values()) / 1_000_000_000
    return dt.datetime.fromtimestamp(latest, dt.timezone.utc).date()


def verify(archive, captured):
    """Read every compressed byte and compare the exact inventory before deletion."""
    with gzip.open(archive, 'rb') as compressed:
        for _ in iter(lambda: compressed.read(1024 * 1024), b''):
            pass
    seen = set()
    with tarfile.open(archive, 'r:gz') as stream:
        for member in stream:
            if member.name not in captured or member.name in seen:
                raise ValueError('archive member mismatch')
            seen.add(member.name)
            kind, mode, size, mtime, digest = captured[member.name]
            if (member.mode != mode or member.size != size
                    or abs(member.mtime - mtime / 1_000_000_000) > 0.00001):
                raise ValueError('archive metadata mismatch')
            if kind == 'file' and member.isfile():
                content = hashlib.sha256()
                with stream.extractfile(member) as file:
                    for block in iter(lambda: file.read(1024 * 1024), b''):
                        content.update(block)
                if content.hexdigest() != digest:
                    raise ValueError('archive content mismatch')
            elif kind != 'dir' or not member.isdir():
                raise ValueError('archive entry type mismatch')
    if seen != set(captured):
        raise ValueError('archive is missing members')


def batch_destination(root, cutoff):
    stem = 'rotated-before-' + cutoff.isoformat()
    destination = root / (stem + '.tgz')
    suffix = 2
    while os.path.lexists(destination):
        destination = root / (stem + '-' + str(suffix) + '.tgz')
        suffix += 1
    return destination


def previously_archived(root):
    names = set()
    for archive in root.glob('rotated-before-*.tgz'):
        if not re.fullmatch(r'rotated-before-\d{4}-\d{2}-\d{2}(?:-\d+)?\.tgz', archive.name):
            continue
        if archive.is_symlink() or not archive.is_file():
            raise ValueError('batch archive is not a regular file')
        with gzip.open(archive, 'rb') as compressed:
            for _ in iter(lambda: compressed.read(1024 * 1024), b''):
                pass
        with tarfile.open(archive, 'r:gz') as stream:
            for member in stream:
                parts = Path(member.name).parts
                if not parts or Path(member.name).is_absolute() or '..' in parts:
                    raise ValueError('unsafe member in existing batch archive')
                if not member.isfile() and not member.isdir():
                    raise ValueError('unsupported member in existing batch archive')
                names.add(parts[0])
    return names


def archive_runs(sources, destination):
    captured = {}
    for source, original in sources:
        captured.update(original)
    descriptor, temporary = tempfile.mkstemp(prefix='.context-archive-', suffix='.tmp', dir=destination.parent)
    os.close(descriptor)
    try:
        with tarfile.open(temporary, 'w:gz', dereference=False) as stream:
            for source, original in sources:
                stream.add(source, arcname=source.name)
        verify(temporary, captured)
        if any(snapshot(source) != original for source, original in sources):
            raise ValueError('source changed during archival; all originals retained')
        os.link(temporary, destination)
        return destination
    finally:
        Path(temporary).unlink(missing_ok=True)


def resolve_root(repo, configured):
    relative = Path(configured)
    if relative.is_absolute() or '..' in relative.parts or '.git' in relative.parts or not relative.parts:
        raise ValueError('runs directory must be a nonempty repository-relative path')
    current = repo
    for part in relative.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError('symlinked runs path is not allowed')
    root = current.resolve()
    if root == repo or repo not in root.parents:
        raise ValueError('runs directory must be strictly inside the repository')
    if root.exists() and not root.is_dir():
        raise ValueError('runs path is not a directory')
    return root


def rotate(repo, runs_dir=None, keep_days=14, exclude=(), apply=False, today=None):
    if type(keep_days) is not int or keep_days < 1:
        raise ValueError('keep-days must be an integer of at least 1')
    repo = Path(repo).resolve(strict=True)
    if not repo.is_dir():
        raise ValueError('repository root is not a directory')
    if runs_dir is None:
        config = repo / '.ai' / 'agentic.config.json'
        settings = json.loads(config.read_text()) if config.exists() else {}
        runs_dir = settings.get('paths', {}).get('runs', '.ai/runs')
    if not isinstance(runs_dir, str) or not runs_dir.strip():
        raise ValueError('paths.runs must be a nonempty relative path')
    if any(not name or name in ('.', '..') or '/' in name or '\\' in name for name in exclude):
        raise ValueError('exclusions must be single top-level names')
    root = resolve_root(repo, runs_dir)
    cutoff = (today or dt.datetime.now(dt.timezone.utc).date()) - dt.timedelta(days=keep_days)
    report = {'mode': 'apply' if apply else 'preview', 'runsDir': str(root),
              'keepDays': keep_days, 'cutoff': cutoff.isoformat(), 'items': []}
    if not root.exists():
        return report
    lock = root / '.context-maintenance.lock'
    owned = False
    try:
        if apply:
            lock.mkdir()
            owned = True
        elif lock.exists():
            raise ValueError('maintenance lock already exists')
        archived_names = previously_archived(root)
        destination = batch_destination(root, cutoff)
        candidates = []
        for source in sorted(root.iterdir()):
            if source.name.startswith('.') or source.name.endswith('.tgz'):
                continue
            item = {'name': source.name}
            report['items'].append(item)
            try:
                if source.name in exclude:
                    item.update(action='skipped', reason='excluded')
                elif source.is_symlink():
                    item.update(action='skipped', reason='symlink')
                elif not source.is_dir() and not (source.is_file() and source.suffix == '.md'):
                    item.update(action='skipped', reason='not a run folder or Markdown plan')
                elif source.name in archived_names:
                    item.update(action='skipped', reason='already included in batch archive')
                elif os.path.lexists(source.with_name(source.name + '.tgz')):
                    item.update(action='skipped', reason='archive already exists')
                else:
                    captured = snapshot(source)
                    date = run_date(source, captured)
                    item['date'] = date.isoformat()
                    if date >= cutoff:
                        item.update(action='retained', reason='within retention window')
                    elif unfinished(source):
                        item.update(action='skipped', reason='unfinished or uncertain local plan')
                    else:
                        item.update(action='eligible', archive=str(destination))
                        candidates.append((source, captured, item))
            except (OSError, ValueError, UnicodeError, EOFError, tarfile.TarError) as error:
                item.update(action='error', reason=str(error))
        if candidates:
            report['archive'] = str(destination)
        if apply and candidates:
            try:
                archive_runs([(source, captured) for source, captured, item in candidates], destination)
            except (OSError, ValueError, UnicodeError, EOFError, tarfile.TarError) as error:
                for source, captured, item in candidates:
                    item.update(action='error', reason=str(error))
            else:
                for source, captured, item in candidates:
                    try:
                        if snapshot(source) != captured:
                            raise ValueError('source changed after publication; original retained')
                        if source.is_dir():
                            shutil.rmtree(source)
                        else:
                            source.unlink()
                        item.update(action='archived')
                    except (OSError, ValueError) as error:
                        item.update(action='error', reason=str(error))
        return report
    finally:
        if owned:
            lock.rmdir()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo-root', required=True)
    parser.add_argument('--runs-dir')
    parser.add_argument('--keep-days', type=int, default=14)
    parser.add_argument('--exclude', action='append', default=[])
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--apply', action='store_true')
    mode.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    try:
        result = rotate(args.repo_root, args.runs_dir, args.keep_days, args.exclude, args.apply)
    except (OSError, ValueError, TypeError, AttributeError, OverflowError, EOFError, tarfile.TarError) as error:
        print(json.dumps({'error': str(error)}))
        return 1
    print(json.dumps(result, indent=2))
    return int(any(item['action'] == 'error' for item in result['items']))


if __name__ == '__main__':
    raise SystemExit(main())
