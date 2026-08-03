#!/usr/bin/env sh
# Deterministic saved-session verifier, opened by the verify-sessions step. It
# reads session file paths on stdin, opens those files itself, and writes only
# DERIVED data on stdout. It contacts nothing and it never emits transcript text.
#
# Why the script opens the files instead of the agent: a raw agent session is
# sensitive untrusted evidence — it can carry credentials, private prompts,
# absolute paths and tool output. Reading one into an agent's context is how that
# content reaches a report. Everything below leaves the machine as a count, a
# class, or a basename.
#
# Input: session file paths on stdin, one per line, absolute or relative to the
# working directory. Blank lines are ignored. A path that does not exist, is not
# a regular file, or is unreadable becomes a finding, never an abort.
#
# Verification rules — the hygiene gate runs first and its verdict does not
# depend on the file's contents:
#
#   1. UNSAFE, contents not read: the file is tracked by the repository. A saved
#      session must never be committed; the fix is to remove it from the index
#      and rotate anything it exposed, not to classify it.
#   2. UNSAFE, contents not read: the file sits inside the repository and the
#      repository does not ignore it. One `git add -A` commits it.
#   3. SAFE: the file sits outside the repository, or inside it and ignored.
#      Contents are read, and secret-shaped strings are counted — never printed,
#      never matched back to a line. A nonzero count is a finding on the file,
#      not a reason to skip it: a raw transcript is expected to carry them, and
#      the finding says the file must not be exported or quoted.
#
# Derivation rules, applied only to a SAFE, parseable session:
#
#   4. A session is one run. Run counts stay single-sourced from the tracker's
#      opening comments, so the two evidence sources cannot disagree about how
#      many times the pipeline ran.
#   5. Only structured agent-authored lines are evidence: the 🤖 marker lines the
#      skills post and a declared `Outcome:` line. Prose elsewhere in a transcript
#      is not evidence — an agent quoting an error it is investigating must not
#      become a cause. The cause vocabulary is the one classify-runs.sh uses, so
#      the two merge into a single ranking.
#   6. The pull request a session belongs to is the request number it names most
#      often across `PR: #<n>`, a `/pull/<n>` URL, and the legacy `PR_NUMBER=<n>`
#      line, ties broken toward the lowest. No confident match leaves it null and
#      the session is reported as unmatched rather than forced onto a request.
#   7. A session that opens a run and records no completion marker is a run that
#      did not finish. This is the one cause visible here and not in the tracker.
#   8. Identity is the basename. An absolute path names a machine and a user, so
#      it is not reproduced in the output.
#
# Usage:  find .ai/session-exports -type f | sh references/verify-sessions.sh \
#           [--repo-root .] [--max-bytes 20000000]
# Exit:   0 verified (including when every session was rejected) · 2 unusable
#         input · 3 jq missing

set -u

REPO_ROOT=.
MAX_BYTES=20000000
while [ $# -gt 0 ]; do
  case "$1" in
    --repo-root)
      [ $# -ge 2 ] || { echo "verify-sessions: --repo-root needs a value" >&2; exit 2; }
      REPO_ROOT="$2"; shift 2 ;;
    --repo-root=*) REPO_ROOT="${1#*=}"; shift ;;
    --max-bytes)
      [ $# -ge 2 ] || { echo "verify-sessions: --max-bytes needs a value" >&2; exit 2; }
      MAX_BYTES="$2"; shift 2 ;;
    --max-bytes=*) MAX_BYTES="${1#*=}"; shift ;;
    -h|--help) sed -n '2,/^$/p' "$0"; exit 0 ;;
    *) echo "verify-sessions: unknown argument '$1'" >&2; exit 2 ;;
  esac
done
case "$MAX_BYTES" in
  ''|*[!0-9]*) echo "verify-sessions: --max-bytes must be a whole number of bytes" >&2; exit 2 ;;
esac
[ -d "$REPO_ROOT" ] || { echo "verify-sessions: --repo-root '$REPO_ROOT' is not a directory" >&2; exit 2; }

command -v jq >/dev/null 2>&1 || {
  echo "verify-sessions: jq is required (the tracker descriptor already depends on it)" >&2
  exit 3
}

# Absolute repository root, so containment is decided on resolved paths rather
# than on how the caller happened to spell them.
repo_abs=$(cd "$REPO_ROOT" 2>/dev/null && pwd) || {
  echo "verify-sessions: cannot resolve --repo-root '$REPO_ROOT'" >&2; exit 2; }

abspath() {
  # No realpath dependency: resolve the directory, keep the basename.
  _d=$(dirname -- "$1")
  _b=$(basename -- "$1")
  _d=$(cd "$_d" 2>/dev/null && pwd) || return 1
  printf '%s/%s' "${_d%/}" "$_b"
}

file_bytes() {
  # wc -c is POSIX; stat is not portable across GNU and BSD.
  wc -c < "$1" 2>/dev/null | tr -d ' '
}

