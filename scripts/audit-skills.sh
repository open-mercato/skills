#!/usr/bin/env bash
# Fetch skills.sh security-audit results for every skill in skills/ and report.
#
# skills.sh aggregates third-party audits (Gen Agent Trust Hub, Socket, Snyk)
# for every published skill. This script queries the public audit API per skill,
# prints a status table, and exits non-zero when any provider reports "fail"
# (or "warn" too, with AUDIT_FAIL_ON=warn).
#
# Usage:
#   bash scripts/audit-skills.sh                 # fail only on "fail" statuses
#   AUDIT_FAIL_ON=warn bash scripts/audit-skills.sh
#
# Note: audits run on the skills.sh side against the *published* registry
# content, so results lag pushes until the registry re-audits. This check is
# for awareness, not a content gate on the current commit.
set -euo pipefail

SOURCE="${AUDIT_SOURCE:-open-mercato/skills}"
API_BASE="https://skills.sh/api/v1/skills/audit"
FAIL_ON="${AUDIT_FAIL_ON:-fail}"
SKILLS_DIR="$(cd "$(dirname "$0")/.." && pwd)/skills"

command -v jq >/dev/null || { echo "jq is required" >&2; exit 2; }

fails=0
warns=0
rows=""

for dir in "$SKILLS_DIR"/*/; do
  skill=$(basename "$dir")
  json=$(curl -sf --max-time 30 "$API_BASE/$SOURCE/$skill" || echo "")
  if [ -z "$json" ]; then
    rows="$rows$skill|not-published|-|-\n"
    continue
  fi
  line=$(echo "$json" | jq -r '
    [.audits[] | "\(.slug)=\(.status)\(if .riskLevel then " (" + .riskLevel + ")" else "" end)"]
    | join("|")')
  statuses=$(echo "$json" | jq -r '[.audits[].status] | join(" ")')
  case " $statuses " in *" fail "*) fails=$((fails+1));; esac
  case " $statuses " in *" warn "*) warns=$((warns+1));; esac
  rows="$rows$skill|$line\n"
done

echo "skills.sh audit results for $SOURCE"
echo
# shellcheck disable=SC2059
printf "$rows" | column -t -s '|'
echo
echo "Summary: $fails skill(s) with a FAIL, $warns skill(s) with a WARN."

# Markdown summary for GitHub Actions
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## skills.sh security audit — $SOURCE"
    echo
    echo "| Skill | Audits |"
    echo "|---|---|"
    # shellcheck disable=SC2059
    printf "$rows" | awk -F'|' '{ skill=$1; $1=""; sub(/^\|/, "", $0); gsub(/\|/, " · "); print "| " skill " |" $0 " |" }'
    echo
    echo "**$fails fail / $warns warn** — details: https://skills.sh/$SOURCE"
  } >> "$GITHUB_STEP_SUMMARY"
fi

if [ "$fails" -gt 0 ]; then
  echo "::error::$fails skill(s) have a failing skills.sh audit — see https://skills.sh/$SOURCE"
  exit 1
fi
if [ "$FAIL_ON" = "warn" ] && [ "$warns" -gt 0 ]; then
  echo "::warning::$warns skill(s) have audit warnings — see https://skills.sh/$SOURCE"
  exit 1
fi
exit 0
