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
  fi

  # A bare ': ' inside an UNQUOTED frontmatter value makes the YAML invalid
  # ("mapping values are not allowed here"). The skills CLI does not report an
  # error for that — it silently skips the skill, so it never installs and
  # quietly disappears on the next reinstall. Quote the value or rephrase
  # (the collection uses an em dash for this).
  while IFS= read -r fm_line; do
    fm_key=${fm_line%%:*}
    fm_val=${fm_line#*: }
    case "$fm_val" in
      '"'*|"'"*) continue ;;
    esac
    case "$fm_val" in
      *': '*) err "$file frontmatter '$fm_key' has a bare ': ' in an unquoted value — invalid YAML, so the skill is silently skipped on install. Quote it or use an em dash." ;;
    esac
  done < <(printf '%s\n' "$fm" | grep -E '^(name|description):' || true)
done

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
