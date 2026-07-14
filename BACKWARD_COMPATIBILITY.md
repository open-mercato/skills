# Backward compatibility

What this repository considers a **protected contract surface** and how changes to one must be handled. Review skills flag violations as Critical; implementation skills warn the user before shipping one. The consumers of these contracts are installed copies of the skills in third-party repos and the repos' committed `.ai/` state — neither of which this repository can migrate for them.

## Protected surfaces

### 1. Skill names and the directory layout

`skills/<name>/SKILL.md` with frontmatter `name` equal to the directory. Installed skills are invoked by name (`/om-auto-create-pr`), skills reference each other by name, and repo-local overrides shadow by name at `.ai/skills/<name>/SKILL.md`.

- **Breaking:** renaming or removing a skill, changing the `om-` prefix convention.
- **Required path:** keep the old name as a deprecated alias skill for at least one release cycle, note the rename in the README and `DECISIONS.md`.

### 2. The config schema (`.ai/agentic.config.json`)

Written once per consumer repo by `om-setup-agent-pipeline` and read by every skill via the standard loading snippet. Consumer repos commit this file; they will not regenerate it on upgrade.

- **Breaking:** removing or renaming a key, changing a key's meaning or value format, making a previously optional key required.
- **Not breaking:** adding a new key with a default in the loading snippet (`jq -r '.newKey // "default"'`).
- **Required path:** new keys always ship with defaults so existing configs keep working; a genuinely incompatible change needs a `version` bump plus explicit migration handling in `om-setup-agent-pipeline`.

### 3. The tracker operations contract

The named operations (**get-issue**, **create-pr**, **comment-pr**, **merge-pr**, …) and label guards (`label_exists`, `apply_label`, `apply_issue_label`, `remove_issue_label`, `set_pipeline_label`) defined by `skills/om-setup-agent-pipeline/references/trackers/TEMPLATE.md`. Consumer repos hold committed, possibly team-edited copies at `.ai/trackers/<tracker>.md`.

- **Breaking:** renaming an operation, changing an operation's inputs/outputs, removing a guard, referencing a new operation from a skill without adding it to the template and shipped descriptors.
- **Required path:** add new operations to `TEMPLATE.md` and every shipped descriptor in the same PR; skills must degrade gracefully (documented fallback) when running against an older descriptor copy that lacks a newly added operation.

### 4. The browser-provider operations contract

The named browser operations (**ensure-installed**, **doctor**, **open**,
**snapshot**, **interact**, **assert**, **screenshot**, **close**) defined by
`skills/om-setup-agent-pipeline/references/browsers/TEMPLATE.md`. Consumer repos
hold committed, possibly team-edited copies at `.ai/browsers/<provider>.md`.

- **Breaking:** renaming an operation, changing its inputs/outputs, or selecting
  a provider without installing its descriptor.
- **Required path:** update `TEMPLATE.md` and every shipped browser descriptor in
  the same PR. Browser consumers must retain the implicit Playwright fallback
  for configs and environment descriptors created before this contract existed.

### 5. Cross-skill file formats

- **Execution-plan `## Progress` section** (`- [ ]` / `- [x]` checklists with `N.M` step ids and ` — <sha>` suffixes) — written by `om-auto-create-pr`, parsed by `om-auto-continue-pr`.
- **PR body `Tracking plan:` and `Status:` lines** — written by `om-auto-create-pr`, parsed by `om-auto-continue-pr` and the loop skills.
- **`<paths.qa>/test-env.json`** — written by `om-prepare-test-env`, consumed by `om-auto-verify-pr-ui` and `om-integration-tests`.
- **Generated launcher scripts in `<paths.scripts>/`** — created by `om-prepare-test-env`, re-run by later runs and other skills.

**Breaking:** changing any of these formats so an unmodified consumer skill can no longer parse output produced by a modified producer (or vice versa). **Required path:** update producer and all consumers in one PR, and keep the parser tolerant of the previous format when consumer repos may hold old artifacts (committed plans, descriptors).

Adding the provider-neutral `browser` object to `test-env.json` is additive;
readers must continue accepting the legacy `playwright` object.

### 6. The label taxonomy semantics

The pipeline/category/meta/priority/risk groups, their exclusivity rules, and the QA-gate meaning of `needs-qa`/`qa-approved`/`skip-qa`. Consumer repos have these labels created in their trackers and encoded in their committed `SDLC.md`.

- **Breaking:** renaming a label, changing a group's exclusivity, weakening the QA gate rule.
- **Required path:** additive labels only; renames need a documented migration note and support for both names in the skills for one release cycle.

### 7. Installer CLI (`package.json` scripts, `scripts/install-skills.mjs`)

`npm run install-skills` / `uninstall-skills` flags and behavior, and the skills.sh-compatible repo layout it relies on.

- **Breaking:** removing a script or flag, moving `skills/` — this breaks documented install instructions and skills.sh scanning.
- **Required path:** keep old flags as deprecated aliases; update README in the same PR.

## Out of scope

Prose wording inside skills, `references/` content that no other skill parses, README marketing copy, and this repo's own CI workflows may change freely — they have no external consumers beyond fresh installs.
