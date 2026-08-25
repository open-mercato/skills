# Tracker provider: Jira Cloud issues + GitHub pull requests

This is the split-provider implementation of the tracker operations contract for teams that keep issues in Jira Cloud and source code on GitHub. Issue operations use Atlassian CLI (`acli`); repository, pull-request, review, CI, and PR-label operations delegate to the companion `.ai/trackers/github.md` descriptor.

At runtime, `om-setup-agent-pipeline` installs both files and sets `"tracker": "jira"`. The repository's copies are authoritative: teams may add fields, Jira workflow mappings, or project conventions without editing installed skills.

## Prerequisites

- Install Atlassian CLI from the [official installation guide](https://developer.atlassian.com/cloud/acli/guides/install-acli/), then authenticate with `acli jira auth login --web` or pipe an API token to `acli jira auth login --site <site> --email <email> --token`. Never put a token on the command line or in this descriptor.
- Set `ATLASSIAN_SITE` to the Jira Cloud hostname (for example, `example.atlassian.net`), `ATLASSIAN_PROJECT` to the default project key, and `ATLASSIAN_ACCOUNT_ID` to the automation user's non-secret Jira account id. The account id makes claim comparison deterministic even when email visibility is restricted.
- Optionally set `ATLASSIAN_ISSUE_TYPE` (default `Task`), `ATLASSIAN_DONE_STATUS` (default `Done`), and `ATLASSIAN_CANCELED_STATUS` (default `Canceled`) to match the project's workflow.
- Install and authenticate the `gh` CLI, and keep the companion `.ai/trackers/github.md` descriptor. Pull-request and CI operations fail loudly when either is missing.
- Atlassian Government Cloud is not supported by `acli` as documented in the official introduction.

## Conventions

- Jira work-item identifiers are project keys plus numbers, such as `ENG-123`. Preserve that token in branch names and PR bodies. GitHub does not auto-close Jira issues from `Closes ENG-123`; after merge, explicitly run **close-issue** and include the merged PR URL in the closing comment.
- `{repo}` means a Jira project key for issue creation/search and `owner/name` for delegated GitHub operations. When omitted, issue commands use `ATLASSIAN_PROJECT`; GitHub commands infer the repository from the checkout.
- Jira has no pull-request object in `acli`. Drafts, reviews, mergeability, CI status, and PR labels are GitHub concepts and always delegate to `.ai/trackers/github.md`.
- The issue claim signals are: assignee account id = `ATLASSIAN_ACCOUNT_ID`, the free-form `in-progress` issue label, and a `🤖`-prefixed timestamped comment. **get-issue** requests assignee, labels, status, and comments so all three signals are readable.
- Jira comment ids are only unique with their work item in the CLI. This descriptor serializes them as opaque `{issueKey}:{numericCommentId}` handles (for example, `ENG-123:10042`) from **list-issue-comments** and accepts that handle in **get-issue-comment** and **update-comment**.
- Use file flags for multi-line text: `--description-file` for descriptions and `--body-file` for comments. Mutating bulk-capable commands always pass a single `--key` and `--yes` so an autonomous run neither expands scope through JQL nor waits for confirmation.
- Mutations are read back with `acli jira workitem view <key> --fields ... --json` when a later decision depends on success.

## Label guards

Jira's standard Labels field contains free-form values; there is no separately provisioned label registry to query. In Jira terms, existence means a non-empty syntactically valid value. The guard still honors `labels.enabled: false`, merges instead of replacing existing labels, and reads the result back.

```bash
jira_issue_label_exists() {
  [ -n "$1" ] && ! printf '%s' "$1" | grep -q '[[:space:],]'
}

apply_issue_label() {
  if [ "$LABELS_ENABLED" != "true" ]; then return 0; fi
  if jira_issue_label_exists "$1"; then
    labels=$(acli jira workitem view "$2" --fields labels --json \
      | jq -r --arg label "$1" '((.fields.labels // .labels // []) + [$label]) | unique | join(",")')
    acli jira workitem edit --key "$2" --labels "$labels" --yes
    acli jira workitem view "$2" --fields labels --json \
      | jq -e --arg label "$1" '(.fields.labels // .labels // []) | index($label)' >/dev/null
  else
    echo "Skipping Jira label '$1' (labels must be non-empty and contain no spaces or commas)."
  fi
}

remove_issue_label() {
  if [ "$LABELS_ENABLED" != "true" ]; then return 0; fi
  if jira_issue_label_exists "$1"; then
    acli jira workitem edit --key "$2" --remove-labels "$1" --yes
  fi
}
```

PR label helpers (`label_exists`, `apply_label`, `remove_label`, and `set_pipeline_label`) execute exactly as defined in `.ai/trackers/github.md`. Setup's **list-labels** and **ensure-label-taxonomy** operations provision the GitHub PR taxonomy. Jira issue labels need no creation step; issue-authoring skills may apply the same category, priority, risk, `in-progress`, and `do-not-close` values directly through the guard.

## Operations

### Identity and repository

#### auth-check

Verify both halves and the flags this descriptor relies on before a batch run:

```bash
atlassian_tracker_auth_check() {
  command -v acli >/dev/null || {
    echo "Atlassian CLI is not installed: https://developer.atlassian.com/cloud/acli/guides/install-acli/" >&2
    return 1
  }
  acli jira auth status
  : "${ATLASSIAN_SITE:?Set ATLASSIAN_SITE to the Jira Cloud hostname}"
  : "${ATLASSIAN_PROJECT:?Set ATLASSIAN_PROJECT to the default Jira project key}"
  : "${ATLASSIAN_ACCOUNT_ID:?Set ATLASSIAN_ACCOUNT_ID to the automation user's Jira account id}"
  printf '%s' "$ATLASSIAN_SITE" | grep -Eq '^[A-Za-z0-9.-]+$' || {
    echo "ATLASSIAN_SITE must be a hostname without a scheme or path" >&2
    return 1
  }
  acli jira workitem edit --help | grep -Fq -- '--remove-labels' || {
    echo "Installed acli is too old for the documented Jira mutations; upgrade it." >&2
    return 1
  }
  [ -f .ai/trackers/github.md ] || {
    echo "Missing companion .ai/trackers/github.md" >&2
    return 1
  }
  gh auth status
}
atlassian_tracker_auth_check
```

#### current-user

For an issue claim, use the configured Jira account id. For a PR claim, execute **current-user** from `.ai/trackers/github.md` instead.

```bash
CURRENT_USER=${ATLASSIAN_ACCOUNT_ID:?Set ATLASSIAN_ACCOUNT_ID}
```

#### repo-info

Repository identity comes from **repo-info** in `.ai/trackers/github.md`. Jira issue scope is `${ATLASSIAN_SITE}/${ATLASSIAN_PROJECT}` (or the explicit project key passed as `{repo}`); never silently substitute a GitHub repository name for a Jira project key.

#### default-branch

Execute **default-branch** from `.ai/trackers/github.md`.

### Issues

#### get-issue

`{issueId}` and requested fields → structured issue data. Request only the fields the caller names; the full claim/review field set is:

```bash
acli jira workitem view "{issueId}" \
  --fields key,issuetype,summary,status,reporter,assignee,description,labels,priority,created,updated,comment \
  --json
```

Construct the browser URL as `https://${ATLASSIAN_SITE}/browse/{issueId}` when the JSON does not include one.

#### search-issues

Text query, state, optional project → matching work items. Escape backslashes and double quotes before placing user text in JQL; never interpolate raw query text.

```bash
jql_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

escaped_query=$(jql_escape "<query>")
project_key=${JIRA_PROJECT_OVERRIDE:-$ATLASSIAN_PROJECT}
case "$project_key" in
  ''|*[!A-Za-z0-9_-]*) echo "Invalid Jira project key: $project_key" >&2; exit 1 ;;
esac

# open
acli jira workitem search \
  --jql "project = \"${project_key}\" AND statusCategory != Done AND text ~ \"${escaped_query}\"" \
  --paginate --json

# closed
acli jira workitem search \
  --jql "project = \"${project_key}\" AND statusCategory = Done AND text ~ \"${escaped_query}\"" \
  --paginate --json
```

For any state, omit the `statusCategory` clause. Set `JIRA_PROJECT_OVERRIDE` from `{repo}` only after validating it as a Jira project key.

#### create-issue

Title, description body file, assignee, labels, and optional project → created issue JSON. Join guarded labels with commas for the repeatable `--label` input.

```bash
acli jira workitem create --project "${JIRA_PROJECT_OVERRIDE:-$ATLASSIAN_PROJECT}" \
  --type "${ATLASSIAN_ISSUE_TYPE:-Task}" --summary "<title>" \
  --description-file <body-file> --assignee "${ASSIGNEE:-$ATLASSIAN_ACCOUNT_ID}" \
  <optional: --label "<comma-separated-labels>"> --json
```

Read the returned key and report `https://${ATLASSIAN_SITE}/browse/<key>`.

#### close-issue

Post the closing explanation/PR link first, then transition the single issue and read it back. Use `ATLASSIAN_CANCELED_STATUS` only when the caller's reason is explicitly not-planned; otherwise use `ATLASSIAN_DONE_STATUS`.

```bash
acli jira workitem comment create --key "{issueId}" --body-file <closing-comment-file> --json
acli jira workitem transition --key "{issueId}" --status "${ATLASSIAN_DONE_STATUS:-Done}" --yes --json
acli jira workitem view "{issueId}" --fields key,status --json
```

#### comment-issue

```bash
acli jira workitem comment create --key "{issueId}" --body-file <body-file> --json
```

#### update-issue

Pass only the fields that changed; `--yes` prevents a confirmation prompt.

```bash
acli jira workitem edit --key "{issueId}" --summary "<new-title>" --yes --json
acli jira workitem edit --key "{issueId}" --description-file <body-file> --yes --json
```

#### assign-issue / unassign-issue

```bash
acli jira workitem assign --key "{issueId}" --assignee "<email-or-account-id-or-@me>" --yes --json
acli jira workitem assign --key "{issueId}" --remove-assignee --yes --json
```

#### label-issue / unlabel-issue

Always use `apply_issue_label "<label>" "{issueId}"` / `remove_issue_label "<label>" "{issueId}"` from the guard above.

#### get-issue-comment

Parse the opaque `{issueKey}:{commentId}` handle, list that issue's comments, and select the requested id:

```bash
printf '%s' "$COMMENT_HANDLE" | grep -Eq '^[A-Z][A-Z0-9_]+-[0-9]+:[0-9]+$' || {
  echo "Invalid Jira comment handle: $COMMENT_HANDLE" >&2
  exit 1
}
issue_key=${COMMENT_HANDLE%%:*}
comment_id=${COMMENT_HANDLE#*:}
acli jira workitem comment list --key "$issue_key" --paginate --json \
  | jq --arg id "$comment_id" --arg key "$issue_key" --arg site "$ATLASSIAN_SITE" '
      (.comments // .values // .)[]
      | select((.id | tostring) == $id)
      | {id: ($key + ":" + (.id | tostring)), body, author, created, updated,
         url: ("https://" + $site + "/browse/" + $key + "?focusedCommentId=" + (.id | tostring))}'
```

#### list-issue-comments

Return normalized comments whose `id` is the composite handle consumed by the two comment-id operations:

```bash
acli jira workitem comment list --key "{issueId}" --paginate --json \
  | jq --arg key "{issueId}" --arg site "$ATLASSIAN_SITE" '
      [(.comments // .values // .)[]
       | {id: ($key + ":" + (.id | tostring)), body, author, created, updated,
          url: ("https://" + $site + "/browse/" + $key + "?focusedCommentId=" + (.id | tostring))}]'
```

#### update-comment

```bash
printf '%s' "$COMMENT_HANDLE" | grep -Eq '^[A-Z][A-Z0-9_]+-[0-9]+:[0-9]+$' || {
  echo "Invalid Jira comment handle: $COMMENT_HANDLE" >&2
  exit 1
}
issue_key=${COMMENT_HANDLE%%:*}
comment_id=${COMMENT_HANDLE#*:}
acli jira workitem comment update --key "$issue_key" --id "$comment_id" --body-file <body-file>
```

### Pull requests

Every operation in this section executes the same-named operation from `.ai/trackers/github.md`, preserving its inputs, outputs, guards, pagination, and cross-repository rules.

#### get-pr
Delegate to GitHub **get-pr**.

#### list-prs
Delegate to GitHub **list-prs**.

#### search-prs
Delegate to GitHub **search-prs**. Search for a Jira key such as `ENG-123` as plain text rather than a GitHub `#123` reference.

#### create-pr
Delegate to GitHub **create-pr**. Reference the Jira key in the body, then use **comment-issue** to attach the resulting PR URL to Jira.

#### update-pr
Delegate to GitHub **update-pr**.

#### comment-pr
Delegate to GitHub **comment-pr**.

#### attach-image-evidence
Delegate to GitHub **attach-image-evidence**.

#### assign-pr / unassign-pr
Delegate both operations to GitHub.

#### label-pr / unlabel-pr
Delegate both operations and all PR label guards to GitHub.

#### get-pr-diff
Delegate to GitHub **get-pr-diff**.

#### get-pr-files
Delegate to GitHub **get-pr-files**.

#### checkout-pr
Delegate to GitHub **checkout-pr**.

#### review-pr
Delegate to GitHub **review-pr**.

#### merge-pr
Delegate to GitHub **merge-pr**. After a successful merge, call Jira **close-issue** explicitly.

#### mark-pr-ready
Delegate to GitHub **mark-pr-ready**.

#### get-pr-checks
Delegate to GitHub **get-pr-checks**.

#### get-required-checks
Delegate to GitHub **get-required-checks**.

#### get-pr-comment / get-review-comment
Delegate both operations to GitHub.

#### list-review-comments
Delegate to GitHub **list-review-comments**.

### CI runs

#### list-runs
Delegate to GitHub **list-runs**.

#### get-run
Delegate to GitHub **get-run**.

#### get-run-failed-logs
Delegate to GitHub **get-run-failed-logs**.

#### rerun-failed
Delegate to GitHub **rerun-failed**.

#### watch-run
Delegate to GitHub **watch-run**.

### Labels

#### list-labels
Delegate to GitHub **list-labels**; this is the PR label taxonomy setup inspects.

#### create-label
Delegate to GitHub **create-label**.

#### ensure-label-taxonomy
Delegate to GitHub **ensure-label-taxonomy**. Jira issue labels are free-form and need no provisioning step.
