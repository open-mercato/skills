# Tracker provider: Forgejo

This file is the Forgejo implementation of the tracker operations contract (see `TEMPLATE.md` for the contract itself). It is a **stand-alone** provider: Forgejo owns the issues, pull requests, reviews, CI (commit statuses and Forgejo Actions), and labels, so no companion descriptor is needed. Every operation runs against the Forgejo REST API (`/api/v1`) through `curl` and `jq`. It works on a self-hosted instance and on public hosts that run Forgejo, such as Codeberg.

At runtime: `om-setup-agent-pipeline` copies this file into the repository at `.ai/trackers/forgejo.md` and sets `"tracker": "forgejo"`. When a skill says "tracker operation **get-pr**", execute the command documented under that operation heading in the repo's copy. The repo's copy is authoritative: teams extend or override any operation by editing it, and every skill picks the change up on its next run.

## Prerequisites

- Forgejo **16 or newer** (**auth-check** warns on older versions), plus `curl` **7.76 or newer** (for `--fail-with-body`), `jq`, and `git`. No Forgejo CLI is needed. None of the existing CLIs (`fj`, `tea`) offers a raw-API passthrough like `gh api` or `glab api`, so the shared helpers below fill that role.
- **Host and repository** come from the checkout's `origin` remote. Accepted forms:
  - `https://host[:port][/subpath]/owner/repo(.git)`;
  - `git@host:owner/repo(.git)`;
  - `ssh://git@host[:port]/owner/repo(.git)`.

  Overrides:
  - `FORGEJO_URL` sets the web base (`https://host[:port][/subpath]`). Use it when `origin` is an SSH remote of a subpath install, or when a skill addresses another instance.
  - `REPO=owner/name` addresses another repository on the same host.

  A plain `http://` base is refused.
- **Token.** Read from `FORGEJO_TOKEN_<HOST>`, where `<HOST>` is the contacted host (port included) upper-cased, with every non-alphanumeric character replaced by `_`. Examples: `codeberg.org` → `FORGEJO_TOKEN_CODEBERG_ORG`; `git.example.com:3000` → `FORGEJO_TOKEN_GIT_EXAMPLE_COM_3000`. `FORGEJO_TOKEN` is the fallback.
  - The token is always chosen for the host actually contacted, after any override, so one instance's token is never sent to another.
  - To reuse a token under another name, alias it in the shell profile: `export FORGEJO_TOKEN_CODEBERG_ORG="$MY_CODEBERG_TOKEN"`.
  - The descriptor never reads other tools' credential files, never prints the token, and passes it to `curl` on stdin, so it never appears in the process list. Never run these snippets under `set -x`.
- **Token scopes:** `write:repository` (pull requests, reviews, merges, commit statuses, branches, Actions), `write:issue` (issues, comments, labels, comment attachments), and `read:user` (**current-user**). Creating repositories needs `write:user`, but no operation here does that.
- **Account.** It needs write access to the repository. Use a dedicated service account:
  - claim signals rely on a distinct automation user;
  - Forgejo refuses to let an author approve their own pull request;
  - access is revoked per account.

  Branch facts (required approvals, required status contexts, `user_can_merge`) are read from `GET /repos/{owner}/{repo}/branches/{branch}`, which needs no admin rights.

## Conventions

- Issues and pull requests share **one number space** (`#12` is either), and comment ids are global (`/issues/comments/{id}`). Comment handles are therefore plain numbers. `/issues/{n}` answers for pull requests too, so **get-issue** reports `isPullRequest`.
- PR conversation comments, PR labels, and PR assignees all go through the issue endpoints, as on GitHub.
- A pull request declares the issue it resolves with `Closes #12` (also `close`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved`) in its title or body. Forgejo closes the issue when the PR merges. Forgejo has no closes-issues API, so **get-pr** derives `closingIssuesReferences` from the same keywords. Code fences and inline code are ignored, and only references to this repository count.
- A **draft** is a pull request whose title starts with one of the instance's work-in-progress prefixes. The defaults are `WIP:` and `[WIP]`, and the setting is `[repository.pull-request] WORK_IN_PROGRESS_PREFIXES`.
  - **create-pr** adds `WIP: `.
  - **mark-pr-ready** strips any leading `WIP:` / `[WIP]` and confirms on read-back that the PR is no longer a draft.
  - **update-pr** keeps the prefix while the PR is a draft.
  - An instance with custom prefixes needs the regex in `FJ_JQ_DEFS` edited in the repo's copy.
- Claim/lock signals on an issue or PR are: assignee = the automation user, the `in-progress` label, and a `🤖`-prefixed timestamped claim comment. All three are readable back through **get-issue** / **get-pr**. The `ci-monitoring` label is **not** a claim signal: it marks finished, reported work whose CI-result follow-up is still owed, and never makes another skill back off.
- **Reviews are native.** `POST /pulls/{n}/reviews` with `event` set to `APPROVED`, `REQUEST_CHANGES`, or `COMMENT`.
  - Only reviews Forgejo marks `official` and neither `stale` nor `dismissed` count toward the verdict, so a commenter cannot forge one.
  - `reviewDecision` is `CHANGES_REQUESTED` when any counted reviewer's latest verdict requests changes, or when the PR carries the `changes-requested` pipeline label.
  - It is `APPROVED` when counted approvals reach the base branch's `required_approvals`. The floor is 1, also when the branch has no rule or cannot be read.
  - It is `REVIEW_REQUIRED` otherwise.
- **Merge state.** Forgejo exposes `mergeable` only as a boolean, so **get-pr** derives the contract fields in this order:
  1. a draft → `DRAFT`;
  2. `mergeable: false` on a non-draft → re-read once after a short wait (Forgejo reports `false` while its conflict check runs), and if still `false` → `CONFLICTING` / `DIRTY`;
  3. a base branch that cannot be read → `MERGEABLE` / `UNKNOWN`;
  4. `user_can_merge: false`, fewer counted approvals than a protected branch's `required_approvals`, or a combined status of `failure`/`error`/`pending` while the branch enforces status checks → `MERGEABLE` / `BLOCKED`;
  5. otherwise → `MERGEABLE` / `CLEAN`.
- **CI truth.**
  - For a PR, CI truth comes from the **commit statuses** on its head SHA (**get-pr-checks**). Forgejo Actions, Woodpecker, and any other CI that reports statuses all show up there.
  - Forgejo names an Actions status `<workflow> / <job> (<event>)`, for example `ci / test (pull_request)`.
  - Run-level operations (**list-runs**, **get-run**, **get-run-failed-logs**, **rerun-failed**, **watch-run**) use the Forgejo Actions API. They query by head SHA, because pull-request runs are recorded against the PR rather than the branch.
  - When the CI is external or Actions is disabled, these operations exit 4 with `RUNS_UNAVAILABLE <status link>` on stdout, never an empty or green answer.
- **A short `get-pr-checks` result is not evidence of green.** A status list can under-report here while its jobs register, because a run Forgejo has already created contributes no status until its jobs start. Before concluding "green" or "nothing pending", cross-check **list-runs** at the PR head SHA and count any run whose `status` is not `completed` as PENDING.
- **Timestamps.** Forgejo returns them with the instance's UTC offset (`2026-10-08T15:39:58+02:00`). Every timestamp is normalized to UTC `Z` form, so callers can compare them as strings.
- A read that fails is an error, never an empty answer. Reads go through `fj_get` / `fj_list`, which fail when the request fails or returns an empty body where an object is expected. Never pipe `fj_http` straight into `jq`.
- Multi-line bodies are always built into a JSON file with `jq --rawfile`, so formatting survives and nothing large touches a command line.
- Validate every externally sourced value before interpolation: numbers with `fj_num`, SHAs with `fj_sha`, the repository with `fj_repo`. Branch names are URL-encoded with `jq @uri`.

## Shared helpers

Source this block once before running any operation below. The label guards and operations call these functions. `fj_http` is the only place that calls `curl`.

```bash
# Web base (https://host[:port][/subpath]) and owner/repo of a remote URL. $1 = remote URL.
# Prints "<web base> <owner/repo>". Refuses http:// and anything it cannot parse.
fj_parse_remote() {
  local url rest host path
  url=${1%.git}
  case "$url" in
    https://*) rest=${url#https://}; host=${rest%%/*}; host=${host##*@}; path=${rest#*/} ;;
    ssh://*) rest=${url#ssh://}; rest=${rest#*@}; host=${rest%%/*}; host=${host%%:*}; path=${rest#*/} ;;
    http://*) echo "Refusing plain-http Forgejo remote: $1" >&2; return 1 ;;
    *@*:*) rest=${url#*@}; host=${rest%%:*}; path=${rest#*:} ;;
    *) echo "Unrecognized Forgejo remote: $1" >&2; return 1 ;;
  esac
  case "$path" in */*/*) host="$host/${path%/*/*}"; path=${path#"${path%/*/*}"/} ;; esac
  case "$path" in
    */*) ;;
    *) echo "Unrecognized Forgejo remote: $1" >&2; return 1 ;;
  esac
  printf 'https://%s %s\n' "$host" "$path"
}