emit_rejected() {
  # $1 basename · $2 findings JSON array · $3 hygiene verdict
  jq -n --arg name "$1" --argjson findings "$2" --arg verdict "$3" '
    { session: $name, usable: false, hygiene: { verdict: $verdict, secretShaped: null },
      findings: $findings, skills: [], pr: null, outcome: null, causes: [],
      startedAt: null, endedAt: null, hours: null, records: null }'
}

DERIVE='
def astext: if type == "string" then . else "" end;

# Every string leaf of the record array, joined. Stays inside jq: nothing below
# emits any of it.
def alltext: [ .. | strings ] | join("\n");

# The marker lines the skills post, and a declared outcome line. These are the
# only evidence a session contributes.
def markers: [ match("(^|\\n)[ \t#*]*🤖[^\\n]*"; "g") | .string ];
def outcome_lines:
  [ match("(^|\\n)[ \t]*(?:[-*][ \t]*)?\\**Outcome:\\**[ \t]*(recovered|blocked|clean)\\b[^\\n]*"; "g")
    | .string | sub("^\\n"; "") | sub("^[ \t]+"; "") | sub("[ \t]+$"; "") ];
def evidence_text: ((markers) + (outcome_lines)) | join("\n");

def declared_outcome:
  (outcome_lines | join("\n")) as $o
  | if ($o | test("Outcome:\\**[ \t]*blocked"; "i")) then "blocked"
    elif ($o | test("Outcome:\\**[ \t]*recovered"; "i")) then "recovered"
    elif ($o | test("Outcome:\\**[ \t]*clean"; "i")) then "clean"
    else null end;

def opened: (markers | join("\n")) | test("started by|starting[^\\n]*run|taking over|resum(ing|ed)[^\\n]*run"; "i");
def completed: (markers | join("\n")) | test("completed\\b|lock released|final status|summary posted"; "i");

def negated($phrase): test("\\b(no|not|never|without)\\b[^.\\n]{0,24}" + $phrase; "i");

# The cause vocabulary of classify-runs.sh, so both sources rank into one table.
def causes($unfinished):
  . as $t
  | [ (if ($t | test("\\bmerge conflicts?\\b|CONFLICTING|conflicts resolved|\\brebased?\\b"; "i"))
          and (($t | negated("merge conflict")) | not)
       then "base moved under the change" else empty end),
      (if ([ $t | split("\n")[]
             | select(test("self-approval|approve your own|self-review"; "i"))
             | select(test("block|reject|refus|forbid|not allow|not permitted|not possible|unavailable|cannot|can not|impossible"; "i")) ] | length) > 0
       then "review could not be recorded" else empty end),
      (if $unfinished or ($t | test("(?<!un)\\binterrupted\\b|\\bstalled\\b|timed out|\\bcrashed\\b|context (limit|exhaust)|rate limit"; "i"))
       then "run did not finish" else empty end),
      (if ($t | test("completed: CHANGES REQUESTED|verdict:[^\\n]*request changes|changes requested"; "i"))
       then "change requested by a reviewer" else empty end) ]
  | unique;

def pr_number:
  [ (match("PR:[ \t]*#([0-9]+)"; "g") | .captures[0].string),
    (match("/pull/([0-9]+)"; "g") | .captures[0].string),
    (match("PR_NUMBER=([0-9]+)"; "g") | .captures[0].string) ]
  | map(tonumber)
  | if length == 0 then null
    else group_by(.) | sort_by([- length, .[0]]) | .[0][0] end;

def stamp:
  if type != "string" or . == "" then null
  else ( sub("\\.[0-9]+"; "")
         | sub("[+-][0-9]{2}:[0-9]{2}$"; "Z")
         | sub("[+-][0-9]{4}$"; "Z")
         | if test("Z$") then . else . + "Z" end
         | try fromdateiso8601 catch null )
  end;

def round1: if . == null then null else (. * 10 | round) / 10 end;

# Secret-shaped strings are counted and never reproduced. The count says "do not
# export or quote this file"; it is not a classification signal.
def secret_shaped:
  [ match("gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?i:authorization)[\"'\'':= ]+(?i:bearer) [A-Za-z0-9._-]{20,}"; "g") ]
  | length;

