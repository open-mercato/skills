#!/usr/bin/env bash
# Lint gate for the skills collection.
# 1. Frontmatter: every skills/<name>/SKILL.md declares name (== directory) and a description.
# 2. Grep gate: installable skill content must be product-agnostic — no upstream-monorepo
#    tokens, no hard-coded base branch, no hard-coded package manager. The om- name
#    prefix is the naming convention and is allowed; agnosticism is about behavior.
# Scope: skills/** only. README, LICENSE, and DECISIONS.md may reference the upstream project.
set -uo pipefail

cd "$(dirname "$0")/.."
fail=0

err() { printf 'LINT FAIL: %s\n' "$*" >&2; fail=1; }

for dir in skills/*/; do
  name=$(basename "$dir")
  file="${dir}SKILL.md"
  if [ ! -f "$file" ]; then
    err "$dir is missing SKILL.md"
    continue
  fi
  if [ "$(head -n 1 "$file")" != "---" ]; then
    err "$file does not start with frontmatter"
    continue
  fi
  fm=$(awk 'NR==1 {next} /^---$/ {exit} {print}' "$file")
  fm_name=$(printf '%s\n' "$fm" | sed -n 's/^name:[[:space:]]*//p' | head -n 1)
  fm_desc=$(printf '%s\n' "$fm" | sed -n 's/^description:[[:space:]]*//p' | head -n 1)
  if [ "$fm_name" != "$name" ]; then
    err "$file frontmatter name '$fm_name' does not match directory '$name'"
  fi
  if [ -z "$fm_desc" ]; then
    err "$file frontmatter is missing a description"
  elif [ "${#fm_desc}" -gt 500 ]; then
    err "$file description is ${#fm_desc} chars (max 500; aim for ≤350) — descriptions load into every session's context"
  fi
  # Unquoted ": " inside a plain YAML scalar is invalid YAML and the most common
  # cross-client parse failure (agentskills.io client guide). Quote it or rephrase.
  case "$fm_desc" in
    \"*|\'*) : ;;
    *": "*) err "$file description contains an unquoted ': ' — invalid YAML for strict parsers; rephrase (use — ) or quote the value" ;;
  esac
  # Progressive-disclosure budget: a SKILL.md body should stay under ~5k tokens
  # (~20000 chars); push detail into references/ instead (agentskills.io tier-2 guidance).
  body_chars=$(awk 'f{print} /^---$/{c++; if(c==2) f=1}' "$file" | wc -c)
  if [ "$body_chars" -gt 20000 ]; then
    err "$file body is ${body_chars} chars (budget 20000 ≈ 5k tokens) — move detail into references/"
  fi
done

# Reference-resolution gate: every `references/...` pointer in a skill's markdown
# must resolve — same-skill pointers relative to the skill dir, cross-skill
# pointers written as explicit om-<skill>/references/<file> paths.
ref_hits=$(grep -roE --include='*.md' '(om-[a-z-]+/)?references/[A-Za-z0-9._/-]+\.(md|py|sh|png)' skills 2>/dev/null | sort -u || true)
while IFS= read -r line; do
  [ -n "$line" ] || continue
  src=${line%%:*}
  ref=${line#*:}
  skill_dir=$(printf '%s' "$src" | cut -d/ -f1-2)
  case "$ref" in
    om-*) target="skills/$ref" ;;
    *)    target="$skill_dir/$ref" ;;
  esac
  [ -e "$target" ] || err "$src points at missing $ref"
done <<EOF
$ref_hits
EOF

# Roster-sync gate: the cross-skill coverage roster shipped in
# om-setup-agent-pipeline must list exactly the skills in skills/ — installed
# setups use it to tell a missing collection skill from an unrelated om- token.
roster_file=skills/om-setup-agent-pipeline/references/skill-coverage.md
if [ ! -f "$roster_file" ]; then
  err "missing $roster_file (cross-skill coverage roster)"
else
  roster=$(sed -n 's/^ROSTER="\(.*\)"$/\1/p' "$roster_file" | tr ' ' '\n' | sed '/^$/d' | sort)
  shipped=$(ls skills | sort)
  if [ "$roster" != "$shipped" ]; then
    err "coverage roster in $roster_file is out of sync with skills/:"
    diff <(printf '%s\n' "$roster") <(printf '%s\n' "$shipped") >&2
  fi
fi

patterns=(
  '[Oo]pen[- ][Mm]ercato'
  '@open-mercato'
  '(^|[^[:alnum:]-])develop($|[^[:alnum:]-])'
  '(^|[^[:alnum:]])yarn '
  'findWithDecryption'
)

for pattern in "${patterns[@]}"; do
  hits=$(grep -rEn "$pattern" skills/ 2>/dev/null || true)
  if [ -n "$hits" ]; then
    err "forbidden pattern '$pattern' found:"
    printf '%s\n' "$hits" >&2
  fi
done

# Tracker-abstraction gate: no direct gh CLI usage inside skills — all tracker
# operations go through the descriptor layer. The shipped descriptors under
# references/trackers/ are the one place gh commands belong.
gh_hits=$(grep -rEn '(^|[`"[:space:]])gh (api|pr|issue|label|repo|search|auth|run) ' skills/ 2>/dev/null | grep -v 'references/trackers/' || true)
if [ -n "$gh_hits" ]; then
  err "direct gh CLI usage found outside references/trackers/ (use a tracker operation instead):"
  printf '%s\n' "$gh_hits" >&2
fi

if [ "$fail" -ne 0 ]; then
  echo "Lint failed." >&2
  exit 1
fi
echo "Lint OK."