# Web base of the target instance: $FORGEJO_URL, else the origin remote.
fj_web() {
  local url remote
  if [ -n "${FORGEJO_URL:-}" ]; then
    url=${FORGEJO_URL%/}
    case "$url" in
      https://*) ;;
      *) echo "FORGEJO_URL must be an https:// URL: $FORGEJO_URL" >&2; return 1 ;;
    esac
    printf '%s\n' "$url"
    return 0
  fi
  remote=$(git remote get-url origin 2>/dev/null) || { echo "No origin remote; set FORGEJO_URL." >&2; return 1; }
  remote=$(fj_parse_remote "$remote") || return 1
  printf '%s\n' "${remote%% *}"
}

# Target repository owner/name: $REPO, else the origin remote. Validated.
fj_repo() {
  local r remote
  if [ -n "${REPO:-}" ]; then
    r=$REPO
  else
    remote=$(git remote get-url origin 2>/dev/null) || { echo "No origin remote; set REPO." >&2; return 1; }
    remote=$(fj_parse_remote "$remote") || return 1
    r=${remote#* }
  fi
  case "$r" in
    */*/*|/*|*/|*..*|*[!A-Za-z0-9._/-]*) echo "Invalid Forgejo repository: $r" >&2; return 1 ;;
    */*) printf '%s\n' "$r" ;;
    *) echo "Invalid Forgejo repository: $r" >&2; return 1 ;;
  esac
}

# Token for the contacted host: FORGEJO_TOKEN_<HOST>, else FORGEJO_TOKEN. Never echoed elsewhere.
fj_token() {
  local web host var
  web=$(fj_web) || return 1
  host=${web#https://}; host=${host%%/*}
  var="FORGEJO_TOKEN_$(printf '%s' "$host" | tr '[:lower:]' '[:upper:]' | tr -c 'A-Z0-9' '_')"
  if [ -n "${!var:-}" ]; then printf '%s' "${!var}"
  elif [ -n "${FORGEJO_TOKEN:-}" ]; then printf '%s' "$FORGEJO_TOKEN"
  else echo "No Forgejo token for $host: set $var (or FORGEJO_TOKEN)." >&2; return 1
  fi
}

fj_num() {
  case "$1" in ''|*[!0-9]*) echo "Invalid Forgejo number: $1" >&2; return 1 ;; esac
}

fj_sha() {
  case "$1" in ''|*[!0-9a-f]*) echo "Invalid commit SHA: $1" >&2; return 1 ;; esac
  [ "${#1}" -ge 7 ] && [ "${#1}" -le 64 ] || { echo "Invalid commit SHA: $1" >&2; return 1; }
}

# The single HTTP call site. $1 = method, $2 = API path (relative to /api/v1),
# $3 = optional JSON body file, $4 = optional file uploaded as multipart field "attachment".
# Response headers go to $FJ_HDR when it is set. The token reaches curl on stdin.
fj_http() {
  local web token
  web=$(fj_web) || return 1
  token=$(fj_token) || return 1
  set -- "$1" "$2" "${3:-}" "${4:-}" -sS --fail-with-body -X "$1" -H 'Accept: application/json'
  [ -n "${FJ_HDR:-}" ] && set -- "$@" -D "$FJ_HDR"
  [ -n "$3" ] && set -- "$@" -H 'Content-Type: application/json' --data-binary "@$3"
  [ -n "$4" ] && set -- "$@" -F "attachment=@$4"
  printf 'header = "Authorization: token %s"\n' "$token" | curl -K - "${@:5}" "$web/api/v1/$2"
}

# HTTP status of the last response written to $FJ_HDR (0 when unknown).
fj_status() {
  [ -n "${FJ_HDR:-}" ] && [ -f "$FJ_HDR" ] || { echo 0; return; }
  awk '/^HTTP\//{c=$2} END{print c+0}' "$FJ_HDR"
}

# JSON read. $1 = API path; remaining arguments go to jq. Fails when the request fails
# or the body is empty: a 204 or an empty answer is never read as "nothing".
fj_get() {
  local path resp
  path=$1; shift
  resp=$(fj_http GET "$path") || { echo "Forgejo API request failed: $path" >&2; return 1; }
  [ -n "$resp" ] || { echo "Forgejo returned an empty body: $path" >&2; return 1; }
  printf '%s' "$resp" | jq "$@"
}

# JSON write. $1 = method, $2 = API path; the JSON body is read from stdin.
fj_write() {
  local body rc
  body=$(mktemp) || return 1
  cat > "$body"
  fj_http "$1" "$2" "$body"
  rc=$?
  rm -f "$body"
  return "$rc"
}

# Every page of a list endpoint, concatenated into one JSON array. $1 = API path,
# $2 = optional key holding the array in an object envelope (e.g. workflow_runs).
# Follows Link rel="next" and X-HasMore; fails when any page fails or is not a list.
# A successful (2xx) page whose list is JSON null is empty: Forgejo answers an empty
# timeline that way.
fj_list() {
  local sep page t out_hdr
  out_hdr=${FJ_HDR:-}   # the caller's header file gets the failing page's headers
  case "$1" in *\?*) sep='&' ;; *) sep='?' ;; esac
  t=$(mktemp -d) || return 1
  echo '[]' > "$t/all"
  page=1
  while :; do
    : > "$t/h"
    FJ_HDR="$t/h" fj_http GET "$1${sep}limit=50&page=$page" > "$t/p" || {
      [ -z "$out_hdr" ] || cp "$t/h" "$out_hdr"
      echo "Forgejo API request failed: $1" >&2; rm -rf "$t"; return 1
    }
    jq -e --arg k "${2:-}" 'if $k == "" then . else .[$k] end | if . == null then [] else . end | arrays' "$t/p" > "$t/a" 2>/dev/null ||
      { echo "Forgejo returned no list for $1" >&2; rm -rf "$t"; return 1; }
    jq -s '.[0] + .[1]' "$t/all" "$t/a" > "$t/n" && mv "$t/n" "$t/all"
    if grep -qi '^link:.*rel="next"' "$t/h" || grep -qi '^x-hasmore: *true' "$t/h"; then
      [ "$page" -lt 200 ] || break
      page=$((page + 1))
    else
      break
    fi
  done
  cat "$t/all"
  rm -rf "$t"
}

# Run jq over a paginated list without hiding a failed read. $1 = path, $2 = envelope
# key or "", remaining arguments go to jq.
fj_list_jq() {
  local resp
  resp=$(fj_list "$1" "$2") || return 1
  shift 2
  printf '%s' "$resp" | jq "$@"
}

# Post a conversation comment on an issue or PR and print its id. $1 = number, $2 = body file.
fj_comment() {
  local r response
  fj_num "$1" || return 1
  r=$(fj_repo) || return 1
  response=$(jq -n --rawfile b "$2" '{body: $b}' | fj_write POST "repos/$r/issues/$1/comments") || return 1
  printf '%s' "$response" | jq -er '.id' || { echo "Forgejo did not return a comment id for #$1" >&2; return 1; }
}

# Read-modify-write assignment that preserves the existing list. $1 = number,
# $2 = add|remove, $3 = username. Reads the result back.
fj_assign() {
  local r names now
  fj_num "$1" || return 1
  r=$(fj_repo) || return 1
  names=$(fj_get "repos/$r/issues/$1" -c --arg u "$3" --arg op "$2" \
    '[(.assignees // [])[].login] | if $op == "add" then (if index([$u]) then . else . + [$u] end) else map(select(. != $u)) end') || return 1
  jq -n --argjson a "$names" '{assignees: $a}' | fj_write PATCH "repos/$r/issues/$1" >/dev/null || return 1
  now=$(fj_get "repos/$r/issues/$1" -c '[(.assignees // [])[].login]') || return 1
  if printf '%s' "$now" | jq -e --arg u "$3" 'index([$u])' >/dev/null; then
    [ "$2" = add ] || { echo "Forgejo still lists $3 as an assignee of #$1" >&2; return 1; }
  else
    [ "$2" = remove ] || { echo "Forgejo did not add $3 as an assignee of #$1" >&2; return 1; }
  fi
}

# jq definitions shared by the issue, PR, check, and CI-run mappings below.
FJ_JQ_DEFS='
def fj_utc:
  if . == null or . == "" then null
  elif test("Z$") then sub("\\.[0-9]+Z$"; "Z")
  else capture("^(?<d>\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d)(\\.\\d+)?(?<s>[+-])(?<h>\\d\\d):(?<m>\\d\\d)$") as $c
    | (($c.d + "Z") | fromdateiso8601) - ((if $c.s == "+" then 1 else -1 end) * (($c.h | tonumber) * 3600 + ($c.m | tonumber) * 60))
    | todate end;
def fj_draft_re: "^\\s*((\\[wip\\]|wip:)\\s*)+";
def fj_pr_state: if .merged == true then "MERGED" elif .state == "open" then "OPEN" else "CLOSED" end;
def fj_review_state:
  if .dismissed == true then "DISMISSED"
  elif .state == "APPROVED" then "APPROVED"
  elif .state == "REQUEST_CHANGES" then "CHANGES_REQUESTED"
  elif .state == "COMMENT" then "COMMENTED"
  else null end;
def fj_counted: .official == true and .stale != true and .dismissed != true and (.state == "APPROVED" or .state == "REQUEST_CHANGES");
def fj_check($web):
  (.status // "") as $s
  | (if $s == "success" then ["SUCCESS", "pass"]
     elif $s == "failure" then ["FAILURE", "fail"]
     elif $s == "error" then ["ERROR", "fail"]
     elif $s == "warning" then ["NEUTRAL", "pass"]
     elif $s == "skipped" then ["SKIPPED", "skipping"]
     else ["PENDING", "pending"] end) as $m
  | {name: .context, state: $m[0], bucket: $m[1],
     link: ((.target_url // "") | if startswith("/") then $web + . else . end),
     workflow: (.context // "" | split(" / ")[0])};
def fj_run_status:
  (.status // "") as $s
  | if $s == "success" then {status: "completed", conclusion: "success"}
    elif $s == "failure" then {status: "completed", conclusion: "failure"}
    elif $s == "cancelled" then {status: "completed", conclusion: "cancelled"}
    elif $s == "skipped" then {status: "completed", conclusion: "skipped"}
    elif $s == "running" then {status: "in_progress", conclusion: ""}
    else {status: "queued", conclusion: ""} end;
def fj_run: {databaseId: .id, workflowName: .workflow_id, name: (.title // .workflow_id), event,
  headSha: .commit_sha, url: .html_url, createdAt: (.created | fj_utc)} + fj_run_status;
def fj_closes($web; $repo):
  ((.title // "") + "\n" + (.body // ""))
  | gsub("```[\\s\\S]*?```"; "") | gsub("`[^`\\n]*`"; "")
  | [scan("(?i)(?<![A-Za-z0-9_])(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s*:?\\s+(?:([A-Za-z0-9._-]+/[A-Za-z0-9._-]+))?#([0-9]+)")
     | select(.[0] == null or (.[0] | ascii_downcase) == ($repo | ascii_downcase))
     | .[1] | tonumber] | unique
  | map({number: ., url: "\($web)/\($repo)/issues/\(.)"});
'

# Pull request → the GitHub-shaped PR object skills consume (field set: see get-pr).
# $1 = PR number. FJ_PR_LIGHT=1 skips commits, files, and comments (list-prs uses it).
# FJ_MERGEABLE_RECHECK_SECONDS (default 5) is the wait before re-reading mergeable=false.
fj_pr_json() {
  local r web t light base sha f rc
  fj_num "$1" || return 1
  r=$(fj_repo) || return 1
  web=$(fj_web) || return 1
  t=$(mktemp -d) || return 1
  fj_get "repos/$r/pulls/$1" '.' > "$t/pr" || { rm -rf "$t"; return 1; }
  if jq -e '(.draft != true) and (.mergeable == false) and (.state == "open")' "$t/pr" >/dev/null; then
    sleep "${FJ_MERGEABLE_RECHECK_SECONDS:-5}"
    fj_get "repos/$r/pulls/$1" '.' > "$t/pr" || { rm -rf "$t"; return 1; }
  fi
  fj_list "repos/$r/pulls/$1/reviews" > "$t/reviews" || { rm -rf "$t"; return 1; }
  base=$(jq -r '.base.ref | @uri' "$t/pr")
  sha=$(jq -r '.head.sha' "$t/pr")
  # Optional: an unreadable branch or status degrades to UNKNOWN / floor-1 approvals.
  fj_get "repos/$r/branches/$base" '.' > "$t/branch" 2>/dev/null || echo null > "$t/branch"
  fj_get "repos/$r/commits/$sha/status" '.' > "$t/status" 2>/dev/null || echo null > "$t/status"
  light=false
  if [ "${FJ_PR_LIGHT:-0}" = 1 ]; then
    light=true
    for f in commits files comments; do echo '[]' > "$t/$f"; done
  else
    fj_list "repos/$r/pulls/$1/commits" > "$t/commits" || { rm -rf "$t"; return 1; }
    fj_list "repos/$r/pulls/$1/files" > "$t/files" || { rm -rf "$t"; return 1; }
    fj_list "repos/$r/issues/$1/comments" > "$t/comments" || { rm -rf "$t"; return 1; }
  fi
  jq -n --argjson light "$light" --arg web "$web" --arg repo "$r" \
    --slurpfile pr "$t/pr" --slurpfile reviews "$t/reviews" --slurpfile branch "$t/branch" \
    --slurpfile status "$t/status" --slurpfile commits "$t/commits" --slurpfile files "$t/files" \
    --slurpfile comments "$t/comments" "$FJ_JQ_DEFS"'
    $pr[0] as $p | $branch[0] as $b | $status[0] as $st
    | [$reviews[0][] | select(fj_review_state != null)
        | {id, author: {login: .user.login}, state: fj_review_state, body: (.body // ""),
           submittedAt: (.submitted_at | fj_utc), counted: fj_counted}] as $all
    | ($all | group_by(.author.login) | map(sort_by(.submittedAt // "") | last)) as $latest
    | ([$all[] | select(.counted)] | group_by(.author.login) | map(sort_by(.submittedAt // "") | last)) as $verdicts
    | ([1, ($b.required_approvals // 0)] | max) as $required
    | {
        number: $p.number, title: $p.title, url: $p.html_url, body: ($p.body // ""),
        state: ($p | fj_pr_state), author: {login: $p.user.login},
        isDraft: ($p.draft // false),
        baseRefName: $p.base.ref, baseRefOid: $p.base.sha,
        headRefName: $p.head.ref, headRefOid: $p.head.sha,
        headRepository: {nameWithOwner: ($p.head.repo.full_name // null)},
        headRepositoryOwner: {login: ($p.head.repo.owner.login // null)},
        isCrossRepository: (($p.head.repo.full_name // "") != ($p.base.repo.full_name // "")),
        maintainerCanModify: ($p.allow_maintainer_edit // false),
        mergeable: (if $p.draft == true then (if $p.mergeable then "MERGEABLE" else "UNKNOWN" end)
                    elif $p.mergeable == false then "CONFLICTING" else "MERGEABLE" end),
        mergeStateStatus: (
          if $p.draft == true then "DRAFT"
          elif $p.mergeable == false then "DIRTY"
          elif $b == null then "UNKNOWN"
          elif $b.user_can_merge == false then "BLOCKED"
          elif ($b.protected == true) and ([$verdicts[] | select(.state == "APPROVED")] | length) < ($b.required_approvals // 0) then "BLOCKED"
          elif ($b.enable_status_check == true) and (($st.state // "") | IN("failure", "error", "pending")) then "BLOCKED"
          else "CLEAN" end),
        reviewDecision: (
          if any($verdicts[]; .state == "CHANGES_REQUESTED") or any(($p.labels // [])[]; .name == "changes-requested") then "CHANGES_REQUESTED"
          elif ([$verdicts[] | select(.state == "APPROVED")] | length) >= $required then "APPROVED"
          else "REVIEW_REQUIRED" end),
        labels: [($p.labels // [])[] | {name}],
        assignees: [($p.assignees // [])[] | {login}],
        reviews: ($all | map(del(.counted)) | sort_by(.submittedAt // "")),
        latestReviews: ($latest | map(del(.counted))),
        commits: [$commits[0][] | {oid: .sha, messageHeadline: (.commit.message // "" | split("\n")[0]),
                   authoredDate: (.commit.author.date | fj_utc)}],
        files: [$files[0][] | {path: .filename, additions, deletions}],
        comments: [$comments[0][] | {id, author: {login: .user.login}, body, createdAt: (.created_at | fj_utc), url: .html_url}],
        closingIssuesReferences: ($p | fj_closes($web; $repo)),
        createdAt: ($p.created_at | fj_utc), updatedAt: ($p.updated_at | fj_utc),
        mergedAt: ($p.merged_at | fj_utc), closedAt: ($p.closed_at | fj_utc),
        mergeCommit: (if $p.merge_commit_sha then {oid: $p.merge_commit_sha} else null end),
        additions: ($p.additions // null), changedFiles: ($p.changed_files // null)
      }'
  rc=$?
  rm -rf "$t"
  return "$rc"
}
```

## Label guards

Every label mutation goes through an existence guard so a missing label degrades to a logged skip instead of a failure, and `labels.enabled: false` in the config skips label operations entirely. Forgejo attaches labels by **id**, so the guards resolve the name first. Labels defined on the owning organization count, the way GitLab's group labels do.

```bash
# Every label available to the repository: its own plus, for an organization owner, the org's.
fj_labels() {
  local r owner own org
  r=$(fj_repo) || return 1
  owner=${r%%/*}
  own=$(fj_list "repos/$r/labels") || return 1
  if fj_http GET "orgs/$owner" >/dev/null 2>&1; then
    org=$(fj_list "orgs/$owner/labels") || return 1
  else
    org='[]'
  fi
  jq -n --argjson a "$own" --argjson b "$org" '$a + $b'
}

# Label id by name. 0 = found (id on stdout), 1 = missing, 2 = the list could not be read.
fj_label_id() {
  local labels id
  labels=$(fj_labels) || { echo "Could not read Forgejo labels" >&2; return 2; }
  id=$(printf '%s' "$labels" | jq -r --arg l "$1" 'first(.[] | select(.name == $l) | .id) // empty')
  [ -n "$id" ] || return 1
  printf '%s\n' "$id"
}

# 0 = exists, 1 = missing, 2 = the label list could not be read (never treated as missing).
label_exists() {
  fj_label_id "$1" >/dev/null
}

# PR labels. $1 = label, $2 = PR number.
apply_label() {
  local id rc r
  if [ "$LABELS_ENABLED" != "true" ]; then return 0; fi
  fj_num "$2" || return 1
  id=$(fj_label_id "$1"); rc=$?
  case $rc in
    0) r=$(fj_repo) || return 1
       jq -n --argjson id "$id" '{labels: [$id]}' | fj_write POST "repos/$r/issues/$2/labels" >/dev/null ;;
    1) echo "Skipping label '$1' (not defined in this repository or its organization). Create it with the create-label operation." ;;
    *) return 1 ;;
  esac
}

# Issue labels: issues and PRs share the /issues/ endpoints. $1 = label, $2 = issue number.
apply_issue_label() { apply_label "$1" "$2"; }

# Removal. A label that is not defined or not applied (404/422) is a no-op; any other
# failure (403, 5xx, network) is an error, so a pipeline-label transition stops.
remove_label() {
  local id rc r hdr status
  if [ "$LABELS_ENABLED" != "true" ]; then return 0; fi
  fj_num "$2" || return 1
  id=$(fj_label_id "$1"); rc=$?
  case $rc in 0) ;; 1) return 0 ;; *) return 1 ;; esac
  r=$(fj_repo) || return 1
  hdr=$(mktemp) || return 1
  if FJ_HDR="$hdr" fj_http DELETE "repos/$r/issues/$2/labels/$id" >/dev/null 2>&1; then
    rm -f "$hdr"; return 0
  fi
  status=$(FJ_HDR="$hdr" fj_status)
  rm -f "$hdr"
  case "$status" in
    404|422) return 0 ;;
    *) echo "Forgejo refused to remove label '$1' from #$2 (HTTP $status)" >&2; return 1 ;;
  esac
}
remove_issue_label() { remove_label "$1" "$2"; }

# Pipeline labels are mutually exclusive: setting one removes the others first, and a
# failed removal stops the transition. Argument order, same as every descriptor:
# $1 = PR number, $2 = label.
set_pipeline_label() {
  if [ "$LABELS_ENABLED" != "true" ]; then return 0; fi
  for label in $PIPELINE_LABELS; do
    [ "$label" = "$2" ] && continue
    remove_label "$label" "$1" || return 1
  done
  apply_label "$2" "$1"
}
```

Cross-repository targets need no extra flags: every guard resolves the repository through `fj_repo`, so the existence check and the mutation always address the same repository.

Read the labels back (**get-pr** / **get-issue**, field `labels`) whenever the label state gates a later decision. A skipped mutation is a normal outcome.

## Operations

### Identity and repository

#### auth-check
Verify the tools, the instance version, and the credentials. Exits non-zero on any gap.
```bash
forgejo_tracker_auth_check() {
  local version major
  for tool in curl jq git; do
    command -v "$tool" >/dev/null || { echo "$tool is required by the Forgejo tracker descriptor" >&2; return 1; }
  done
  curl --help all 2>/dev/null | grep -Fq -- '--fail-with-body' || {
    echo "Installed curl lacks --fail-with-body; upgrade curl to 7.76 or newer." >&2
    return 1
  }
  fj_web >/dev/null && fj_repo >/dev/null || return 1
  fj_token >/dev/null || return 1
  version=$(fj_get version -r '.version') || {
    echo "Cannot reach the Forgejo API; check the origin remote, FORGEJO_URL, and the network." >&2
    return 1
  }
  major=${version%%.*}
  case "$major" in ''|*[!0-9]*) major=0 ;; esac
  [ "$major" -ge 16 ] || echo "WARNING: Forgejo $version predates 16; this descriptor is verified on Forgejo 16."
  fj_get user -e '.login' >/dev/null || {
    echo "The Forgejo token was rejected; check its value and scopes (read:user, write:issue, write:repository)." >&2
    return 1
  }
}
forgejo_tracker_auth_check
```

#### current-user
→ the automation user's login.
```bash
CURRENT_USER=$(fj_get user -r '.login')
[ -n "$CURRENT_USER" ] && [ "$CURRENT_USER" != null ] || { echo "Could not resolve the Forgejo automation user" >&2; exit 1; }
```

#### repo-info
→ `owner/name`, default branch, web URL, and visibility.
```bash
fj_get "repos/$(fj_repo)" '{nameWithOwner: .full_name, defaultBranch: .default_branch, url: .html_url, visibility: (if .private then "private" else "public" end)}'
REPO=$(fj_get "repos/$(fj_repo)" -r '.full_name')
```

#### default-branch
→ the repository's default branch (used when the config's `baseBranch` is `"auto"`).
```bash
BASE_BRANCH=$(fj_get "repos/$(fj_repo)" 2>/dev/null -r '.default_branch // empty')
[ -z "$BASE_BRANCH" ] && BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
[ -z "$BASE_BRANCH" ] && BASE_BRANCH="main"
```

### Issues

#### get-issue
`{issueId}`, field list → issue data in the same shape as `github.md` (`state` is `OPEN`/`CLOSED`). `isPullRequest` is true when the number belongs to a pull request. Callers that resolve `#N` references, such as `om-close-fixed-issues`, drop those.
```bash
fj_issue_json() {
  local r t rc
  fj_num "$1" || return 1
  r=$(fj_repo) || return 1
  t=$(mktemp -d) || return 1
  fj_get "repos/$r/issues/$1" '.' > "$t/issue" || { rm -rf "$t"; return 1; }
  fj_list "repos/$r/issues/$1/comments" > "$t/comments" || { rm -rf "$t"; return 1; }
  jq -n --slurpfile i "$t/issue" --slurpfile c "$t/comments" "$FJ_JQ_DEFS"'
    $i[0] as $x | {
      number: $x.number, title: $x.title, body: ($x.body // ""),
      state: (if $x.state == "open" then "OPEN" else "CLOSED" end),
      author: {login: $x.user.login}, url: $x.html_url,
      labels: [($x.labels // [])[] | {name}], assignees: [($x.assignees // [])[] | {login}],
      isPullRequest: ($x.pull_request != null),
      createdAt: ($x.created_at | fj_utc), closedAt: ($x.closed_at | fj_utc),
      comments: [$c[0][] | {id, author: {login: .user.login}, body, createdAt: (.created_at | fj_utc), url: .html_url}]
    }'
  rc=$?; rm -rf "$t"; return "$rc"
}
fj_issue_json {issueId}
```

#### search-issues
Query and state (`open`, `closed`, or `all`) → matching issues (pull requests excluded). Searches title and body.
```bash
Q=$(printf '%s' "<query>" | jq -sRr @uri)
STATE=open   # open | closed | all
fj_get "repos/$(fj_repo)/issues?type=issues&state=${STATE}&q=${Q}&limit=50" \
  '[.[] | {number, title, url: .html_url, state: (if .state == "open" then "OPEN" else "CLOSED" end)}]'
```

#### create-issue
Title, body file, assignee, labels → created issue URL. The issue is created first. Labels are applied **after** creation through the guard, because the create endpoint takes label ids and would bypass the existence check.
```bash
ISSUE_ASSIGNEE="<username>"
ISSUE=$(jq -n --arg t "<title>" --rawfile b <body-file> '{title: $t, body: $b}' \
  | fj_write POST "repos/$(fj_repo)/issues")
ISSUE_ID=$(printf '%s' "$ISSUE" | jq -er '.number') || exit 1
ISSUE_URL=$(printf '%s' "$ISSUE" | jq -er '.html_url') || exit 1
[ -z "$ISSUE_ASSIGNEE" ] || fj_assign "$ISSUE_ID" add "$ISSUE_ASSIGNEE" ||
  echo "Created issue $ISSUE_ID, but could not assign $ISSUE_ASSIGNEE; report the assignment failure to the user." >&2
for label in <labels>; do apply_issue_label "$label" "$ISSUE_ID"; done
```

#### close-issue
`{issueId}`, reason, closing comment. Forgejo has no close reason; state it in the comment (`completed`, `not planned`, `duplicate of #N`).
```bash
fj_num {issueId} || exit 1
fj_comment {issueId} <comment-file> >/dev/null || exit 1
jq -n '{state: "closed"}' | fj_write PATCH "repos/$(fj_repo)/issues/{issueId}" | jq -e '.state == "closed"' >/dev/null
```

#### comment-issue
`{issueId}`, body file → the new comment's id.
```bash
fj_comment {issueId} <body-file>
```

#### update-issue
`{issueId}`, new title and/or body. Edits only the issue's own fields; pass only what changed.
```bash
fj_num {issueId} || exit 1
jq -n --arg t "<title>" '{title: $t}' | fj_write PATCH "repos/$(fj_repo)/issues/{issueId}" >/dev/null
jq -n --rawfile b <body-file> '{body: $b}' | fj_write PATCH "repos/$(fj_repo)/issues/{issueId}" >/dev/null
```

#### assign-issue / unassign-issue
`{issueId}`, username. Forgejo replaces the whole assignee list, so read it, add or remove the one user, write it back, and read it back.
```bash
fj_assign {issueId} add <username>
fj_assign {issueId} remove <username>
```

#### label-issue / unlabel-issue
Always through the guards: `apply_issue_label "<label>" {issueId}` / `remove_issue_label "<label>" {issueId}`.

#### get-issue-comment
Comment id → body, author, URL. Forgejo answers `204` with an empty body when the id belongs to an inline review comment, which shares the `#issuecomment-<id>` link shape with conversation comments. That is an error naming **get-review-comment**, never an empty comment.
```bash
fj_get_comment() {
  local hdr resp status
  fj_num "$1" || return 1
  hdr=$(mktemp) || return 1
  resp=$(FJ_HDR="$hdr" fj_http GET "repos/$(fj_repo)/issues/comments/$1") || {
    rm -f "$hdr"; echo "Forgejo API request failed: comment $1" >&2; return 1
  }
  status=$(FJ_HDR="$hdr" fj_status)
  rm -f "$hdr"
  if [ "$status" = 204 ] || [ -z "$resp" ]; then
    echo "Comment $1 is an inline review comment, not a conversation comment: use get-review-comment with the PR number." >&2
    return 1
  fi
  printf '%s' "$resp" | jq '{body, user: .user.login, url: .html_url}'
}
fj_get_comment {commentId}
```

#### list-issue-comments
`{issueId or prNumber}` → conversation comments, oldest first. PR conversation comments are issue comments on Forgejo, and inline review comments come from **list-review-comments**.
```bash
fj_list_comments() {
  fj_num "$1" || return 1
  fj_list_jq "repos/$(fj_repo)/issues/$1/comments" "" "$FJ_JQ_DEFS"'[.[] | {id, user: .user.login, body, createdAt: (.created_at | fj_utc)}]'
}
fj_list_comments {number}
```

#### update-comment
`{commentId}`, new body file → the comment rewritten in place (issue and PR conversation comments alike). This is how marker-idempotent comments are updated on re-runs: find the `🤖 …` marker via **list-issue-comments**, then update that id.
```bash
fj_num {commentId} || exit 1
jq -n --rawfile b <body-file> '{body: $b}' \
  | fj_write PATCH "repos/$(fj_repo)/issues/comments/{commentId}" >/dev/null
```

### Pull requests

#### get-pr
`{prNumber}` → PR data in the field set `github.md` documents, serialized the same way: `state` `OPEN`/`CLOSED`/`MERGED`, review states `APPROVED`/`CHANGES_REQUESTED`/`COMMENTED`/`DISMISSED`, UTC ISO-8601 timestamps. Select the fields the calling skill names from the object.
```bash
PR_JSON=$(fj_pr_json {prNumber}) || exit 1
printf '%s' "$PR_JSON" | jq '{number, title, url, state, isDraft, labels, reviewDecision}'   # select the requested fields
```
Mapping notes:
- `mergeable` / `mergeStateStatus` follow the derivation in Conventions.
- `reviews` drop Forgejo's review-request and pending entries.
- `additions` and `changedFiles` come from the PR object, and `files` carries per-file `additions`/`deletions`.
- `commits` carries `oid`, `messageHeadline`, and `authoredDate`.
- `closingIssuesReferences` is parsed from the title and body (Conventions).

#### list-prs
State (`open`, `merged`, `closed`, `all`), limit, optional updated-after ISO date, optional search text → PRs in the **get-pr** shape, without the heavy fields: `commits`, `files`, and `comments` are empty; call **get-pr** for them. `closed` means closed **without** merging, matching GitHub's `closed:… is:unmerged`; `merged` means merged. The list endpoint has no date filter, so pages are read newest-updated first until the date bound is passed.
```bash
# $1 = state, $2 = limit, $3 = optional updated-after ISO date, $4 = optional search text.
fj_list_prs() {
  local r api_state filter page batch nums out n since
  r=$(fj_repo) || return 1
  case "$1" in
    open) api_state=open; filter='true' ;;
    merged) api_state=closed; filter='.merged == true' ;;
    closed) api_state=closed; filter='.merged != true' ;;
    all) api_state=all; filter='true' ;;
    *) echo "Unknown PR state: $1" >&2; return 1 ;;
  esac
  since=$(jq -rn --arg d "${3:-}" "$FJ_JQ_DEFS"'$d | fj_utc // ""')
  nums=""
  page=1
  while :; do
    if [ -n "${4:-}" ]; then
      batch=$(fj_get "repos/$r/issues?type=pulls&state=$api_state&q=$(printf '%s' "$4" | jq -sRr @uri)&limit=50&page=$page" -c \
        '[.[] | {number, updated_at, merged: (.pull_request.merged // false)}]') || return 1
    else
      batch=$(fj_get "repos/$r/pulls?state=$api_state&sort=recentupdate&limit=50&page=$page" -c \
        '[.[] | {number, updated_at, merged: (.merged // false)}]') || return 1
    fi
    nums="$nums $(printf '%s' "$batch" | jq -r --arg s "$since" "$FJ_JQ_DEFS"'.[] | select('"$filter"') | select($s == "" or ((.updated_at | fj_utc) >= $s)) | .number')"
    [ "$(printf '%s' "$batch" | jq 'length')" -eq 50 ] || break
    [ -z "$since" ] || [ "$(printf '%s' "$batch" | jq -r "$FJ_JQ_DEFS"'last.updated_at | fj_utc')" \> "$since" ] || break
    [ "$(printf '%s\n' $nums | grep -c .)" -lt "${2:-100}" ] || break
    page=$((page + 1))
  done
  out=$(for n in $(printf '%s\n' $nums | head -n "${2:-100}"); do FJ_PR_LIGHT=1 fj_pr_json "$n" || exit 1; done) || return 1
  printf '%s' "$out" | jq -s '.'
}
fj_list_prs open 100
PRS=$(fj_list_prs merged {limit} "${SINCE_DATE}") || exit 1
printf '%s' "$PRS" | jq --arg d "${SINCE_DATE}" '[.[] | select(.mergedAt >= $d)]'
PRS=$(fj_list_prs closed {limit} "${SINCE_DATE}") || exit 1
printf '%s' "$PRS" | jq --arg d "${SINCE_DATE}" '[.[] | select(.closedAt >= $d)]'
```
Cost: up to four API calls per PR (the PR, its reviews, the base branch, the combined status). Keep `limit` as small as the caller needs.

#### search-prs
Free-text query and state (`open`, `merged`, `closed`, `all`) → matching PRs.
- An issue reference (`#123`) reads that issue's **timeline** and keeps the pull requests that reference or close it, the counterpart of GitLab's related-merge-requests list. The instance's search indexer may not match `#123` inside PR bodies, and duplicate-PR detection depends on this lookup.
- Any other query (a plan path, a slug) searches PR titles and bodies.
```bash
fj_search_prs() {
  local r found
  r=$(fj_repo) || return 1
  case "$1" in
    \#*)
      fj_num "${1#\#}" || return 1
      found=$(fj_list_jq "repos/$r/issues/${1#\#}/timeline" "" -c '[.[] | select((.type == "pull_ref" or .type == "comment_ref") and (.ref_issue.pull_request != null))
        | .ref_issue | {number, title, html_url, state, merged: (.pull_request.merged // false)}] | unique_by(.number)') || return 1 ;;
    *)
      found=$(fj_get "repos/$r/issues?type=pulls&state=all&q=$(printf '%s' "$1" | jq -sRr @uri)&limit=50" -c \
        '[.[] | {number, title, html_url, state, merged: (.pull_request.merged // false)}]') || return 1 ;;
  esac
  printf '%s' "$found" | jq --arg s "${2:-open}" '[.[]
    | {number, title, url: .html_url, state: (if .merged then "MERGED" elif .state == "open" then "OPEN" else "CLOSED" end)}
    | select($s == "all" or (.state | ascii_downcase) == $s)]'
}
fj_search_prs "#{issueId}" open
```

#### create-pr
Base branch, draft flag, title, body file → PR. Push the branch first; the head is the current branch. For a head in a fork, set `HEAD_REF=<owner>:<branch>`. A draft gets the `WIP: ` title prefix.
```bash
PR=$(jq -n --arg h "${HEAD_REF:-$(git rev-parse --abbrev-ref HEAD)}" --arg b "$BASE_BRANCH" --arg t "<title>" \
  --argjson draft true --rawfile d <body-file> \
  '{head: $h, base: $b, title: (if $draft then "WIP: " + $t else $t end), body: $d}' \
  | fj_write POST "repos/$(fj_repo)/pulls")
PR_URL=$(printf '%s' "$PR" | jq -er '.html_url') || exit 1
PR_NUMBER=$(printf '%s' "$PR" | jq -er '.number') || exit 1
```

#### update-pr
`{prNumber}`, new title and/or body file → the PR's own title/body rewritten in place. Pass only what changed. A title update keeps the `WIP: ` prefix while the PR is a draft, so it never promotes the PR as a side effect.
```bash
fj_num {prNumber} || exit 1
DRAFT=$(fj_get "repos/$(fj_repo)/pulls/{prNumber}" '.draft // false') || exit 1
jq -n --arg t "<title>" --argjson draft "$DRAFT" \
  "$FJ_JQ_DEFS"'{title: (if $draft and ($t | test(fj_draft_re; "i") | not) then "WIP: " + $t else $t end)}' \
  | fj_write PATCH "repos/$(fj_repo)/pulls/{prNumber}" >/dev/null
jq -n --rawfile b <body-file> '{body: $b}' | fj_write PATCH "repos/$(fj_repo)/pulls/{prNumber}" >/dev/null
```

#### comment-pr
`{prNumber}`, body file → the new comment's id.
```bash
fj_comment {prNumber} <body-file>
```

#### attach-image-evidence
`{prNumber}`, a markdown body file (without the images), a `{slug}`, and local image paths → one comment with the images embedded **inline**. Returns the comment URL.

Forgejo stores attachments on the comment itself, so no branch is ever written. The steps:
1. Post the comment.
2. Upload each image to `/issues/comments/{id}/assets`.
3. Rewrite the comment with the returned download URLs.

On a private repository the images render only for viewers signed in with access.
```bash
fj_num {prNumber} || exit 1
R=$(fj_repo) || exit 1
COMMENT_ID=$(fj_comment {prNumber} <body-file>) || exit 1
EV_BODY=$(mktemp)
cat <body-file> > "$EV_BODY"
for img in "<image-path>" "<image-path>"; do   # one quoted argument per image
  name=$(basename "$img")
  url=$(fj_http POST "repos/$R/issues/comments/$COMMENT_ID/assets?name=$(printf '%s' "$name" | jq -sRr @uri)" "" "$img" \
    | jq -er '.browser_download_url') || { printf '\n- %s (inline upload failed; local artifact)\n' "$img" >> "$EV_BODY"; continue; }
  printf '\n![%s](%s)\n' "$name" "$url" >> "$EV_BODY"
done
jq -n --rawfile b "$EV_BODY" '{body: $b}' | fj_write PATCH "repos/$R/issues/comments/$COMMENT_ID" | jq -r '.html_url'
rm -f "$EV_BODY"
```
Fallback: when an upload fails (attachments disabled, size limit), the comment lists the local artifact paths for those images, says inline rendering was unavailable, and the operation still succeeds. Never store evidence on the PR's own branch.

#### assign-pr / unassign-pr
The same read-modify-write as **assign-issue**, on the PR number: `fj_assign {prNumber} add <username>` / `fj_assign {prNumber} remove <username>`.

#### label-pr / unlabel-pr
Always through the guards: `apply_label "<label>" {prNumber}` / `set_pipeline_label {prNumber} "<label>"` for the mutually exclusive pipeline group; direct removal: `remove_label "<label>" {prNumber}`.

#### get-pr-diff
`{prNumber}` → the full unified diff, or the changed-file list.
```bash
fj_num {prNumber} || exit 1
fj_http GET "repos/$(fj_repo)/pulls/{prNumber}.diff"
fj_list_jq "repos/$(fj_repo)/pulls/{prNumber}/files" "" -r '.[].filename'   # name-only
```

#### get-pr-files
`{prNumber}` → changed files with per-file status (added/modified/removed/renamed).
```bash
fj_num {prNumber} || exit 1
fj_list_jq "repos/$(fj_repo)/pulls/{prNumber}/files" "" '[.[] | {path: .filename,
  status: (if .status == "deleted" then "removed" else .status end)}]'
```

#### checkout-pr
`{prNumber}` → the PR head available locally. Forgejo publishes every PR head, fork PRs included, as `refs/pull/<n>/head` on the base repository. Here `origin` must be the Forgejo remote.
```bash
fj_num {prNumber} || exit 1
git fetch origin "refs/pull/{prNumber}/head:pr-{prNumber}"
git checkout "pr-{prNumber}"
```
To push fixes to a fork PR, push to the head repository's URL and `headRefName`. That works only when `maintainerCanModify` is true. For a same-repository PR, check out `headRefName` from `origin` instead.

#### review-pr
`{prNumber}`, verdict (approve / request changes), body file. Forgejo records both natively.
```bash
fj_review() {
  local event
  fj_num "$1" || return 1
  case "$2" in
    approve) event=APPROVED ;;
    request-changes) event=REQUEST_CHANGES ;;
    *) echo "Unknown review verdict: $2" >&2; return 1 ;;
  esac
  jq -n --arg e "$event" --rawfile b "$3" '{event: $e, body: $b}' \
    | fj_write POST "repos/$(fj_repo)/pulls/$1/reviews" | jq -e '.id' >/dev/null || {
    echo "Forgejo refused the review: authors cannot approve or request changes on their own pull request (HTTP 422), and branch rules may exclude this user." >&2
    return 1
  }
}
fj_review {prNumber} approve <body-file>
fj_review {prNumber} request-changes <body-file>
```
Surface a refused self-approval instead of working around it, exactly as on GitHub.

#### merge-pr
`{prNumber}` and the `headRefOid` the caller's merge gate checked; squash by default.
- `head_commit_id` makes Forgejo refuse the merge if a newer commit landed after the gate, so unverified code never merges.
- Auto-merge (merge once checks succeed) runs only when the skill asks for it.
- The source branch is deleted only when asked.
```bash
fj_num {prNumber} || exit 1
jq -n --arg sha "<headRefOid>" '{Do: "squash", head_commit_id: $sha}' \
  | fj_write POST "repos/$(fj_repo)/pulls/{prNumber}/merge" >/dev/null || exit 1
fj_get "repos/$(fj_repo)/pulls/{prNumber}" -e '.merged == true' >/dev/null
jq -n --arg sha "<headRefOid>" '{Do: "squash", head_commit_id: $sha, merge_when_checks_succeed: true}' \
  | fj_write POST "repos/$(fj_repo)/pulls/{prNumber}/merge" >/dev/null   # auto-merge
```
The merge endpoint answers with an empty body, so the read-back is the proof. Surface these refusals instead of merging differently:
- a 405: required checks or approvals unmet, squash disallowed by the repository settings, or Forgejo still recomputing mergeability right after a change to either branch. Re-read **get-pr** and retry once before surfacing it;
- a 409: the head moved.

#### mark-pr-ready
Promote a draft PR by stripping the work-in-progress prefix from its title, then read it back. If Forgejo still reports a draft (the instance uses other prefixes), fail and name the title.
```bash
fj_num {prNumber} || exit 1
fj_get "repos/$(fj_repo)/pulls/{prNumber}" "$FJ_JQ_DEFS"'{title: (.title | sub(fj_draft_re; ""; "i"))}' \
  | fj_write PATCH "repos/$(fj_repo)/pulls/{prNumber}" >/dev/null || exit 1
fj_get "repos/$(fj_repo)/pulls/{prNumber}" -e '(.draft // false) == false' >/dev/null || {
  echo "PR {prNumber} is still a draft: '$(fj_get "repos/$(fj_repo)/pulls/{prNumber}" -r .title)' — the instance uses other work-in-progress prefixes." >&2
  exit 1
}
```

#### get-pr-checks
`{prNumber}` → the latest commit status per context on the PR head, with `name`, `state`, `bucket` (`pass`/`fail`/`pending`/`skipping`), `link`, and the workflow name. Bucket mapping:
- `success` → `pass`;
- `failure` and `error` → `fail`;
- `pending` → `pending`;
- `warning` → `pass` (Forgejo does not block on it);
- `skipped` → `skipping`.

No statuses means no CI reported, so the result is an empty list. A status list can under-report here while its jobs register, so consumers must cross-check **list-runs** at the PR head SHA before treating a short list as green.
```bash
fj_pr_checks() {
  local r web sha statuses
  fj_num "$1" || return 1
  r=$(fj_repo) || return 1
  web=$(fj_web) || return 1
  sha=$(fj_get "repos/$r/pulls/$1" -r '.head.sha') || return 1
  fj_sha "$sha" || return 1
  statuses=$(fj_list "repos/$r/commits/$sha/statuses") || { echo "Could not read the statuses of $sha" >&2; return 1; }
  printf '%s' "$statuses" | jq --arg web "$web" "$FJ_JQ_DEFS"'group_by(.context) | map(max_by(.id) | fj_check($web))'
}
fj_pr_checks {prNumber}
```
An unreadable status list is an error, never an empty list. An empty list means "no CI reported", which a merge gate would read as nothing to wait for.

#### get-required-checks
Base branch → the required status contexts, one per line.
- Read from `GET /branches/{branch}`. The server has already resolved which protection rule applies, and no admin rights are needed.
- A branch that does not enforce status checks prints nothing, which is the contract's "treat every reported check as required" case.
- A rule whose contexts contain glob patterns also prints nothing, with a note on stderr.
- An unreadable branch (401, 403, 5xx, network) **exits non-zero**. It never reads as "no required checks".
```bash
fj_required_checks() {
  local branch
  branch=$(fj_get "repos/$(fj_repo)/branches/$(printf '%s' "$1" | jq -sRr @uri)" '.') || {
    echo "Branch $1 is unreadable; required checks unknown (not 'none')." >&2
    return 1
  }
  printf '%s' "$branch" | jq -r '
    if .enable_status_check != true then empty
    elif any((.status_check_contexts // [])[]; test("[*?\\[]")) then
      ("Required contexts of \(.name) use patterns; treat every reported check as required." | stderr | empty)
    else (.status_check_contexts // [])[] end'
}
fj_required_checks {baseRefName}
```

#### get-pr-comment / get-review-comment
Forgejo links both kinds as `…/pulls/<n>#issuecomment-<id>`.
- Try `fj_get_comment {commentId}` from **get-issue-comment** first.
- When it reports an inline review comment, use `fj_get_review_comment {prNumber} {commentId}`. There is no lookup by id alone, so it scans the PR's reviews.
```bash
fj_get_review_comment() {
  local r rid found
  fj_num "$1" || return 1
  fj_num "$2" || return 1
  r=$(fj_repo) || return 1
  for rid in $(fj_list_jq "repos/$r/pulls/$1/reviews" "" -r '.[] | select((.comments_count // 0) > 0) | .id'); do
    found=$(fj_get "repos/$r/pulls/$1/reviews/$rid/comments" -c --argjson c "$2" \
      'first(.[] | select(.id == $c) | {body, user: .user.login, url: .html_url}) // empty') || return 1
    [ -n "$found" ] && { printf '%s\n' "$found"; return 0; }
  done
  echo "Review comment $2 not found on PR #$1" >&2
  return 1
}
fj_get_review_comment {prNumber} {commentId}
```

#### list-review-comments
`{prNumber}` → every inline review comment on the diff (file, line, author, body), with Forgejo's `resolved` state. Forgejo does not expose reply threading through the API, so `reply_to` is always `null`. Group comments by `path` and `line` to reconstruct a thread.
```bash
fj_num {prNumber} || exit 1
R=$(fj_repo) || exit 1
for rid in $(fj_list_jq "repos/$R/pulls/{prNumber}/reviews" "" -r '.[] | select((.comments_count // 0) > 0) | .id'); do
  fj_get "repos/$R/pulls/{prNumber}/reviews/$rid/comments" -c '.[]' || exit 1
done | jq -s '[.[] | {id, user: .user.login, path, line: (if (.position // 0) > 0 then .position else .original_position end),
  body, url: .html_url, reply_to: null, resolved: (.resolver != null)}]'
```

### CI runs

CI status for a *PR* comes from **get-pr-checks** above. These operations address **Forgejo Actions runs** directly. A run's API `id` is the `{runId}`.

When the CI is external (Woodpecker or another service) or Actions is disabled, Forgejo has no runs to read. The operations below then exit 4 and print `RUNS_UNAVAILABLE <link>`, where the link is the first commit status's `target_url`, so the caller can hand the run to a human instead of reading "no runs" as "nothing pending".

#### list-runs
Branch (or head SHA) → the Actions runs at that commit with `databaseId`, `workflowName` (the workflow file), `status` (`queued`/`in_progress`/`completed`), `conclusion`, `headSha`, `url`, and `createdAt`. A branch is resolved to its head SHA first, because pull-request runs are recorded against the PR rather than the branch.
```bash
fj_list_runs() {
  local r web sha runs statuses hdr
  [ -n "${1:-}" ] || { echo "list-runs needs a branch or head SHA" >&2; return 1; }
  r=$(fj_repo) || return 1
  web=$(fj_web) || return 1
  if fj_sha "$1" 2>/dev/null && [ "${#1}" -ge 40 ]; then sha=$1
  else sha=$(fj_get "repos/$r/branches/$(printf '%s' "$1" | jq -sRr @uri)" -r '.commit.id') || return 1
  fi
  hdr=$(mktemp) || return 1
  if ! runs=$(FJ_HDR="$hdr" fj_list "repos/$r/actions/runs?head_sha=$sha" workflow_runs 2>/dev/null); then
    # 404/403: Actions is disabled or not offered; anything else is an unreadable answer.
    case "$(FJ_HDR="$hdr" fj_status)" in
      403|404) runs='' ;;
      *) rm -f "$hdr"; echo "Could not read Actions runs for $sha" >&2; return 1 ;;
    esac
  fi
  rm -f "$hdr"
  if [ -n "$runs" ] && [ "$(printf '%s' "$runs" | jq 'length')" -gt 0 ]; then
    printf '%s' "$runs" | jq "$FJ_JQ_DEFS"'map(fj_run)'
    return 0
  fi
  statuses=$(fj_list "repos/$r/commits/$sha/statuses") || return 1
  if [ "$(printf '%s' "$statuses" | jq 'length')" -gt 0 ] || [ -z "$runs" ]; then
    printf 'RUNS_UNAVAILABLE %s\n' "$(printf '%s' "$statuses" | jq -r --arg web "$web" \
      'first(.[].target_url // empty | if startswith("/") then $web + . else . end) // "no CI link"')"
    return 4
  fi
  echo '[]'
}
fj_list_runs {branch}
fj_list_runs {headSha}
```
An empty list means Actions is enabled but no run has registered for the commit yet. With statuses present but no runs, the CI is external, so the answer is `RUNS_UNAVAILABLE`.

#### get-run
Run id → status, conclusion, and per-job breakdown.
```bash
fj_get_run() {
  local r jobs rc
  fj_num "$1" || return 1
  r=$(fj_repo) || return 1
  jobs=$(mktemp) || return 1
  fj_get "repos/$r/actions/runs/$1/jobs" '.' > "$jobs" || { rm -f "$jobs"; return 1; }
  fj_get "repos/$r/actions/runs/$1" --slurpfile jobs "$jobs" "$FJ_JQ_DEFS"'fj_run + {jobs: [$jobs[0][]
    | {databaseId: .id, name, runsOn: .runs_on} + fj_run_status]}'
  rc=$?; rm -f "$jobs"; return "$rc"
}
fj_get_run {runId}
```

#### get-run-failed-logs
Run id → the log of each failed job (the last 400 lines of each; failures are at the end). This is the primary diagnosis input for CI failures.
```bash
fj_num {runId} || exit 1
R=$(fj_repo) || exit 1
FAILED_JOBS=$(fj_get "repos/$R/actions/runs/{runId}/jobs" -r '.[] | select(.status == "failure") | "\(.id)\t\(.name)"') || exit 1
if [ -n "$FAILED_JOBS" ]; then printf '%s\n' "$FAILED_JOBS" | while IFS="$(printf '\t')" read -r job name; do
    printf '=== job %s (#%s) ===\n' "$name" "$job"
    LOG=$(fj_http GET "repos/$R/actions/jobs/$job/logs") || exit 1
    printf '%s\n' "$LOG" | tail -n 400
  done
fi
```

#### rerun-failed
Run id → disambiguate a flaky failure before changing any code. Forgejo's API cannot re-run a job, which only the web UI can do. It can only dispatch a workflow again, and a dispatched run reports its statuses under a different event (`… (workflow_dispatch)`), so the PR's failed check stays red. The operation therefore has two modes, chosen by the switch below. Edit it in the repository's committed copy to change it.
- `report` (default): prints `RERUN_UNAVAILABLE <run link>` and exits 3. The caller records the failure as an unconfirmed flake and leaves the check for a human to re-run from the link. That is the only path that turns the same check green.
- `dispatch`: re-dispatches the run's workflow file on the PR head branch (or the run's ref) and returns the new run in the **get-run** shape, ready for **watch-run**. This suits unattended orchestrators with no web access. It diagnoses only: the PR check stays red until a re-run from the UI or a new push. It needs `workflow_dispatch:` in the workflow's `on:` triggers and re-runs the whole workflow file, not only the failed jobs.
```bash
FORGEJO_RERUN_MODE=report   # report | dispatch — the team's switch; commit the change in .ai/trackers/forgejo.md
fj_rerun() {
  local r run wf ref new
  fj_num "$1" || return 1
  r=$(fj_repo) || return 1
  run=$(fj_get "repos/$r/actions/runs/$1" '.') || return 1
  case "${FORGEJO_RERUN_MODE:-report}" in
    report)
      printf 'RERUN_UNAVAILABLE %s\n' "$(printf '%s' "$run" | jq -r '.html_url')"
      return 3 ;;
    dispatch)
      wf=$(printf '%s' "$run" | jq -r '.workflow_id')
      ref=$(printf '%s' "$run" | jq -r '(.event_payload // "{}" | fromjson? // {}) | .pull_request.head.ref // empty')
      [ -n "$ref" ] || ref=$(printf '%s' "$run" | jq -r '.prettyref // empty | select(startswith("#") | not)')
      [ -n "$wf" ] && [ -n "$ref" ] || { echo "Cannot tell which workflow and ref run $1 used" >&2; return 1; }
      new=$(jq -n --arg ref "$ref" '{ref: $ref, return_run_info: true}' \
        | fj_write POST "repos/$r/actions/workflows/$(printf '%s' "$wf" | jq -sRr @uri)/dispatches" | jq -er '.id') || {
        echo "Dispatch refused: does $wf declare 'workflow_dispatch:' in its on: triggers? Otherwise switch FORGEJO_RERUN_MODE back to report." >&2
        return 1
      }
      fj_get_run "$new" ;;
    *) echo "Unknown FORGEJO_RERUN_MODE: $FORGEJO_RERUN_MODE" >&2; return 1 ;;
  esac
}
fj_rerun {runId}
```

#### watch-run
Run id → block until the run finishes; exit non-zero unless it succeeded. This polls **get-run** within the caller's wait budget (`ci.maxWaitMinutes`, default 40).
```bash
fj_num {runId} || exit 1
DEADLINE=$(( $(date +%s) + ${CI_MAX_WAIT_MINUTES:-40} * 60 ))
while :; do
  # A failed poll is retried until the deadline, never read as a finished run.
  RUN=$(fj_get "repos/$(fj_repo)/actions/runs/{runId}" -c "$FJ_JQ_DEFS"'fj_run') || RUN='{}'
  [ "$(printf '%s' "$RUN" | jq -r '.status // empty')" = completed ] && break
  [ "$(date +%s)" -ge "$DEADLINE" ] && { echo "Run {runId} still running after the wait budget" >&2; exit 2; }
  sleep 30
done
printf '%s' "$RUN" | jq -e '.conclusion == "success"' >/dev/null
```

### Labels

#### list-labels
→ every label name available to the repository, including its organization's labels.
```bash
LABELS=$(fj_labels) || { echo "Could not read Forgejo labels" >&2; exit 1; }
printf '%s' "$LABELS" | jq -r '.[].name'
```

#### create-label
Name, color (`#rrggbb`), description. Creates a repository label. Teams that share a taxonomy across repositories may create the same names as organization labels instead. Never delete, rename, or recolor existing labels.
```bash
fj_create_label() {
  jq -n --arg n "$1" --arg c "$2" --arg d "$3" '{name: $n, color: $c, description: $d}' \
    | fj_write POST "repos/$(fj_repo)/labels" >/dev/null
}
fj_create_label "<name>" "#<hex>" "<description>"
```

#### ensure-label-taxonomy
Create every label from the config's taxonomy that does not exist yet. `om-setup-agent-pipeline` uses it; labels that **list-labels** already returns are skipped.
```bash
EXISTING=$(fj_labels) || { echo "Could not read Forgejo labels" >&2; exit 1; }
EXISTING=$(printf '%s' "$EXISTING" | jq -r '.[].name')
while IFS='|' read -r name color description; do
  [ -n "$name" ] || continue
  printf '%s\n' "$EXISTING" | grep -Fxq "$name" || fj_create_label "$name" "$color" "$description"
done <<'EOF'
review|#0366d6|Ready for code review
changes-requested|#b60205|Reviewer requested changes
qa|#fbca04|Manual QA in progress
qa-failed|#b60205|Manual QA failed
merge-queue|#0e8a16|Approved, ready to merge
blocked|#b60205|Blocked by a dependency
do-not-merge|#b60205|Hard merge block
bug|#d73a4a|Bug fix
feature|#a2eeef|New capability
refactor|#cfd3d7|No behavior change
security|#b60205|Security-relevant change
dependencies|#0366d6|Dependency update
documentation|#0075ca|Docs only
needs-qa|#fbca04|Requires manual QA before merge
skip-qa|#0e8a16|Low risk, QA not required
qa-approved|#0e8a16|Manual QA passed
qa-self-verified|#c5def5|Self-QA exception used
in-progress|#c5def5|An automated skill is working on this
ci-monitoring|#d4c5f9|Work complete and reported; agent is watching CI results
do-not-close|#c5def5|Humans only: never auto-close this issue
priority-low|#e4e669|Cosmetic or follow-up work
priority-medium|#fbca04|Ordinary bug or feature
priority-high|#d93f0b|Release-blocking
priority-extreme|#b60205|Outage or security incident
risk-low|#0e8a16|Isolated, low blast radius
risk-medium|#fbca04|Ordinary change with tests
risk-high|#b60205|Wide blast radius, review deeply
EOF
```
