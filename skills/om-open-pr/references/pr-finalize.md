# PR finalize — open or reuse, labels, summary comment, markers

The single procedure for the "commit → push → open (or reuse) the PR → normalize labels → summary comment → chaining reference lines" mechanics (steps 3–7 of the skill body). The point is **one** implementation of PR opening + labeling, reused rather than copied, and never a second PR for work that already has one.

## Never open a duplicate PR

Before opening anything, check whether a PR already exists for this branch (or, in an issue-driven run, one that references the issue) via **search-prs** / **get-pr**. If one exists, **reuse it** — push new commits to its head branch and update its body/labels — never open a second PR. Only the skill that first opens the PR owns opening it; everyone else updates that same PR.

## This skill IS the shared implementation

`om-open-pr` is the canonical PR-opening implementation the other pipeline skills prefer to delegate to (their own `pr-finalize.md` files carry an inline fallback for when it is not installed). Behavior must stay identical either way — the same PR, the same labels — so keep this file in sync with the label and body contract in `om-auto-create-pr`. Callers invoke it as:

- Issue-driven run (an `{issueId}` is in scope): `om-open-pr {issueId} {category}` (plus `--plan <path>` when an execution plan exists, `--draft` for a spec-only design PR); the caller captures the PR number and URL from the emitted `PR:` reference line.
- Brief- or spec-driven run (no issue): invoke without `{issueId}`; the issue-handback and lock-release parts don't apply.

## Ready vs draft

Open the PR **ready for review**. Draft only when the run is explicitly handing off incomplete work (a spec-only design PR, or an interrupted run leaving `Status: in-progress`).

## PR body

Use the template in `references/pr-body-template.md` — a title built per §PR title below (`--title` wins when given), filled from the previous step's summary. Include the `Tracking plan:` / `Status:` lines and the `## Progress` section only when `--plan` was given — then they MUST be present so `om-auto-continue-pr` can resume. Flip `Status:` to `complete` once all Progress steps are checked.

## PR title

Build the title from the optional `prTitleTemplate` config key. When the key is absent the title keeps the default format, unchanged:

```bash
PR_TITLE_TEMPLATE=$(jq -r '.prTitleTemplate // empty' "${CONFIG:-.ai/agentic.config.json}" 2>/dev/null)
[ -n "$PR_TITLE_TEMPLATE" ] || PR_TITLE_TEMPLATE='{prefix}({area}): {summary}{issueRef}'
TICKET_KEY_PATTERN=$(jq -r '.ticketKeyPattern // empty' "${CONFIG:-.ai/agentic.config.json}" 2>/dev/null)
TICKET_KEY=""
if [ -n "$TICKET_KEY_PATTERN" ]; then
  TICKET_KEY=$(git branch --show-current | grep -oE -- "$TICKET_KEY_PATTERN" | head -n 1)
fi
```

| Placeholder | Value |
|---|---|
| `{prefix}` | Conventional-commit type (`feat`, `fix`, `refactor`, …). |
| `{area}` | Primary affected area. |
| `{summary}` | One-line behavioral summary. |
| `{issue}` | The subject issue as its tracker writes it: `#123` for a numeric id, the key itself (`ENG-123`) otherwise. Empty without an issue. |
| `{issueRef}` | ` (#{issueId})` in an issue-driven run, else empty — the legacy suffix the default uses. |
| `{ticketKey}` | First match of the `ticketKeyPattern` ERE in the head branch name (case-sensitive). Empty when the key is unset or nothing matches. |

An empty `{issue}` or `{ticketKey}` is removed together with a `[]` or `()` pair wrapped directly around it and one following space, so `[{issue}] {prefix}…` never renders `[] `. A caller-supplied title always wins. Keep the conventional-commit type as the first word after any leading reference: `om-auto-update-changelog` reads it from there.

## Label normalization

Apply labels from the config's taxonomy after opening the PR, always through the `apply_label` guard from the tracker descriptor (missing labels degrade to a logged skip; `labels.enabled: false` skips everything — note that in the closing issue comment). This is the canonical label contract for every PR-opening skill; `om-auto-create-pr`'s `references/pr-finalize.md` carries the same rules and the two must stay in sync.

