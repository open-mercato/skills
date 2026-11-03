# Rotation and recovery

Read this during scope resolution, preview, and recovery in `om-ai-context-maintenance`.

## Invocation and configuration

Require Python 3.9+ with its standard library. Resolve `SKILL_DIR` from the
installed skill's actual location and `REPO_ROOT` through `git rev-parse
--show-toplevel`. Never assume the skill is installed in the target repository.
Invoke the helper with an argument array, or quote each shell argument:

```bash
python3 "$SKILL_DIR/scripts/rotate-runs.py" --repo-root "$REPO_ROOT" --keep-days 14
python3 "$SKILL_DIR/scripts/rotate-runs.py" --repo-root "$REPO_ROOT" --keep-days 30 --exclude "2026-01-01-live-run" --apply
```

The examples use the helper's default read-only mode first. The skill's
`--dry-run` maps to that mode; normal authorized rotation previews first, then delegates to
`om-auto-create-pr` per `pr-delivery.md`. Only its isolated worktree passes
`--apply`; the second command above illustrates the helper API, not permission
to mutate the caller's checkout. Supply `--runs-dir` when explicitly requested or set in
the repo-local extension; otherwise the helper loads `paths.runs` from the
existing pipeline config. A missing runs directory is a successful no-op and
does not create one. Invalid config, retention, or paths fail before mutation.
Exclusions must be exact single top-level names, never glob expressions.

For persistent overrides, the operator can put, for example, “Default to 30
retention days and exclude the `reference-run` folder” in
`.ai/skills/om-ai-context-maintenance/SKILL.md`. Keep existing pipeline config
fields intact; no new schema field or automatic config rewrite is needed.

## Eligibility and age

- Consider immediate non-hidden directories and regular `.md` files only.
  Directory contents are archived recursively, including hidden files. Other
  loose files, dot entries, existing `.tgz` files, and temporary files stay put.
- A valid leading `YYYY-MM-DD` followed by `-`, `.`, or end of name is the run
  date. For names without it, use the newest filesystem modification date in
  the tree (UTC). An invalid date prefix is retained and reported as an item
  error. Prefix dates keep old
  committed runs eligible after a fresh checkout; filesystem age is only a
  fallback, and a fresh checkout can therefore retain undated runs longer.
- Compute `cutoff = UTC today - keepDays`. Archive dates **strictly before**
  the cutoff. Keep the exact cutoff day, all newer dates, and future dates.
  The boundary day is retained conservatively.
- Pending checkboxes, a non-complete explicit `Status:`, or a Tasks table with
  a status other than `done` protect a local plan. A malformed/empty Tasks or
  Progress section is uncertain and protected. The helper checks a flat `.md`
  plan or a folder's `PLAN.md` and `HANDOFF.md`; this is an additional safeguard,
  not a substitute for the executing agent's open-PR/claim/lease checks.
- If the tracker is unavailable or its open-PR listing cannot be completed,
  perform only a preview unless independent evidence proves each candidate
  inactive and unreferenced. Exclude uncertain candidates. Quiesce writers
  before apply; snapshot comparisons detect changes during compression but
  cannot replace coordination with a worker that writes during deletion.

## Archive contract

Each directory `run-name/` becomes `run-name.tgz`; a flat `run-name.md` becomes
`run-name.md.tgz`. Members retain that top-level name and relative paths, file
bytes, permission modes and mtimes. No absolute member names or traversal are
written; links and special files anywhere in a candidate cause it to be skipped.
Archives use gzip-compressed tar and remain alongside unpacked runs forever
unless the operator separately requests another policy.

On apply, an exclusive `.context-maintenance.lock` directory serializes
maintenance instances. A temporary `.context-archive-*.tmp` is created on the
same filesystem, closed, re-read completely (decompression and SHA-256 for each
file), and compared against the original snapshot. Publication uses an exclusive
hard link so an existing archive is never replaced. Unsupported publication,
permissions, or disk-space errors keep the source intact. The helper performs no network upload; the delegated PR workflow publishes
the verified archives and source removals for review. Do not run this helper on filesystems without hard-link support.

## Recovery and restoration

Normal completion removes this invocation's lock and temporary files, including
on caught exceptions. A process kill can leave either behind. Check that no
maintenance process owns a leftover lock before removing that lock or a temporary
file; never break a live lock automatically. If both a source and its `.tgz`
exist, the helper skips the source and reports the collision. Verify the archive
against that source before any manual cleanup; rerunning never treats the
collision as permission to delete the source. If deletion failed partway, the
verified archive remains the recovery copy; disclose the failure.

To restore, inspect the member listing and verify it contains only the expected
top-level name and relative paths, with no links, special files or traversal.
Extract into a fresh empty staging directory, inspect the result, then move the
restored top-level entry into the runs directory only when that path is absent.
Keep the `.tgz` until restoration has been verified. Do not extract over a live
run or feed arbitrary archives to an unrestricted extraction command. After
restoration, an existing archive causes future rotation of that same source to
skip; resolving that collision is an explicit operator decision.
