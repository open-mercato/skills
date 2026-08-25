# Tracker provider: Linear issues + GitHub pull requests

This is the split-provider implementation of the tracker operations contract for teams that keep issues in Linear and source code on GitHub. Issue operations use [`schpet/linear-cli`](https://github.com/schpet/linear-cli); repository, pull-request, review, CI, and PR-label operations delegate to the companion `.ai/trackers/github.md` descriptor.

At runtime, `om-setup-agent-pipeline` installs both files and sets `"tracker": "linear"`. The repository's copies are authoritative: teams may add flags or project conventions without editing installed skills.

## Prerequisites

- Install the `linear` CLI from its upstream releases or package instructions, then authenticate with `linear auth login`. Prefer the native keyring; `LINEAR_API_KEY` is the CI fallback. Never commit an API key to `.linear.toml`.
- Run `linear config` in the repository, or set `LINEAR_TEAM` to a Linear team key. Multi-team reads can use `--all-teams`, but mutations need an explicit issue identifier or team.
- Install and authenticate the `gh` CLI, and keep the companion `.ai/trackers/github.md` descriptor. Pull-request and CI operations fail loudly when either is missing.
- This descriptor targets the current `linear` command surface documented by `linear --help`. The **auth-check** operation verifies availability and authentication; when a documented flag is absent, upgrade the CLI before mutating tracker state.

## Conventions

- Linear issue identifiers are team keys plus numbers, such as `ENG-123`. Preserve that token in branch names and PR bodies. GitHub does not auto-close Linear issues from `Closes ENG-123`; after merge, explicitly run **close-issue** and include the merged PR URL in the closing comment.
- `{repo}` means a Linear team key for issue creation/search and `owner/name` for delegated GitHub operations. When omitted, issue commands use `LINEAR_TEAM` or the team in `.linear.toml`; GitHub commands infer the repository from the checkout.
- Linear has no pull-request object. Drafts, reviews, mergeability, CI status, and PR labels are GitHub concepts and always delegate to `.ai/trackers/github.md`.
- The issue claim signals are: assignee = the Linear automation user, the `in-progress` issue label, and a `🤖`-prefixed timestamped comment. `linear issue view <id> --json --no-download` returns assignee, labels, state, and comments so all three signals are readable.
- Use file flags for multi-line Markdown: `--description-file` for descriptions and `--body-file` for comments. Add `--no-interactive` to issue creation so autonomous runs never wait for a prompt.
- Mutations are read back with `linear issue view <id> --json --no-download` when a later decision depends on success.

## Label guards

Linear labels can be workspace-wide or team-scoped. The guard searches both and skips an unknown label instead of creating it during ordinary work.

```bash
linear_issue_label_exists() {
  linear label list --all --json \
    | jq -e --arg label "$1" '.nodes[] | select(.name == $label)' >/dev/null
}

apply_issue_label() {
  if [ "$LABELS_ENABLED" != "true" ]; then return 0; fi
  if linear_issue_label_exists "$1"; then
    linear issue update "$2" --add-label "$1"
    linear issue view "$2" --json --no-download \
      | jq -e --arg label "$1" '.labels.nodes[] | select(.name == $label)' >/dev/null
  else
    echo "Skipping Linear label '$1' (not defined in this workspace/team). Create it with: linear label create --name '$1'"
  fi
}

remove_issue_label() {
  if [ "$LABELS_ENABLED" != "true" ]; then return 0; fi
  if linear_issue_label_exists "$1"; then
    linear issue update "$2" --remove-label "$1"
  fi
}
```

PR label helpers (`label_exists`, `apply_label`, `remove_label`, and `set_pipeline_label`) execute exactly as defined in `.ai/trackers/github.md`. Setup's **list-labels** and **ensure-label-taxonomy** operations provision the GitHub PR taxonomy. Linear issue labels are intentionally team-owned; optionally create matching category, priority, risk, `in-progress`, and `do-not-close` labels with `linear label create` before running issue-authoring skills.

## Operations

### Identity and repository

#### auth-check

Verify both halves before a batch run:

```bash
linear_tracker_auth_check() {
  command -v linear >/dev/null || {
    echo "linear CLI is not installed: https://github.com/schpet/linear-cli" >&2
    return 1
  }
  linear --version
  linear auth status
  linear issue create --help | grep -Fq -- '--no-interactive' || {
    echo "Installed linear CLI is too old for autonomous issue creation; upgrade it." >&2
    return 1
  }
  [ -f .ai/trackers/github.md ] || {
    echo "Missing companion .ai/trackers/github.md" >&2
    return 1
  }
  gh auth status
}
linear_tracker_auth_check
```

#### current-user

For an issue claim, use the authenticated Linear email; `self` remains the mutation alias. For a PR claim, execute **current-user** from `.ai/trackers/github.md` instead.

```bash
CURRENT_USER=$(linear auth whoami | sed -n 's/^[[:space:]]*Email:[[:space:]]*//p' | head -n 1)
[ -n "$CURRENT_USER" ] || { echo "Could not resolve the Linear automation user" >&2; return 1; }
```

#### repo-info

Repository identity comes from **repo-info** in `.ai/trackers/github.md`. For issue scope, resolve the Linear workspace with `linear auth whoami` and the configured team with `LINEAR_TEAM` or `.linear.toml`; never silently substitute a GitHub repository name for a Linear team key.

#### default-branch

Execute **default-branch** from `.ai/trackers/github.md`.

### Issues

#### get-issue

`{issueId}` and requested fields → structured issue data. `--no-download` prevents a read from writing remote images into the worktree.

```bash
linear issue view "{issueId}" --json --no-download
```

The view command's embedded comment connection is bounded. When the caller needs complete comment history (claim/stale-lock detection or marker idempotency), also run **list-issue-comments**.

#### search-issues

Text query, state, optional team → matching issues. Translate `open` to non-terminal state types and `closed` to terminal types; omit the state flags for all states.

```bash
# open
linear issue query --search "<query>" --all-teams \
  --state triage --state backlog --state unstarted --state started --limit 0 --json

# closed
linear issue query --search "<query>" --all-teams \
  --state completed --state canceled --limit 0 --json

# any state
linear issue query --search "<query>" --all-teams --all-states --limit 0 --json
```

Use `--team "{repo}"` instead of `--all-teams` when a Linear team key was passed. Add `--search-comments` only when the caller explicitly asks to search comments.

#### create-issue

Title, description body file, assignee, labels, and optional team → created issue URL. Repeat `--label` once per guarded label. Capture the final URL line, then resolve the identifier from that URL or the command output.

```bash
linear issue create <optional: --team "{repo-or-LINEAR_TEAM}"> --title "<title>" \
  --description-file <body-file> --assignee "${ASSIGNEE:-self}" \
  <repeat: --label "<label>"> --no-interactive
```

#### close-issue

Post the closing explanation/PR link first, then move the issue to a terminal state and read it back. Use `canceled` only when the caller's reason is explicitly not-planned; otherwise use `completed`.

```bash
linear issue comment add "{issueId}" --body-file <closing-comment-file>
linear issue update "{issueId}" --state completed
linear issue view "{issueId}" --json --no-download
```

#### comment-issue

```bash
linear issue comment add "{issueId}" --body-file <body-file>
```

#### update-issue

Pass only the fields that changed; file-based description input preserves Markdown.

```bash
linear issue update "{issueId}" --title "<new-title>"
linear issue update "{issueId}" --description-file <body-file>
```

#### assign-issue / unassign-issue

```bash
linear issue update "{issueId}" --assignee "<user-or-self>"
linear issue update "{issueId}" --unassign
```

#### label-issue / unlabel-issue

Always use `apply_issue_label "<label>" "{issueId}"` / `remove_issue_label "<label>" "{issueId}"` from the guard above.

#### get-issue-comment

Comment id → body, author, URL. The dedicated CLI has list/update but no single-comment read, so use its documented GraphQL fallback:

```bash
linear api --variable id="{commentId}" <<'GRAPHQL' | jq '.data.comment'
query($id: String!) {
  comment(id: $id) {
    id
    body
    createdAt
    updatedAt
    url
    user { name displayName email }
    externalUser { name displayName }
  }
}
GRAPHQL
```

#### list-issue-comments

The dedicated list command currently returns only its first connection page. Use the CLI's `api --paginate` fallback so lock and marker detection sees the whole history:

```bash
linear api --variable id="{issueId}" --paginate <<'GRAPHQL'
query($id: String!, $after: String) {
  issue(id: $id) {
    comments(first: 100, after: $after, orderBy: createdAt) {
      nodes {
        id
        body
        createdAt
        updatedAt
        url
        user { name displayName email }
        externalUser { name displayName }
        parent { id }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}
GRAPHQL
```

The JSON array carries `id`, `body`, `createdAt`, `updatedAt`, `url`, user/external-user identity, and parent id for every page.

#### update-comment

```bash
linear issue comment update "{commentId}" --body-file <body-file>
```

### Pull requests

Every operation in this section executes the same-named operation from `.ai/trackers/github.md`, preserving its inputs, outputs, guards, pagination, and cross-repository rules.

#### get-pr
Delegate to GitHub **get-pr**.

#### list-prs
Delegate to GitHub **list-prs**.

#### search-prs
Delegate to GitHub **search-prs**. Search for a Linear key such as `ENG-123` as plain text rather than a GitHub `#123` reference.

#### create-pr
Delegate to GitHub **create-pr**. Reference the Linear key in the body, then use **comment-issue** to attach the resulting PR URL to Linear.

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
Delegate to GitHub **merge-pr**. After a successful merge, call Linear **close-issue** explicitly.

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
Delegate to GitHub **ensure-label-taxonomy**. Linear issue-label provisioning remains an explicit team-owned setup step described under Label guards.
