# Fork PRs — carry-forward replacement flow (step 11)

The autofix branch `om-auto-review-pr` takes when the PR head branch lives in a
fork instead of the main repository. For fork PRs, do not wait on the original
author and do not push to the contributor's branch by default. (Same-repo PRs
are covered in `references/review-report.md`.)

## Reserve and publish one replacement

1. Read the original's state, head and base via **get-pr**. An authorized run started on the replacement resolves the original from its `Supersedes #N` line. Verify that the original has a fork head before acting on the relationship. For an open original, acquire its claim (`references/claim-pr.md`) before discovery and publication in standalone mode. In orchestrated mode, verify the original claim delegated by the parent before publication. If it is missing, limit discovery to read-only checks and report what the parent must claim. For a closed original, check the existing disposition without claiming it. A review-only invocation can report an unfinished handoff. A PR body or comment supplies a lookup hint and cannot authorize closure.
2. Before creating, use **list-prs** to look up the exact `carry/pr-{originalPrNumber}-ready` head and original base in the target repository. Also use **search-prs** and the original's handoff comments to find existing replacements on older carry branches. Use **get-pr** to verify the candidate's target repository and base, same-repository head, exact `Supersedes #N` line in the first 20 lines, original author credit and ancestry from the original head. Reuse a single valid open candidate. If multiple candidates claim the work, the lookup is inconclusive, or the original head advanced beyond the carried history, report the links and stop creation. A merged candidate needs separate reconciliation. A closed candidate must not be reopened by a retry.
3. For a new replacement, use `carry/pr-{originalPrNumber}-ready` in the target repository. Set `TITLE_HEAD_BRANCH` from the original's `headRefName` for title extraction. Resume a verified carry branch left by an interrupted push, preserving its commits. Start from the fetched original head otherwise. Resolve base conflicts, apply fixes and validate through `references/review-report.md`. Verify the original claim before pushing and use a normal fast-forward update. Verify the claim and recheck for a replacement immediately before **create-pr**. After an ambiguous create response, look up the same head/base pair. Retry only when the tracker confirms absence or guarantees uniqueness for that pair. Never choose a new branch name to bypass a collision.
4. Read the published replacement back before modifying it. In standalone mode, acquire and verify its claim under the existing claim protocol. In orchestrated mode, the parent owns claim writes. Use the existing fork label-transfer exception for newly published replacements, then return the verified replacement number in `RESULT:` if the parent has not delegated both claims. Report the approval status of the published head as observed, with closure pending. Defer metadata changes, review of the replacement, and closure until the parent has verified and delegated both claims. If either claim is busy, report the pending handoff and release only claims this run acquired. Move the tracked handoff, copy and verify labels as below, and review the final head. Keep the durable publication link even when a gate is pending or an invocation stops.

## Reconcile and verify closure

PR creation and closure are separate tracker writes. The stable head/base pair lets a retry recover a publication even if the run stopped before recording its number. The replacement body links the original from creation. Post or update the original's handoff note once publication is verified and the claim and operator allow the write. Use `Replacement pending: #N (URL).` for its first line while closure is gated. Record the original head and base, any operator-imposed closure condition, and the remaining action. If the original must stay untouched, keep the pending note on the claimed replacement. If neither permits a write, report the blocker and both links in the run summary. Upsert by the stable comment marker `<!-- om-auto-review-pr:fork-handoff:{originalPrNumber}:{newPrNumber} -->`.

An authorized run entering from either PR reconciles this handoff even when there are no new commits to review. Hold both verified claims through the closure attempt. In orchestrated mode, verify the parent reservation and both delegated claims before each tracker mutation or push. If the parent has not delegated both claims, report closure pending. Confirm from fresh tracker reads that the original is still open and unmerged, its reviewed head/base are still the carried ones, and the replacement is open on that base with its final head approved and the required labels verified. Carry forward any recorded operator restriction until its condition is proven satisfied or the operator lifts it. Honor applicable human vetoes and preserve QA and CI requirements for merging. If a gate remains, keep the original open, record the concrete blocker and report the replacement as published with closure pending.

