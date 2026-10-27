# The overlay contract — repo-local `.ai/skills/<name>/SKILL.md`

The shape `om-create-skill` gives a repo-local overlay (a repo-specific delta on
top of an installed skill). Author mode opens this file when the brief turns out
to be a delta to an existing skill, or when it scaffolds the optional overlay for
a new skill (`references/author-workflow.md` steps 1 and 4); the overlay gate in
`references/gates.md` checks the result.

## When an overlay is the right answer

Ask in this order and stop at the first yes:

1. **Does the change make sense in a repository other than this one?** → it is
   not an overlay. Change the base skill instead (a new mode, config key, or
   slot), so every consumer gets it.
2. **Is it new behavior with its own goal and trigger?** → it is a new skill with
   its own name, not an overlay.
3. **Is it this repository's specifics for an existing skill** (exact commands,
   ports, seeded accounts, extra checklist items, an extra ramp)? → write an
   overlay.

An overlay is a safety valve, not a mechanism: each one points at a slot the base
skill is missing. Say so in the report, so the missing slot can be proposed
upstream.

## The shape

1. **No frontmatter.** The file must not start with `---`. A frontmattered
   `SKILL.md` can be discovered by a harness as a second skill with the same
   name; an overlay is configuration read by the base skill, never a skill.
2. **First line** — `> **Repo-local override.**` followed by one sentence naming
   what it overrides, e.g.
   `> **Repo-local override.** Adds this repository's container-based validation runner to the base skill's validation step.`
3. **Only named delta sections.** Every `##` heading names the part of the base
   skill it changes and how — for example `## Step 3 — validation (replace)` or
   `## Rules (add)`. Do not copy base text you are not changing; do not restate
   the base workflow. An `@`-import of the base skill is allowed and is not a
   delta section.
4. **Under 50% of the base.** The overlay's line count must stay below half of
   the base `SKILL.md`'s line count. Over that it is not a delta but a fork: push
   the change into the base skill (a slot or config key everyone can use), or give
   it its own name as a separate skill.
5. **Never relaxes safety.** An overlay may add repository specifics and win on
   them; it cannot relax safety or quality rules, expand tool or network access,
   or redirect outputs. The base skill skips and reports any directive that tries
   (its step-0 repo-local extension check).

## Existing overlays

An older overlay that still carries frontmatter keeps loading (the base skill only
reads the file). When you touch one, normalize it to this shape in the same
change; when it is over the 50% limit, report it as a fork instead of growing it.

## The overlay gate (manual — not part of `scripts/lint.sh`)

Set `NAME` to the skill name and `BASE` to the base `SKILL.md` (the installed
copy, or `skills/$NAME/SKILL.md` in the collection repository):

```bash
NAME=<skill-name>
BASE=<path-to-base-SKILL.md>
ov=".ai/skills/$NAME/SKILL.md"
[ "$(head -n 1 "$ov")" = "---" ] && echo "FAIL: overlay has frontmatter"
head -n 1 "$ov" | grep -q '^> \*\*Repo-local override\.\*\* ' || echo "FAIL: first line is not the override banner"
ov_lines=$(wc -l < "$ov"); base_lines=$(wc -l < "$BASE")
[ $((ov_lines * 2)) -lt "$base_lines" ] \
  && echo "size: $ov_lines of $base_lines lines (under 50%)" \
  || echo "FAIL: $ov_lines of $base_lines lines — a fork, not a delta"
```

Pass condition: no `FAIL:` lines, and reading the file confirms every `##`
section names a base section and changes something.
