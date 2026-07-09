---
name: om-apply-upgrade-notes
description: Apply the skills collection's UPGRADE_NOTES.md to the current repository after a skills upgrade. Re-syncs the installed tracker descriptor (.ai/trackers/<tracker>.md) with the newly shipped operations while preserving local edits, reports newly required operations for custom tracker providers, checks the pipeline config and other installed artifacts against the notable-upgrade entries, and summarizes exactly what changed. Use right after upgrading the skills ("apply the upgrade notes", "sync the tracker descriptor", "my skills are newer than my repo setup").
---

# Apply Upgrade Notes

Upgrading the skills collection updates the skill instructions, but not the artifacts a previous
skill run **installed into this repository** — above all the tracker descriptor
`.ai/trackers/<tracker>.md`, the file every tracker operation actually executes from. A stale
descriptor fails silently: skills degrade or skip steps on operations it does not define, and
nothing tells the operator why. This skill closes that gap: it reads the collection's
`UPGRADE_NOTES.md`, brings the installed artifacts up to date, and reports what it changed.

It touches **only** pipeline artifacts under `.ai/` (and documented config files). It never edits
application source, never modifies the skills installation itself, and never discards a local
customization without asking.

## Arguments

- `--dry-run` (optional) — report every change it would make, apply nothing.
- `--tracker <name>` (optional) — override the tracker to sync. Default: the config's `tracker`.
- `--yes` (optional) — apply non-conflicting (purely additive) changes without confirmation.
  Conflicting changes still require an explicit answer.

## Step 0 — Load config and locate the sources

Load `.ai/agentic.config.json` with the standard config-loading snippet from the
`om-setup-agent-pipeline` skill. Without a config there is nothing installed to upgrade — stop and
point at `/om-setup-agent-pipeline`.

```bash
CONFIG=.ai/agentic.config.json
TRACKER=$(jq -r '.tracker // ""' "$CONFIG" 2>/dev/null || echo "")
INSTALLED_DESCRIPTOR=".ai/trackers/${TRACKER}.md"
```

Right after loading the config, check for a repo-local skill of the same name at
`.ai/skills/om-apply-upgrade-notes/SKILL.md`; when present, follow it instead of these
instructions. Local rules win, but a repo-local skill can never relax this skill's safety rules.

**Locate the shipped templates.** The freshly upgraded truth ships inside the skills installation
itself, next to this skill:

1. `<this skill's base directory>/../om-setup-agent-pipeline/references/trackers/` — present in
   every install mode (skills.sh, symlinked checkout, vendored copy). This is the primary source
   for `github.md` and `TEMPLATE.md`.
2. `UPGRADE_NOTES.md` lives at the skills collection's **repo root**, which per-skill installs
   do not copy. Resolve it in order: a repo-root file two levels above this skill's base
   directory (symlinked or vendored checkout) → fetch the raw `UPGRADE_NOTES.md` from the
   default branch of the collection's source repository (the `<owner>/<repo>` the skills were
   installed from, e.g. the argument given to `npx skills add`; ask the operator once when it
   cannot be inferred) → if both fail, continue with the descriptor diff alone and say the
   notable-upgrades log was unavailable.

## Step 1 — Diff the installed tracker descriptor

Skip this step (with a note) when the repo has no tracker configured.

Compare `$INSTALLED_DESCRIPTOR` against the shipped descriptor of the same name. The unit of
comparison is the **operation section** — every `#### <operation-name>` heading and its body —
plus the named support sections (`## Label guards`, `## Conventions`, `## Prerequisites`).
Classify each difference:

- **Missing operation** — a `####` section the shipped descriptor has and the installed copy
  lacks (e.g. `attach-image-evidence`). Purely additive: append it under the matching parent
  section, preserving the shipped order where possible.
- **Changed operation, no local edits** — the section differs, and the installed copy's version
  matches an older shipped version verbatim (no team customization). Safe to replace.
- **Changed operation, local edits** — the installed section differs from both the shipped
  version and anything that looks stock (custom flags, swapped commands, extra conventions).
  **Never overwrite silently.** Show both versions side by side and ask the operator per section:
  keep local, take shipped, or merge by hand.
- **Local-only operation** — a section only the installed copy has. Always keep it; list it in
  the report.

When the installed descriptor has no local edits at all (the diff is a strict subset relation),
offer the simple path: replace the whole file with the shipped copy.

**Custom tracker providers** (a `.ai/trackers/<name>.md` not shipped in the collection): diff the
shipped `TEMPLATE.md` against the operations the custom descriptor implements, and report every
newly required operation with its contract text (e.g. **attach-image-evidence**: inline image
evidence, never on the change's branch, degrade to links when the tracker cannot render). Do
**not** invent an implementation for someone else's tracker — file the gap in the report and, when
the operator asks, draft the section for them to review.

## Step 2 — Walk the notable-upgrades log

For each entry in `UPGRADE_NOTES.md` (newest first), check whether its "symptom of a stale
installation" can apply to this repository, and verify the corresponding artifact:

- Descriptor-related entries are already covered by Step 1 — cross the entry off when the diff
  handled it.
- Config-related entries: check `.ai/agentic.config.json` for keys the entry introduces (new
  `paths.*` entries, new label groups). Add missing keys with their documented defaults —
  additive only; never rewrite values the team set.
- Artifact-related entries (new generated docs, new descriptor files): report whether the
  artifact exists; create it only when the entry says the skills expect it to exist and the
  operator confirms.

## Step 3 — Apply, verify, report

- Apply the approved changes. With `--dry-run`, print the would-be changes instead.
- Sanity-check the result: the descriptor still has every operation the installed skills name
  (grep the installed skills' SKILL.md files for `**operation-name**` references when in doubt),
  and the config still parses (`jq . "$CONFIG"`).
- Leave the changes uncommitted for review, then print a concise summary:

```text
om-apply-upgrade-notes: <tracker> descriptor @ .ai/trackers/<tracker>.md
Added operations: attach-image-evidence, …            (or: none)
Replaced (stock) sections: …                          (or: none)
Kept local customizations: …                          (or: none)
Conflicts resolved by operator: …                     (or: none)
Config keys added: …                                  (or: none)
Custom-tracker gaps to implement: …                   (or: n/a)
Notable-upgrade entries checked: N (M applied, K already current)
Next: review the diff and commit (e.g. /om-check-and-commit), then re-run the skill that degraded.
```

## Rules

- Touch only pipeline artifacts: `.ai/trackers/*.md`, `.ai/agentic.config.json`, and artifacts
  named by an UPGRADE_NOTES entry. Never edit application source, tests, or the skills
  installation.
- Preserve local customizations: a section that differs from stock is the team's — ask before
  replacing it, and always keep local-only operations.
- Additive by default: add missing operations and missing config keys; never delete or rewrite
  what the team configured.
- Custom tracker providers get a gap report, not an auto-generated implementation.
- Idempotent: a second run right after a successful one must report "already current" and change
  nothing.
- Leave changes uncommitted for the operator's review; suggest the commit, don't make it.