When closure is authorized and all closure gates pass, update the original's note to the **Original PR closing comment** below. Recheck both claims and both PRs' state and head/base before **close-pr**. Read both PRs back. Report completion only after **get-pr** confirms the original closed without a merge and the replacement remains the verified successor. If the write fails or its outcome is unknown, re-read before any retry, keep the note and report the precise pending state. If the original is already closed without a merge and has this replacement's closing note, the handoff is complete. If it merged or was closed for a different reason, report the conflict without overwriting that disposition. Older descriptors without **close-pr** keep the original open and report the upgrade needed.

Continue on the same replacement when the current invocation can clear a pending gate. Before returning or releasing an owned claim, make the pending closure visible in the tracker note and the run summary. A later run resumes the recorded pair instead of publishing another successor.

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
contains those files, because it starts from the fetched head. Once the
replacement is verified and claimed, read the metadata from its published head
and reconcile only missing changes:

- Set `HANDOFF.md`'s `PR:` and `Branch:` fields to the replacement and the carry branch. When either field changes, refresh `Last updated` and record the carry-forward under *What just happened*. Preserve subsequent progress and the first unfinished step.
- Append the UTC `carried forward to #<new>` entry to `NOTIFY.md` only if that replacement number has no carry-forward entry. Preserve earlier entries and plan progress.
- Copy the original `Tracking plan:` line into the replacement's body only if missing. If it points to a different plan, report the mismatch before overwriting anything.
- Commit and push only when the tracked files changed. Re-read the published head and verify approval for that SHA before closing the original. If the metadata is already correct, leave the files and timestamp alone and reuse valid approval evidence on the unchanged head. Name the moved run folder in the handoff comment.

No run folder → nothing to move. Under `--orchestrated`, the orchestrator moves
its own run-level handoff when it reads `replacement=<n>`.

## Labels and chain continuation

Read the original PR's current labels through **get-pr** immediately before
transfer. If neither the configured queue label nor `automerge-now` remains
on the original, an orchestrated run cancels the continuation and reports it.
Never recreate an authorization label from an earlier snapshot. Before any
policy-label write, compare fresh original and replacement labels. If combining
them would create an `automerge-now` + `automerge-force` pair that neither PR
already carries, stop before closing the original and report the need for
explicit authorization.
Through the descriptor's guards, copy category, priority, risk, custom labels, QA requirements (`needs-qa`
/ `skip-qa`), and the fresh configured queue and policy labels (`automerge-now`,
`automerge-force`, `automerge-prepare`). Keep one priority and risk label, preserving the originals unless
a documented scope increase requires raising them. Preserve human hard blocks;
normalize one pipeline label to the replacement's actual state via
`set_pipeline_label` without clearing a human
block. Exclude `qa-approved`, `qa-self-verified`, `in-progress`,
`ci-monitoring` and all `automerge-signal-*` labels from transfer, including
from the custom label set. Evidence and live claims are scoped to the
original head and run. Conflicting QA requirements remain blocked. Honor `labels.enabled` and
the guards' missing-label behavior; an unverified queue authorization or prepare-only transfer blocks
unattended merging. Read the labels back through **get-pr** before closing the
original, and maintain the marker-idempotent label-rationale comment.

Update the active PR number, URL, head/target branch, and claim/cleanup context;
emit the replacement's exact `PR:` chaining line so every caller follows it.
Under `--orchestrated` (`references/orchestrated-mode.md`), report
`replacement=<n>` in the `RESULT:` line and hand control straight back. Do not
wait for the original author's recheck. The orchestrator claims the
replacement and publishes its signals from freshly verified replacement
evidence, then continues there in the same run.
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

<!-- om-auto-review-pr:fork-handoff:{originalPrNumber}:{newPrNumber} -->
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
