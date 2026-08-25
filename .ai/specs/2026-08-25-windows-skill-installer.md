# Windows Skill Installer

## TLDR

Install development skill links on Windows without elevation by using directory junctions.

## Scope

Exclusively owns `scripts/install-skills.mjs` and new installer fixtures/tests. Runtime skills and CI support claims are outside scope.

## Proposed solution

Use Node directory junctions on Windows and retain directory symlinks elsewhere. Resolve junction targets as absolute paths. Preserve CLI flags, selection, ownership detection, force semantics, messages, and uninstall behavior; never remove a link not owned by this installer.

## Failure scenarios

Existing correct link is idempotent; conflicting file/link reports or obeys existing force rules; missing target and denied destination fail without partial installation; uninstall removes the junction, never its target.

## Validation and plan

1.1 Extract/test link-strategy selection for Windows and non-Windows.

1.2 Add temp-directory install, repeat, conflict, force, and uninstall fixtures with spaced Unicode paths.

1.3 Run real junction lifecycle on `windows-latest` and real symlink lifecycle on Ubuntu/macOS where available.

## Completion Criteria

- Standard Windows install/uninstall works without Developer Mode or elevation.
- All existing CLI and ownership behaviors remain compatible.
- Tests prove targets survive uninstall and conflict cleanup.