# Saved exports take three shapes; anything else is reported, not guessed at.
def records:
  if (length == 1 and (.[0] | type) == "array") then .[0]
  elif (length == 1 and (.[0] | type) == "object") then
    ( .[0] | (.records // .messages // .transcript // .events // .items) ) as $r
    | (if ($r | type) == "array" then $r else [.[0]] end)
  else . end;

(records) as $recs
| ($recs | alltext) as $text
| ($text | evidence_text) as $ev
| ($text | secret_shaped) as $secrets
| ($ev | opened) as $opened
| ($ev | completed) as $completed
| ($opened and ($completed | not)) as $unfinished
| [ $recs[]? | select(type == "object") | (.timestamp // .ts // .createdAt // .time) | stamp | select(. != null) ] as $times
| ($times | min) as $start
| ($times | max) as $end
| {
    session: $name,
    usable: (($recs | length) > 0 and (($text | test("om-[a-z0-9-]+")) or $opened)),
    hygiene: { verdict: "safe", secretShaped: $secrets },
    findings: (
      [ (if ($secrets > 0) then "carries \($secrets) secret-shaped string\(if $secrets == 1 then "" else "s" end) — never export, quote, or copy this file" else empty end),
        (if (($recs | length) == 0) then "parsed to no records" else empty end),
        (if ((($text | test("om-[a-z0-9-]+")) or $opened) | not) then "names no skill and opens no run, so it is not a saved run of this pipeline" else empty end),
        (if ($opened and ($completed | not)) then "opens a run and records no completion marker" else empty end),
        (if (($ev | length) == 0) then "carries no marker or Outcome line, so it states no cause" else empty end) ]),
    skills: ([ $text | match("om-[a-z0-9-]+"; "g") | .string ] | unique),
    pr: ($text | pr_number),
    outcome: ($ev | declared_outcome),
    causes: ($ev | causes($unfinished)),
    startedAt: (if $start == null then null else ($start | todateiso8601) end),
    endedAt: (if $end == null then null else ($end | todateiso8601) end),
    hours: (if $start != null and $end != null and $end > $start then (($end - $start) / 3600 | round1) else null end),
    records: ($recs | length)
  }
'

work=$(mktemp) || { echo "verify-sessions: cannot create a temporary file" >&2; exit 2; }
one=$(mktemp) || { rm -f "$work"; echo "verify-sessions: cannot create a temporary file" >&2; exit 2; }
trap 'rm -f "$work" "$one"' EXIT INT TERM
seen=0

# Containment checks need a repository. Without one, nothing is "inside" it.
in_git=no
git -C "$repo_abs" rev-parse --git-dir >/dev/null 2>&1 && in_git=yes

while IFS= read -r path || [ -n "$path" ]; do
  [ -n "$path" ] || continue
  seen=$((seen + 1))
  base=$(basename -- "$path")

  if [ ! -f "$path" ] || [ ! -r "$path" ]; then
    emit_rejected "$base" '["is not a readable regular file"]' unreadable >> "$work"
    continue
  fi

  abs=$(abspath "$path") || abs="$path"
  inside=no
  case "$abs" in "$repo_abs"/*) inside=yes ;; esac

  # Hygiene first, and on its own terms: a session the repository tracks, or one
  # sitting inside the repository un-ignored, is never opened.
  if [ "$inside" = yes ] && [ "$in_git" = yes ]; then
    if git -C "$repo_abs" ls-files --error-unmatch -- "$abs" >/dev/null 2>&1; then
      emit_rejected "$base" \
        '["tracked by the repository — a saved session must never be committed; remove it from the index and rotate anything it exposed"]' \
        unsafe >> "$work"
      continue
    fi
    if ! git -C "$repo_abs" check-ignore -q -- "$abs" 2>/dev/null; then
      emit_rejected "$base" \
        '["inside the repository and not ignored — one `git add -A` commits it; ignore the saved-session paths before running this again"]' \
        unsafe >> "$work"
      continue
    fi
  fi

  bytes=$(file_bytes "$path")
  case "${bytes:-}" in ''|*[!0-9]*) bytes=0 ;; esac
  if [ "$bytes" -gt "$MAX_BYTES" ]; then
    emit_rejected "$base" \
      "$(jq -n --arg b "$bytes" --arg m "$MAX_BYTES" '["is \($b) bytes, past the \($m)-byte limit, and was skipped rather than stalling the run"]')" \
      safe >> "$work"
    continue
  fi

  # Derive into a scratch file first: a jq that fails partway must not leave a
  # half-written object in the result stream.
  if jq -s --arg name "$base" "$DERIVE" "$path" > "$one" 2>/dev/null; then
    cat "$one" >> "$work"
  else
    emit_rejected "$base" \
      '["is not parseable as a JSON array, a JSON object wrapping a record array, or JSON Lines"]' \
      safe >> "$work"
  fi
done

if [ "$seen" -eq 0 ]; then
  echo "verify-sessions: stdin listed no session path" >&2
  exit 2
fi

jq -s '
  { verification: {
      sessions: length,
      usable: (map(select(.usable)) | length),
      unsafe: (map(select(.hygiene.verdict == "unsafe")) | length),
      unreadable: (map(select(.hygiene.verdict == "unreadable")) | length),
      carryingSecretShapedText: (map(select((.hygiene.secretShaped // 0) > 0)) | length),
      matchedToPullRequest: (map(select(.usable and .pr != null)) | length),
      unmatched: (map(select(.usable and .pr == null)) | length),
      declaredOutcomes: (map(select(.usable and .outcome != null)) | length),
      note: (if (map(select(.hygiene.verdict == "unsafe")) | length) > 0
             then "at least one saved session is committed or committable — report that before any classification figure"
             elif (map(select(.usable)) | length) == 0
             then "no listed file verified as a saved run of this pipeline, so session evidence adds nothing to this window"
             else "every safe session was read in place; no transcript content left the machine" end) },
    sessions: . }' "$work"
