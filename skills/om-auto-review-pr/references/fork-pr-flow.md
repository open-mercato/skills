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
7. Open a replacement PR against `{baseRefName}` via **create-pr**. Copy applicable labels and verify them before closing the original, per **Labels and chain continuation** below.
8. Close the original PR only after the replacement exists with its required labels verified. Switch the active PR context to the replacement and continue the current chain. Under `--orchestrated`, opening the replacement does not end the orchestrator's work; it continues on the new PR.

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

## Moving the run handoff

A carry-forward must not strand the original's resume point. When the original
PR has a run folder — its body's `Tracking plan:` line, or a
`<paths.runs>/<run>/HANDOFF.md` on its head (written by `om-auto-create-pr`,
`om-auto-create-pr-loop` or their continue skills) — the carry branch already
contains those files, because it starts from the fetched head. Move the handoff
to the replacement before pushing:

- Rewrite `HANDOFF.md`'s `PR:` and `Branch:` fields to the replacement and the carry branch, refresh `Last updated`, and add `carried forward from #<old> by `om-auto-review-pr` autofix` under *What just happened*. Keep *Next concrete action* pointing at the first unfinished step.
- Append a UTC `carried forward to #<new>` entry to `NOTIFY.md`; never rewrite earlier entries. Leave `PLAN.md` progress as it is.
- Copy the `Tracking plan:` line into the replacement's body unchanged, so `om-auto-continue-pr` / `om-auto-continue-pr-loop` resume on the replacement instead of the closed original.
- Commit these edits with the fixes on the carry branch, and name the moved run folder in the handoff comment.

No run folder → nothing to move. Under `--orchestrated`, the orchestrator moves
its own run-level handoff when it reads `replacement=<n>`.

## Labels and chain continuation

Read the original PR's current labels through **get-pr** immediately before
transfer. If the automerge label was removed from the original, an orchestrated
run cancels the continuation and reports it. Never recreate the label from an
earlier snapshot.
Through the descriptor's guards, copy category, priority, risk, custom labels, QA requirements (`needs-qa`
/ `skip-qa`), and any configured `automerge.label` (default `automerge`) that
was present. Keep one priority and risk label, preserving the originals unless
a documented scope increase requires raising them. Preserve human hard blocks;
normalize one pipeline label to the replacement's actual state via
`set_pipeline_label` without clearing a human
block. Never copy `qa-approved`, `qa-self-verified`, `in-progress`, or
`ci-monitoring`: approval evidence and live claims do not transfer to a new head
or run. Conflicting QA requirements remain blocked. Honor `labels.enabled` and
the guards' missing-label behavior; a missing required automerge label blocks
unattended merging. Read the labels back through **get-pr** before closing the
original, and maintain the marker-idempotent label-rationale comment.

Update the active PR number, URL, head/target branch, and claim/cleanup context;
emit the replacement's exact `PR:` chaining line so every caller follows it.
Under `--orchestrated` (`references/orchestrated-mode.md`), report
`replacement=<n>` in the `RESULT:` line and hand control straight back. Do not
wait for the original author's recheck. The orchestrator moves its claim and
signal labels to the replacement and continues there in the same run.
Reassignment and the author recheck comment are advisory, not a reason to stop.
A standalone review never gains merge authority from this transfer.

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
