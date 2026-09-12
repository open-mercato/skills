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
- **`<paths.qa>/test-env.json`** — written by `om-prepare-test-env`, consumed by `om-auto-qa-pr` and `om-integration-tests`.
- **Generated launcher scripts in `<paths.scripts>/`** — created by `om-prepare-test-env`, re-run by later runs and other skills.
- **Chaining reference lines** (`PR: #<number> (link: <url>)`, `Issue: #<number> (link: <url>)`, `Spec: <path>`) — emitted at the end of every PR-producing/-driving skill's final report, parsed by the next skill in a chain and by session orchestrators (e.g. cezar).
- **Routing lines from `om-brainstorm`** (`Next: none` | `Next: om-<skill> <args>`, plus `Brief: <repo-relative path>` when a handoff brief was written) — emitted at the end of its final report, parsed by session orchestrators to route the follow-up run. The `— brief: <path>` suffix inside the args is read by the routed skill (`om-prepare-issue`, `om-auto-write-spec`, `om-spec-writing`, `om-auto-create-pr`), which ingests the brief file and makes its payload durable per the brief lifecycle in `om-brainstorm/references/exit-ramps.md`. Additive; no existing consumer changes.

The product brief written by `om-discover` keeps its existing section headings, ids, source tags, table fields and output markers (`Product brief:`, `Coverage:`, `Collection plan:`, `Next:`). The Decision summary and additional table columns are optional for readers of older briefs. Read canonical sections and follow their id/source references; a recorded scope choice is not evidence of demand. Coverage retains its legacy tagged-line scope, excluding Hypotheses to test. The separate synthetic-hypothesis header note explains that exclusion without changing the counter's meaning or invalidating older briefs that lack the note.

`om-discover` keeps the `Next:` marker and parser shape but corrects its meaning: only an authorized, unstarted action ready to run is pending. Declined or unaccepted offers, completed actions and blocked handoffs emit `Next: none`. Consumers must not treat a legacy discovery report's non-`none` marker alone as authorization, because older reports could include declined or completed actions. Supported arguments are preserved, including backlog `--dry-run` and the panel subject (`--app` for a running-product check), flow and research directory. Human-facing report paragraphs may be combined; machine markers, brief headings, table fields and evidence counting remain the contract.

**Breaking:** changing any of these formats so an unmodified consumer skill can no longer parse output produced by a modified producer (or vice versa). **Required path:** update producer and all consumers in one PR, and keep the parser tolerant of the previous format when consumer repos may hold old artifacts (committed plans, descriptors).

The 2026-07-21 marker migration (`PR_URL=` / `PR_NUMBER=` / `SPEC_PATH=` → the human-friendly `PR:` / `Issue:` / `Spec:` lines) follows that path: emitters write only the new form; every consumer keeps accepting the legacy lines for output produced by older skill versions.

Adding the provider-neutral `browser` object to `test-env.json` is additive;
readers must continue accepting the legacy `playwright` object.

### 6. The label taxonomy semantics

The pipeline/category/meta/priority/risk groups, their exclusivity rules, and the QA-gate meaning of `needs-qa`/`qa-approved`/`skip-qa`. Consumer repos have these labels created in their trackers and encoded in their committed `SDLC.md`.

- **Breaking:** renaming a label, changing a group's exclusivity, weakening the QA gate rule.
- **Required path:** additive labels only; renames need a documented migration note and support for both names in the skills for one release cycle.

Adding the `ci-monitoring` meta label is additive and follows that path: it is a new
meta label (never a pipeline label, so exclusivity is untouched), every skill applies
and removes it through the existing `apply_label` guard so a repo that has not created
it degrades to a logged skip, and no existing label's meaning changed. Its one
semantic claim on the taxonomy is a narrowing of `in-progress`: that label now means
*actively working*, and a run that has finished and reported its work swaps to
`ci-monitoring` while it waits on CI. Claim detection must therefore never treat
`ci-monitoring` as a lock signal.

### 7. Installer CLI (`package.json` scripts, `scripts/install-skills.mjs`)

`npm run install-skills` / `uninstall-skills` flags and behavior, and the skills.sh-compatible repo layout it relies on.

- **Breaking:** removing a script or flag, moving `skills/` — this breaks documented install instructions and skills.sh scanning.
- **Required path:** keep old flags as deprecated aliases; update README in the same PR.

## Out of scope

Prose wording inside skills, `references/` content that no other skill parses, README marketing copy, and this repo's own CI workflows may change freely — they have no external consumers beyond fresh installs.
