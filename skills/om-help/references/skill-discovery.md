# Skill discovery (step 3)

How `om-help` builds its skill list at run time from what is actually installed. This replaces a hand-written catalog: a catalog drifts from the installed versions, the frontmatter cannot.

## Roots, in precedence order

Run from the repository root. Scan every root that exists; a missing root is normal. Only skills of the `om-` set are routed: a directory whose name does not start with `om-` is not read, listed, or recommended, in any root.

| # | Root | Kind |
|---|---|---|
| 1 | `.ai/skills/` | repo-local — overlays of installed skills, or repo-only skills |
| 2 | `.agents/skills/`, `.claude/skills/`, `.codex/skills/` | project-level installs |
| 3 | each `help.skillRoots` entry | extra roots the repository declares |
| 4 | `SKILLS_ROOT` — the parent directory of this skill's own installed directory (resolve it from where the `SKILL.md` you are reading lives, not from a guess) | the install this skill came from |
| 5 | `~/.agents/skills/`, `~/.claude/skills/`, `~/.codex/skills/` | user-level installs |

An install lock or manifest kept by a skills CLI may corroborate the list, but only a `SKILL.md` on disk counts as installed.

## Snippet (POSIX shell)

Prints one tab-separated row per found skill: `root`, `directory`, `name`, `description`. Folded (`>`) and literal (`|`) YAML descriptions are joined into one line.

```bash
skill_meta() {  # $1 = path to a SKILL.md → "name<TAB>description"
  awk '
    NR == 1 { if ($0 != "---") exit; next }
    /^---[[:space:]]*$/ { exit }
    /^name:/        { n = $0; sub(/^name:[[:space:]]*/, "", n); gsub(/^"|"$/, "", n); k = ""; next }
    /^description:/ { d = $0; sub(/^description:[[:space:]]*/, "", d)
                      if (d ~ /^[>|][-+]?$/) { d = ""; k = "d" } else { gsub(/^"|"$/, "", d); k = "" }
                      next }
    k == "d" && /^[[:space:]]+[^[:space:]]/ { l = $0; sub(/^[[:space:]]+/, "", l); d = (d == "" ? l : d " " l); next }
    { k = "" }
    END { printf "%s\t%s\n", n, d }
  ' "$1"
}

# SKILLS_ROOT: parent directory of this skill's installed directory (may be empty).
printf '%s\n' .ai/skills .agents/skills .claude/skills .codex/skills \
  ${HELP_SKILL_ROOTS:+"$HELP_SKILL_ROOTS"} "${SKILLS_ROOT:-}" \
  "$HOME/.agents/skills" "$HOME/.claude/skills" "$HOME/.codex/skills" |
while IFS= read -r root; do
  [ -n "$root" ] && [ -d "$root" ] || continue
  for f in "$root"/om-*/SKILL.md; do   # om- set only
    [ -f "$f" ] || continue
    printf '%s\t%s\t%s\n' "$root" "$(basename "$(dirname "$f")")" "$(skill_meta "$f")"
  done
done
```

`HELP_SKILL_ROOTS` holds the validated `help.skillRoots` entries, newline-separated, with a leading `~/` expanded to `$HOME/`.

## Building the list

1. **Validate each row.** `name` must equal the directory name and match `^om-[a-z][a-z-]*$` (the same shape the `Next:` line carries); `description` must be non-empty. A malformed row is listed under "skipped" in an inventory answer and never recommended. **Exception — banner overlays:** a `.ai/skills/om-<name>/SKILL.md` with no frontmatter (empty `name`) whose first line is the overlay banner (`head -n 1` matches `^> \*\*Repo-local override\.\*\* `) is a valid overlay of `om-<name>` in the shape `om-create-skill` prescribes, not a malformed row. It takes its name from the directory and its trigger text from the banner sentence.
2. **One entry per name.** The first installed copy by the precedence order above supplies the description (roots 2–5). When the same name appears in several installed roots, note the others only in an inventory answer.
3. **Overlays.** A `.ai/skills/<name>/` folder whose name is also installed is an overlay: the installed skill applies it through its `ALWAYS check first` line. Route on the installed description; add any repo-specific triggers the overlay states — its banner sentence, or for an older overlay its frontmatter `description`. Mark the entry "(repo overlay)". A banner overlay with no installed counterpart has no skill to extend: list it as "⚠️ overlay without an installed base" in an inventory answer and never recommend it.
4. **Repo-local skills.** A `.ai/skills/om-<name>/` folder with no installed counterpart is a repo-local skill — recommendable, marked "(repo-local)". The agent may not auto-register it; tell the user to invoke it by name if their client does, or to follow its `SKILL.md` directly.
5. **Nothing found** → say so, name the roots searched, and answer from the repository's `AGENTS.md` alone with `Next: none`.

Read only the frontmatter here. A skill's body is opened only when the user picks that route and asks for its details.
