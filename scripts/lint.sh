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
