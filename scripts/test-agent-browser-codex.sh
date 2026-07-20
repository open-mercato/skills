#!/usr/bin/env bash
set -euo pipefail

ROOT=$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)
FIXTURE_SOURCE="$ROOT/scripts/fixtures/agent-browser-codex"
TMP_ROOT=${TMPDIR:-/tmp}
FIXTURE=$(mktemp -d "$TMP_ROOT/agent-browser-codex.XXXXXX")
LOG_DIR="$FIXTURE/codex-logs"

cleanup() {
  if [ -f "$FIXTURE/.ai/scripts/test-env-down.sh" ]; then
    (cd "$FIXTURE" && sh .ai/scripts/test-env-down.sh) >/dev/null 2>&1 || true
  fi
  if [ "${KEEP_CODEX_E2E_FIXTURE:-0}" != 1 ]; then rm -rf "$FIXTURE"; fi
}
trap cleanup EXIT

command -v codex >/dev/null 2>&1 || { echo "codex CLI is required" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "node is required by the local fixture app" >&2; exit 1; }

cp -R "$FIXTURE_SOURCE/." "$FIXTURE/"
mkdir -p "$FIXTURE/.agents/skills" "$FIXTURE/.ai/browsers" "$LOG_DIR"
for skill in om-setup-agent-pipeline om-prepare-test-env om-auto-qa-pr om-integration-tests; do
  ln -s "$ROOT/skills/$skill" "$FIXTURE/.agents/skills/$skill"
done
cp "$ROOT/skills/om-setup-agent-pipeline/references/browsers/agent-browser.md" "$FIXTURE/.ai/browsers/agent-browser.md"

git -C "$FIXTURE" init -q
git -C "$FIXTURE" branch -M main
git -C "$FIXTURE" config user.name "Codex Browser Test"
git -C "$FIXTURE" config user.email "codex-browser-test@example.invalid"
git -C "$FIXTURE" add .
git -C "$FIXTURE" commit -qm "test: baseline fixture"
cp "$FIXTURE/index.changed.html" "$FIXTURE/index.html"

run_codex() {
  local name=$1
  local prompt=$2
  codex exec --ephemeral --sandbox danger-full-access --ignore-user-config --json \
    -C "$FIXTURE" "$prompt" > "$LOG_DIR/$name.jsonl"
}

run_codex prepare 'Use $om-prepare-test-env with --mode dev --no-ephemeral and --browser-provider agent-browser. This is an isolated test fixture; proceed without questions. The app command and port contract are in AGENTS.md. Finish only after the generated entrypoint passes cold and warm runs and test-env.json reports a healthy agent-browser provider.'

test -s "$FIXTURE/.ai/qa/test-env.json"
node -e 'const d=require(process.argv[1]); if(d.status!=="running"||d.browser?.provider!=="agent-browser"||d.browser?.installed!==true) process.exit(1)' "$FIXTURE/.ai/qa/test-env.json"

run_codex verify 'Use $om-auto-qa-pr in local evidence-only mode with --keep-env. Verify the uncommitted title and button-text change through the configured agent-browser provider. Proceed without questions. Require a PASS report and a non-empty PNG under .ai/qa; do not modify index.html.'

REPORT=$(find "$FIXTURE/.ai/qa" -path '*/report.json' -type f | head -n 1)
test -n "$REPORT"
node -e 'const d=require(process.argv[1]); if(d.verdict!=="PASS"||d.environment?.browserProvider!=="agent-browser") process.exit(1)' "$REPORT"
find "$FIXTURE/.ai/qa" -name '*.png' -type f -size +0c | grep -q .

run_codex integration 'Use $om-integration-tests to add and run an executable UI regression test for the changed title and button. The configured provider is agent-browser and there is no repository-native E2E runner. You are pre-authorized to scaffold matching tests/browser/fixture-title.sh and tests/browser/fixture-title.ps1 launchers as the skill describes; proceed without questions, run the POSIX launcher, and leave both files passing and semantically equivalent. The PowerShell launcher must invoke the native .ps1 environment entrypoint when present and must not invoke sh, WSL, Git Bash, or POSIX utilities.'

test -s "$FIXTURE/tests/browser/fixture-title.sh"
test -s "$FIXTURE/tests/browser/fixture-title.ps1"
grep -q 'agent-browser' "$FIXTURE/tests/browser/fixture-title.sh"
grep -q 'agent-browser' "$FIXTURE/tests/browser/fixture-title.ps1"
if grep -Eq '(^|[&[:space:]])sh[[:space:]]' "$FIXTURE/tests/browser/fixture-title.ps1"; then
  echo "PowerShell launcher depends on sh" >&2
  exit 1
fi
grep -q 'agent-browser' "$LOG_DIR/prepare.jsonl"
grep -q 'agent-browser' "$LOG_DIR/verify.jsonl"
grep -q 'agent-browser' "$LOG_DIR/integration.jsonl"

printf 'Codex agent-browser E2E OK\nFixture: %s\nLogs: %s\n' "$FIXTURE" "$LOG_DIR"
