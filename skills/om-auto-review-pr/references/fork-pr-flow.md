# Fork PRs — carry-forward replacement flow (step 11)

The autofix branch `om-auto-review-pr` takes when the PR head branch lives in a
fork instead of the main repository. For fork PRs, do not wait on the original
author and do not push to the contributor's branch by default. (Same-repo PRs
are covered in `references/review-report.md`.)

Instead:

1. Keep the current worktree based on the fetched PR head SHA so the original commits and authorship are preserved.
2. Before switching branches, set `TITLE_HEAD_BRANCH` to the original PR's `headRefName` from **get-pr**, so title extraction retains its ticket key. Create a new branch in the main repository, for example `carry/pr-{prNumber}-ready`.
3. Implement the fixes there.
4. Resolve any conflicts against `{baseRefName}` on that carry-forward branch.
5. Run the autofix loop from `references/review-report.md` until the branch is re-reviewed as approvable or a real blocker remains.
6. Commit and push the new branch to `origin`.
7. Open a replacement PR against `{baseRefName}` via the tracker operation **create-pr**.
8. Close the original PR only after the replacement PR exists successfully.

Validation requirements for autofix mode:

- On every cycle, run the test commands from `validation.commands` for the changed scope.
- On every cycle, run the typecheck (or equivalent static-check) commands from `validation.commands` for the changed scope.
- Before the final push, run at least one last test pass and one last static-check pass against the final branch state.
- If the original review required broader workspace validation, rerun the broader validation before opening or updating the replacement PR.

Replacement PR requirements:

- Build the PR title per §PR title below; by default conventional-commit style scoped to the affected module or area: `fix(<area>): <summary>`, `feat(<area>): <summary>`, `refactor(<area>): <summary>`, etc. Where `<area>` is the primary affected module or package (e.g., `auth`, `api`, `ui`, `shared`)
- Include the original PR link
- Credit the original PR author explicitly
- State that the new PR carries forward the original work plus the requested fixes
- Mention that the branch was re-reviewed after autofix and is intended to be merge-ready
- Reassign the replacement PR to the original PR author when possible, and leave a handoff comment inviting them to do the next recheck from the carried-forward branch

Replacement PR body — this is the canonical explanation of the carried work,
so describe the resulting behavior instead of saying only “original changes.”
Keep the supersede line in the first 20 lines and the exact credit prefix.

```markdown
Supersedes #{prNumber}

Credit: original implementation by @{originalAuthor}.

{Who can do what now, or which failure is corrected, and why it matters.}

{What this run fixed beyond the original PR, with review/evidence links.}
{Only consequential shared-surface or compatibility effects and any remaining gate.}

🧪 {Validation result and applicable QA evidence; disclose pending required checks}.
```

Aim for 150–300 words or fewer when the change is simple. Keep any inherited
`Tracking plan:`, `Status:`, issue linkage, and other parsed body fields exactly.
Use the full label normalization contract without copying labels into the body.

Replacement PR handoff comment:

```markdown
@{originalAuthor}, please recheck {specific corrected behavior} in [this review]({reviewUrl}).
{Reassignment confirmation only when it succeeded}.
```

Original PR closing comment — preserve the first line for credit tooling:

```markdown
Closing in favor of #{newPrNumber} ({newPrUrl}).

Credit to @{originalAuthor} for the original implementation. The replacement
includes {concrete fixes}; review and evidence are linked there.
```

## PR title

Build the title from the optional `prTitleTemplate` config key. Missing or empty keys keep the default format. Load these values in a shell; template and replacement values are literal data, never shell code (do not use `eval`):

```bash
PR_TITLE_TEMPLATE=$(jq -r '.prTitleTemplate // empty' "${CONFIG:-.ai/agentic.config.json}" 2>/dev/null) || PR_TITLE_TEMPLATE=""
[ -n "$PR_TITLE_TEMPLATE" ] || PR_TITLE_TEMPLATE='{prefix}({area}): {summary}{issueRef}'
TICKET_KEY_PATTERN=$(jq -r '.ticketKeyPattern // empty' "${CONFIG:-.ai/agentic.config.json}" 2>/dev/null) || TICKET_KEY_PATTERN=""
TICKET_KEY=""
if [ -n "$TICKET_KEY_PATTERN" ]; then
  TITLE_HEAD_BRANCH=${TITLE_HEAD_BRANCH:-$(git branch --show-current)}
  if TICKET_KEY_MATCHES=$(printf '%s\n' "$TITLE_HEAD_BRANCH" | grep -oE -- "$TICKET_KEY_PATTERN" 2>/dev/null); then
    TICKET_KEY=$(printf '%s\n' "$TICKET_KEY_MATCHES" | sed -n '1p')
  else
    MATCH_STATUS=$?
    [ "$MATCH_STATUS" -eq 1 ] || printf '%s\n' 'Warning: invalid ticketKeyPattern; using an empty ticket key.' >&2
  fi
fi

render_pr_title() {
  if [ -n "${5:-}" ]; then printf '%s\n' "$5"; return; fi
  jq -nr --arg template "$PR_TITLE_TEMPLATE" --arg prefix "$1" \
    --arg area "$2" --arg summary "$3" --arg issueId "${4:-}" \
    --arg ticketKey "$TICKET_KEY" '
    {prefix: $prefix, area: $area, summary: $summary,
     issue: (if $issueId == "" then "" elif ($issueId | test("^[0-9]+$"))
             then "#" + $issueId else $issueId end),
     issueRef: (if $issueId == "" then "" else " (#" + $issueId + ")" end),
     ticketKey: $ticketKey} as $values |
    $template |
    (if $values.issue == "" then
       gsub("\\[\\{issue\\}\\] ?|\\(\\{issue\\}\\) ?"; "") else . end) |
    (if $values.ticketKey == "" then
       gsub("\\[\\{ticketKey\\}\\] ?|\\(\\{ticketKey\\}\\) ?"; "") else . end) |
    gsub("\\{(?<key>prefix|area|summary|issue|issueRef|ticketKey)\\}"; $values[.key])'
}
```

Call `render_pr_title` with five quoted arguments: conventional-commit type, primary area, one-line summary, raw tracker issue id (or empty), and caller-supplied title (or empty). Capture its output for **create-pr**. Substitution happens once, so placeholder-like text inside a summary stays literal; wrapper cleanup applies only to template placeholders.

| Placeholder | Value |
|---|---|
| `{prefix}` | Conventional-commit type (`feat`, `fix`, `refactor`, …). |
| `{area}` | Primary affected area. |
| `{summary}` | One-line behavioral summary. |
| `{issue}` | The subject issue as its tracker writes it: `#123` for a numeric id, the key itself (`ENG-123`) otherwise. Empty without an issue. |
| `{issueRef}` | ` (#{issueId})` in an issue-driven run, else empty — the legacy suffix the default uses. |
| `{ticketKey}` | First match of the `ticketKeyPattern` ERE in the head branch name (case-sensitive). Empty when the key is unset or nothing matches. |

An empty `{issue}` or `{ticketKey}` is removed together with a `[]` or `()` pair wrapped directly around it and one following space. A caller-supplied title always wins. Keep the conventional-commit type as the first word after any leading reference: `om-auto-update-changelog` reads it from there.
