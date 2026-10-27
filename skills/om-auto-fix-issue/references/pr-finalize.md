# PR finalize — open or reuse, labels, markers

The single procedure for the "commit → push → open (or reuse) the PR → normalize labels → chaining reference lines" mechanics (step 8 of the bug chain, and the feature route's F4 contract check). The point is **one** implementation of PR opening + labeling, reused rather than copied, and never a second PR for work that already has one.

## Never open a duplicate PR

Before opening anything, check whether a PR already exists for this branch (or one that references `#{issueId}`) via **search-prs** / **get-pr**. If one exists, **reuse it** — push new commits to its head branch and update its body/labels — never open a second PR. Only the skill that first opens the PR owns opening it; everyone else updates that same PR. On the feature route an open PR referencing the issue means resume/continue, never a duplicate.

## Prefer the `om-open-pr` skill when installed

`om-open-pr` already implements exactly this: it commits the worktree, pushes the branch, opens a **ready-for-review** PR against `$BASE_BRANCH` (draft only with `--draft`) with the unified body template, applies the full SDLC label set (pipeline `review`, category, QA meta, one priority, one risk) through the descriptor guards with rationale comments, posts the caller's summary comment, and — in an issue-driven run — transfers the chain lock onto the PR when `--handoff` is passed, then hands the issue back and releases the issue's `in-progress` lock, emitting the `PR:` / `Issue:` chaining reference lines. When it is installed, **delegate to it** instead of re-deriving the steps: invoke `om-open-pr {issueId} {category} --handoff om-auto-review-pr` (add `--draft` only for spec-only or incomplete hand-offs; the `--handoff` keeps the PR continuously locked for the step-9 review — see `references/claim-pr.md`, chained hand-off) and capture the PR number and URL from its `PR:` reference line.

## Graceful fallback when `om-open-pr` is NOT installed

`om-open-pr` is an **optional** enhancement — a repo may install this skill without it, and it must still work. When `om-open-pr` is absent, perform the mechanics inline:

1. Commit the worktree changes with a conventional-commit subject; push the branch.
2. Open the PR via the tracker operation **create-pr** against `$BASE_BRANCH`, with a title built per §PR title below. Lead the body with the trigger and corrected behavior, then the relevant mechanism, test evidence, and any material compatibility/rollout risk; omit empty sections. Keep the linkage line (`Fixes #{issueId}`), any `LOW_CONFIDENCE` flag, and all existing parsed `Tracking plan:` / `Status:` fields. Aim for 150–300 words; keep detailed findings and QA in their linked reports.
3. Normalize labels per the section below.
4. Transfer the chain lock onto the PR — **assign-pr** `$CURRENT_USER`, `apply_label "in-progress" {prNumber}`, and the 🤖 hand-off comment naming `om-auto-review-pr` — exactly as `om-open-pr --handoff` would (`references/claim-pr.md`, chained hand-off).
5. Then hand the issue back and release the issue's `in-progress` lock per `references/claim-pr.md`.

Detect availability simply: if invoking `om-open-pr` is not possible in this environment (skill not present), take the inline path. Behavior is identical either way — the same PR, the same labels, the same lock hand-off.

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

## Ready vs draft

Open the PR **ready for review**. Draft only when the run is explicitly handing off incomplete work (a spec-only design PR, or an interrupted run).

## Label normalization

Apply labels from the config's taxonomy after opening the PR, always through the `apply_label` guard from the tracker descriptor (missing labels degrade to a logged skip; `labels.enabled: false` skips everything — note that in the report). This is the canonical label contract for every PR-opening skill; `om-open-pr` carries the same rules and the two must stay in sync.

- Apply the `review` pipeline label. New PRs always start in `review` unless the run terminated early with an explicit blocker.
- Add `skip-qa` **only** for clearly low-risk non-user-facing changes (docs-only, dependency-only, CI-only, test-only, trivial typos, single-file maintenance).
- Add `needs-qa` when the run touches UI or other user-facing behavior that requires manual exercise.
- Never add both `needs-qa` and `skip-qa`.
- Add additive category labels when they clearly apply: `bug`, `feature`, `refactor`, `security`, `dependencies`, `documentation`. Every PR carries at least one: the changelog and generated release notes group a PR by its category and print its title, so the title must read as a release-note line (a conventional title stating the user-visible effect). Pick the category from what the PR changes for users, starting from its conventional-commit type; add `security` next to `bug` or `dependencies` when the change closes a vulnerability:

  | Change | Category |
  |---|---|
  | fixes a vulnerability, an auth or data-scoping flaw, or a vulnerable dependency | `security` |
  | `feat` — new capability or public API | `feature` |
  | `fix` — incorrect behavior corrected | `bug` |
  | `refactor`, `perf`, `test`, `ci`, `build`, `chore` with no user-visible behavior change | `refactor` |
  | `deps` / `chore(deps)` — dependency bumps | `dependencies` |
  | `docs` only | `documentation` |
- Apply exactly one priority label. Infer it from the issue and the diff: outage, data loss, or a security incident → `priority-extreme`; security hardening or a release-blocking regression → `priority-high`; ordinary bug or feature → `priority-medium`; cosmetic, docs, dependency bumps, or cleanup → `priority-low`.
- Apply exactly one risk label. Infer it from the diff: changes to auth, session handling, data scoping, money, DB migrations, or shared contract surfaces, or broad cross-cutting edits → `risk-high`; an ordinary single-area change with tests → `risk-medium`; docs, dependency bumps, test-only, or isolated cleanup → `risk-low`.
- After applying the label set, post **one** consolidated rationale comment covering every applied label — never one comment per label (that spams the PR timeline and multiplies tracker API calls). Labels are still applied individually through the `apply_label` guard; only the commentary consolidates. The comment carries the standard idempotent marker, so a re-run updates it in place.
- When `qaGate` is `true`, a `needs-qa` PR will not be mergeable until QA signs off with `qa-approved`. Do not add `qa-approved` from this skill — it is earned by manual QA or the self-QA exception. State in the PR summary that manual QA is still pending.

Consolidated label-rationale comment — exactly **one** marker-idempotent comment from this skill per PR, listing only the labels actually applied: **one label per line**, each with its emoji from the map below and a full-sentence reason (drop lines for labels not applied; never compress into a `·`-concatenated one-liner). On any later label change, find the marker via **list-issue-comments** and rewrite this same comment via **update-comment** so it always describes the current label state; never post an additional per-change comment (no **update-comment** in the descriptor → post a replacement stating it supersedes the previous rationale):

```markdown
🤖 `om-auto-fix-issue` — 🏷️ label rationale

- 🔍 `review` — ready for code review.
- 🐛 `bug` — {why this category fits, one full sentence}.
- 🧪 `needs-qa` — {why manual QA is needed}.
- 🔺 `priority-high` — {why this priority}.
- 🟡 `risk-medium` — {why this risk}.
```

Label emoji map (decoration only — parsers key on the backticked label text): 🔍 `review` · ❌ `changes-requested` / `qa-failed` · 🧪 `qa` / `needs-qa` · 🚀 `merge-queue` · ⛔ `blocked` / `do-not-merge` · 🐛 `bug` · ✨ `feature` · ♻️ `refactor` · 🔒 `security` · 📦 `dependencies` · 📚 `documentation` · ⏭️ `skip-qa` · ✅ `qa-approved` · 📸 `qa-self-verified` · 🔥 `priority-extreme` · 🔺 `priority-high` · 🔹 `priority-medium` · 🔽 `priority-low` · ⚠️ `risk-high` · 🟡 `risk-medium` · 🟢 `risk-low` · 🤖 `in-progress` · ⏱️ `ci-monitoring`.

## Marker emission

End the run's final report with the chaining reference lines, one per line, exact shape — include `Issue:` only when the run has a subject issue:

```
Issue: #<issue number> (link: <full issue URL>)
PR: #<PR number> (link: <full PR URL>)
```

Chained consumers (`om-auto-review-pr`, orchestration scripts) parse these exact text markers — never rename, translate, or decorate them.

## om-auto-fix-issue specifics

- **Bug route (step 8).** Provide `om-open-pr` the implementer's final summary in the exact block shape it expects (`— PREVIOUS STEP (om-fix) said —` followed by the verbatim summary) and pass `--handoff om-auto-review-pr`. `om-open-pr` transfers the chain lock onto the PR, then hands the issue back to its original author and releases the issue's `in-progress` lock; if it ends with `Status: blocked`, it has already released the issue lock and no PR lock exists — go to the final report and state the blocker.
- **Feature route (F4).** The delegated skills own PR opening; this skill only verifies the contract — exactly one PR references the issue; ready unless a `⚠ NEEDS HUMAN CONFIRMATION` guard applies; full label set present (pipeline state, `feature` category, QA meta, one priority, one risk — re-run the normalization above on anything missing); linkage matches what ships (`Closes #{issueId}` implementing, `Refs #{issueId}` spec-only) — and passes the chaining reference lines through.
- Carry a `LOW_CONFIDENCE` flag from `om-root-cause` into the PR body so a human reviewer looks harder.
