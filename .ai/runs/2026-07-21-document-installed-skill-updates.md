# Document installed skill updates

## Goal

Explain how users update an existing Open Mercato Skills installation to the latest release and apply any repository-level migrations.

## Scope

- Add a focused update section to `README.md` near the installation quickstart.
- Document project and global update commands supported by the skills CLI.
- Clarify that `/om-apply-upgrade-notes` updates generated repository artifacts after the skill files are refreshed.

## Non-goals

- Change the installer or any skill behavior.
- Change upgrade-note content or repository configuration.

## Implementation Plan

### Phase 1: Documentation

- Add copy-pasteable update instructions and scope guidance to the README.
- Run the repository validation gate and review the documentation diff.

## Risks

- CLI syntax can evolve; commands are based on the current official `vercel-labs/skills` documentation.
- Users may confuse skill-file updates with repository artifact migrations, so the README must state the two-step distinction explicitly.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Documentation

- [x] 1.1 Add copy-pasteable update instructions and scope guidance to the README — 8570ed6
- [x] 1.2 Run the repository validation gate and review the documentation diff — 8570ed6
