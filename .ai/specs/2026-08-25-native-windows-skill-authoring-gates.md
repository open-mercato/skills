# Shell-Neutral Skill-Authoring Gates

## TLDR

Express skill completeness and reference checks once without shell-language logic.

## Dependency and scope

Depends on config/setup and exclusively owns `skills/om-create-skill/references/gates.md`, `repo-invariants.md`, and `shared-boilerplate.md`.

## Proposed solution

Use structured file discovery/reads and direct executable argument arrays only when a repository command is needed. Preserve gate names, ordering, diagnostics, and exit behavior.

## Validation and plan

1.1 Add fixtures for valid, missing frontmatter, wrong name, missing reference, overlong description, and paths with spaces/Unicode.

1.2 Rewrite owned gate recipes without evaluated command strings or OS branches.

1.3 Assert identical pass/fail classifications and normalized diagnostics on Ubuntu and Windows, with no shell process.

## Completion Criteria

- Every documented authoring gate executes through agent file/process capabilities.
- Invalid fixtures fail the same gate on both OSes.
- No frontmatter or skill-layout contract changes.