- Apply the `review` pipeline label. New PRs always start in `review` unless the run terminated early with an explicit blocker.
- Add `skip-qa` **only** for clearly low-risk non-user-facing changes (docs-only, dependency-only, CI-only, test-only, trivial typos, single-file maintenance).
- Add `needs-qa` when the change introduces user-facing behavior that must be manually exercised.
- Never add both `needs-qa` and `skip-qa`.
- Add additive category labels when they clearly apply: `bug`, `feature`, `refactor`, `security`, `dependencies`, `documentation` — for this skill, the `{category}` argument (or the inferred one) drives it.
- Apply exactly one priority label. Infer it from the change: outage, data loss, or a security incident → `priority-extreme`; security hardening or a release-blocking regression → `priority-high`; ordinary bug or feature → `priority-medium`; cosmetic, docs, dependency bumps, or cleanup → `priority-low`.
- Apply exactly one risk label. Infer it from the diff: changes to auth, session handling, data scoping, money, DB migrations, or shared contract surfaces, or broad cross-cutting edits → `risk-high`; an ordinary single-area change with tests → `risk-medium`; docs, dependency bumps, test-only, or isolated cleanup → `risk-low`.
- After applying the label set, post **one** consolidated rationale comment covering every applied label — never one comment per label (that spams the PR timeline and multiplies tracker API calls). Labels are still applied individually through the `apply_label` guard; only the commentary consolidates. The comment carries the standard idempotent marker, so a re-run updates it in place.
- When `qaGate` is `true`, a `needs-qa` PR will not be mergeable until QA signs off with `qa-approved`. Never add `qa-approved` from this skill — it is earned by manual QA (or the explicit self-QA sign-off in `om-auto-qa-pr`). When `QA_GATE` is `true` and you applied `needs-qa`, state in the closing comment that the merge waits for `qa-approved`.

Consolidated label-rationale comment — exactly **one** marker-idempotent comment from this skill per PR, listing only the labels actually applied: **one label per line**, each with its emoji from the map below and a full-sentence reason (drop lines for labels not applied; never compress into a `·`-concatenated one-liner). On any later label change — a pipeline transition, a priority/risk adjustment — find the marker via **list-issue-comments** and rewrite this same comment via **update-comment** so it always describes the current label state; never post an additional per-change comment (when the descriptor lacks **update-comment**, post a replacement stating it supersedes the previous rationale):

```markdown
🤖 `om-open-pr` — 🏷️ label rationale

- 🔍 `review` — ready for code review.
- ✨ `feature` — {why this category fits, one full sentence}.
- 🧪 `needs-qa` — {why manual QA is needed}.
- 🔺 `priority-high` — {why this priority}.
- 🟡 `risk-medium` — {why this risk}.
```

Label emoji map (decoration only — parsers key on the backticked label text): 🔍 `review` · ❌ `changes-requested` / `qa-failed` · 🧪 `qa` / `needs-qa` · 🚀 `merge-queue` · ⛔ `blocked` / `do-not-merge` · 🐛 `bug` · ✨ `feature` · ♻️ `refactor` · 🔒 `security` · 📦 `dependencies` · 📚 `documentation` · ⏭️ `skip-qa` · ✅ `qa-approved` · 📸 `qa-self-verified` · 🔥 `priority-extreme` · 🔺 `priority-high` · 🔹 `priority-medium` · 🔽 `priority-low` · ⚠️ `risk-high` · 🟡 `risk-medium` · 🟢 `risk-low` · 🤖 `in-progress` · ⏱️ `ci-monitoring`.

## Summary comment

### `om-open-pr` specifics — caller-provided summary

The caller owns the summary. When it supplies one (`--summary-file` or the
PREVIOUS STEP block), retain its marker and machine fields, and publish a
40–100 word outcome/handoff comment: what this run changed, actual state,
verification result or evidence link, next action, and a link to the PR body.
Preserve all actionable findings and material limits even if that needs more
space. Move repeated scope, test inventories and enduring risks into the body;
do not repeat label rationale. If no summary exists, skip it; do not invent one.

Find the caller's marker and update it via **update-comment**; create via
**comment-pr** only when absent. Use a body file to preserve formatting. Do not
publish a caller's review-complete summary before its review has happened, claim
unreached completion or include secrets.

## Marker emission

End the run's final report with the chaining reference lines, one per line, exact shape — include `Issue:` only when the run has a subject issue:

```
Issue: #<issue number> (link: <full issue URL>)
PR: #<PR number> (link: <full PR URL>)
```

Chained consumers (`om-auto-review-pr`, `om-auto-qa-pr`, orchestration scripts) parse these exact text markers — never rename, translate, or decorate them.
