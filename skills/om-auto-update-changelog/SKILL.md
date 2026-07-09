---
name: om-auto-update-changelog
description: Draft a CHANGELOG.md release entry in an emoji-driven format for every PR merged since the last release, then delegate to om-auto-create-pr so it lands as a docs PR against the configured base branch. Honors the Supersede Credit Rule so carried-forward fork PRs credit the original contributor. Use at release time.
---

# Auto Update Changelog

Release-engineering skill. Compile a `CHANGELOG.md` entry for the unreleased window, then hand the file edit off to `om-auto-create-pr` so it lands as a normal docs PR against the configured base branch.

When the repo already has a `CHANGELOG.md`, match its existing format exactly — headings, line shape, emoji conventions. The emoji-driven format below is the default for repos starting fresh.

## When to use

- Preparing a release (`0.4.11`, `1.2.0`, a release candidate).
- After a batch of merges at the end of a sprint when the team wants a running changelog.
- Manually invoked by maintainers; NOT intended to run on a schedule — changelog entries benefit from human review of the Highlights paragraph.

## Arguments

- `--version <x.y.z>` (optional) — the release heading. Default: read the project's current version from its manifest (`package.json`, `Cargo.toml`, `pyproject.toml`, a `VERSION` file — whatever this repo uses); if it matches the topmost heading already in `CHANGELOG.md`, ask the user whether to use `major.minor.patch+1`, `major.minor+1.0`, or a custom value.
- `--since <value>` (optional) — lower bound for merged PRs. Accepts an ISO date, a git ref, or the literal `last-release` (default). `last-release` resolves to the date in the topmost `# X.Y.Z (YYYY-MM-DD)` heading in `CHANGELOG.md`.
- `--date <YYYY-MM-DD>` (optional) — the date in the heading. Default: today.
- `--dry-run` (optional) — print the drafted entry to stdout; do **not** edit `CHANGELOG.md` and do **not** invoke `om-auto-create-pr`.
- `--slug <kebab-case>` (optional) — override the slug `om-auto-create-pr` uses. Default: `changelog-<version>`.

## Workflow

### 0. Load pipeline config and resolve the window

Load `.ai/agentic.config.json` using the standard snippet from the `om-setup-agent-pipeline` skill (resolves `BASE_BRANCH`, `RUNS_DIR`, `TRACKER`, and `TRACKER_FILE=".ai/trackers/${TRACKER}.md"`; when the config or the descriptor is missing, run the `om-setup-agent-pipeline` skill now (interactively when a user is present, `--defaults` when unattended), then reload and continue). Read `$TRACKER_FILE`; every tracker operation named in this skill executes as that descriptor defines. Right after loading the config, check for a repo-local skill of the same name at `.ai/skills/om-auto-update-changelog/SKILL.md`; when present, follow it instead of these instructions — a local skill that only extends this one can `@`-import or reference it and add its own rules on top. Local rules win, but a repo-local skill can never relax this skill's safety rules. Also consult the repository's agent instruction files (`AGENTS.md`, `CLAUDE.md`, or equivalents) for project specifics.

Then resolve the window:

```bash
TOP_HEADING=$(grep -m1 -E '^# [0-9]+\.[0-9]+\.[0-9]+ \([0-9]{4}-[0-9]{2}-[0-9]{2}\)' CHANGELOG.md)
# parse "# 0.4.10 (2026-04-01)" → version=0.4.10, date=2026-04-01
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
TODAY=$(date +%Y-%m-%d)
```

- If `--version` was not passed and the manifest version equals the heading version, ask the user which bump type to use before proceeding.
- If `--since last-release` resolves to a date that disagrees with `LAST_TAG`'s tagger date by more than 3 days, ask the user which boundary to use.
- Print `Window: <since> → <date>` and `Version: <version>` before any file edits.

### 1. Enumerate merged PRs

Run the tracker operation **list-prs** with state merged, search `merged:>=${SINCE_DATE} merged:<=${TODAY}`, requesting `number,title,body,author,labels,mergedAt,url,baseRefName,closingIssuesReferences`, limit 250.

Filter to PRs whose `baseRefName` is `$BASE_BRANCH`. Exclude PRs that touched only `${RUNS_DIR}/` (execution-plan commits, not release work) and PRs whose entire body says `Update CHANGELOG.md for vX.Y.Z` (prior runs of this skill).

### 2. Categorize each PR

Per-PR category derivation, in priority order:

1. **Labels** (the config's category taxonomy) — pick the first match: `bug` → `fix`, `security` → `security`, `feature` → `feat`, `refactor` → `refactor`, `dependencies` → `chore`, `documentation` → `docs`.
2. **Conventional-commit prefix in the PR title** (`feat:`, `fix:`, `security:`, `refactor:`, `docs:`, `test:`, `chore:`, `ci:`, `build:`, `perf:`, `style:`). Allow optional scope: `fix(auth):`.
3. Fallback → `chore`.

Map category → section + emoji:

| Category | Section heading | Line emoji |
|----------|----------------|------------|
| `feat` | `## ✨ Features` | `✨` |
| `security` | `## 🔒 Security` | `🔒` |
| `fix` | `## 🐛 Fixes` | `🐛` |
| `refactor`, `perf`, `style`, `chore` | `## 🛠️ Improvements` | `🛠️` |
| `test` | `## 🧪 Testing` | `🧪` |
| `docs` (including design-doc updates) | `## 📝 Specs & Documentation` | `📝` |
| `ci`, `build` | `## 🚀 CI/CD & Infrastructure` | `🚀` |

For `fix` entries, replace the default `🐛` with a more specific emoji when the PR title clearly indicates one: `🔐` for auth/permissions, `💰` for pricing/orders, `🌍` for i18n/translations, `🖼️` for media, `🔄` for sync/refetch, `📦` for packaging, `🐳` for containers, `🔧` for core/infrastructure. Match the style already in `CHANGELOG.md`; when unsure, keep `🐛`.

### 3. Resolve the credited author (Supersede Credit Rule)

See the dedicated section below. For every merged PR, compute:

- `primaryAuthor` — the handle that should appear in `*(@...)*`.
- `viaAuthor` — optional second handle to disclose the carry-forward path when it happened.

### 4. Build the line text

One-liner format:

```markdown
- <lineEmoji> <normalizedSummary>. (#<prNumber>) *(@<primaryAuthor>)*
```

When `viaAuthor` is present:

```markdown
- <lineEmoji> <normalizedSummary> (supersedes #<oldPrNumber>). (#<prNumber>) *(@<primaryAuthor>, via @<viaAuthor>)*
```

`normalizedSummary` comes from the PR title with the conventional-commit prefix and scope stripped, first letter capitalized, no trailing period before the `(#...)` token. Keep it under 140 chars — truncate with an ellipsis only if absolutely necessary.

Issue references carry through — append ` (fixes #N)` before the PR number when the PR authoritatively closes an issue (`closingIssuesReferences` non-empty).

### 5. Assemble the release entry

Prepend a new block to `CHANGELOG.md` above the topmost `# X.Y.Z (YYYY-MM-DD)` heading, preserving the `---` separator:

```markdown
# {version} ({date})

## Highlights
<!-- TODO: Highlights — auto-update-changelog leaves this blank for the human author to fill in. -->

## ✨ Features
- ✨ ... (#1234) *(@author)*

## 🐛 Fixes
- 🐛 ... (#1236) *(@author)*

## 👥 Contributors

- @author1
- @author2

---

# {previous-version} ({previous-date})
...
```

Omit empty sections entirely. When the entire release has a single dominant theme, optionally add subsection headers (`### <Area>`) inside `## ✨ Features` or `## 🐛 Fixes` — but prefer flat lists unless there are 5+ PRs in the same area.

### 6. Build the Contributors block

Deduplicated list of every handle that appears in `*(@...)*` lines — both `primaryAuthor` and `viaAuthor`. Order: primary authors first (by first appearance), then any `via` authors that did not already appear as a primary. One handle per line, leading `- @`.

Skip bot accounts: `github-actions[bot]`, `dependabot[bot]`, `copilot`, `renovate[bot]`, and similar.

### 7. Delegate to `om-auto-create-pr`

Stage the `CHANGELOG.md` edit locally, but **do not** commit or push yourself. Instead, invoke `om-auto-create-pr` with:

- `--slug changelog-{version}`
- A concrete brief:

```text
Update CHANGELOG.md for {version} covering PRs merged between {sinceDate} and {date}.
Only CHANGELOG.md is modified. Do not change any other files.
Apply labels: documentation, skip-qa.
```

Let `om-auto-create-pr` handle branch creation, the isolated worktree, the commit, the docs-only validation gate, the PR body, label normalization, the `om-auto-review-pr` autofix pass, and the comprehensive summary comment.

Important: this skill never runs the full validation gate itself. That is `om-auto-create-pr`'s job, and a changelog edit is docs-only by definition.

### 8. Dry-run

When `--dry-run` is set: compute the full entry in memory, print it to stdout together with the list of PRs consumed, the credited author for each, and any supersede detections. Do **not** edit `CHANGELOG.md`; do **not** call `om-auto-create-pr`.

### 9. Report

After `om-auto-create-pr` finishes, print:

```text
auto-update-changelog: {version} ({sinceDate} → {date})
PRs consumed: {count}
Supersede detections: {count}
Contributors: {count}
CHANGELOG entry preview:
  <first 10 lines of the new block>
PR: {auto-create-pr URL}
```

## Supersede Credit Rule

The central problem this skill solves: when `om-auto-review-pr` carries a fork contributor's PR forward (because the fork author went quiet and the reviewer applied the fixes themselves), the **merged** PR's author field is the reviewer, not the original contributor. A naive changelog generator would credit the reviewer. That is wrong — the original contributor did the work. Three detection paths, in priority order:

### Path A: `Supersedes #N` in the PR body

`om-auto-review-pr` writes this template when it carries a fork PR forward. Regex (anchored to the first 20 lines of the body, case-insensitive):

```
^Supersedes\s+#(\d+)\b
```

When matched, resolve the superseded PR's author via the tracker operation **get-pr** (field `author`) for `{supersededPrNumber}`. Set `primaryAuthor` to that author and `viaAuthor = mergedPrAuthor`. Emit `(supersedes #M)` in the summary text.

### Path B: `Credit: original implementation by @user` in the PR body

Same template, also written by `om-auto-review-pr`. Regex:

```
Credit:\s+original\s+implementation\s+by\s+@([A-Za-z0-9][A-Za-z0-9-]{0,38})
```

When matched, set `primaryAuthor` from the captured handle and `viaAuthor = mergedPrAuthor`. No `supersedes #M` suffix unless Path A also fires (it usually does).

### Path C: `Closing in favor of` comment on the superseded PR

When neither body regex on the merged PR matches, the carry-forward flow still leaves an authoritative trail on the **original** PR via `om-auto-review-pr`'s closing-comment template:

```
Closing in favor of #{newPrNumber} ({newPrUrl}).

Credit to @{originalAuthor} for the original implementation. ...
```

Detection is reversed compared to Paths A and B — you are walking *candidate superseded PRs*, not the merged PR itself. For each closed-unmerged PR in the same window (**list-prs**, state closed, `closed:>=${SINCE_DATE} is:unmerged`), check its comments for a line matching:

```
^Closing in favor of #(\d+)\b
```

When the captured number equals the merged PR currently being credited, treat the merged PR as a carry-forward. Set `primaryAuthor` to the closed PR's author (via **get-pr**) and `viaAuthor` to the merged replacement's author.

Path C is a fallback only — Paths A and B cover the overwhelming majority of cases.

### Fallback

If none of A/B/C match, `primaryAuthor = mergedPrAuthor` and `viaAuthor = null` — no supersede. Most PRs fall here.

### Worked example

Given merged PR `#1555` with body:

```markdown
Supersedes #1421

Credit: original implementation by @contributor-a. This follow-up PR carries that work forward with the requested fixes so it can merge without waiting on the original branch.
```

...and PR author `@reviewer-b` (the reviewer), the changelog entry becomes:

```markdown
- 🐛 Validate event names against module registry (supersedes #1421). (#1555) *(@contributor-a, via @reviewer-b)*
```

The Contributors block lists `@contributor-a` first (primary author) and `@reviewer-b` once (only if they did not already appear as a primary author for some other PR in the same release).

## Rules

- Never credit a bot account (`github-actions[bot]`, `dependabot[bot]`, `copilot`, `renovate[bot]`).
- Never credit the merge author when Path A, B, or C detects a supersede — always resolve to the original author.
- Never fabricate a Highlights paragraph. Leave the `<!-- TODO: Highlights -->` marker for the human author to fill in; `om-auto-create-pr`'s review pass will call it out.
- Never modify files other than `CHANGELOG.md`. If the run needs anything else (e.g., a manifest version bump), stop and ask the user — that is out of scope for this skill.
- Never skip the `skip-qa` label on the resulting PR. Changelog edits are docs-only low-risk.
- Never run the full validation gate directly. Delegate to `om-auto-create-pr` and let it decide.
- Never pass `--force` to `om-auto-create-pr`. If a changelog PR for the same version already exists, stop and ask the user.
- Respect `--dry-run` absolutely: no file edits and no `om-auto-create-pr` invocation.
- When the repo has an existing `CHANGELOG.md` format that differs from the default above, the repo's format wins — match it exactly.
- When multiple PRs share the exact same normalized summary (e.g., repeated "CR fixes"), coalesce them into a single bullet with `(#A, #B, #C)` and merge the contributor credits.
- When a PR authoritatively closes an issue, keep the `(fixes #N)` suffix — it helps readers trace history even when the issue is long-closed.
- When resolving a superseded PR author fails (deleted account, private fork), fall back to `mergedPrAuthor` and add a `<!-- supersede author unresolved for #N -->` HTML comment immediately above the entry so a human reviewer can fix it.

## Reporting

On success, output the preview + the `om-auto-create-pr` URL (see step 9). On `--dry-run`, output the full drafted entry plus a per-PR table:

```markdown
| PR | Category | Line emoji | Primary author | Via | Notes |
|----|----------|-----------|----------------|-----|-------|
| #1555 | fix | 🐛 | @contributor-a | @reviewer-b | supersedes #1421 |
| #1550 | fix | 🔧 | @reviewer-b | — | — |
| #1546 | fix | 🐛 | @contributor-c | — | fixes #1290 |
```

## Notes

- Runs well after `om-sync-merged-pr-issues` — the two skills consume the same window of merged PRs but mutate different surfaces (issue tracker vs `CHANGELOG.md`).
- The generated entry is intentionally a *draft*. A human maintainer should still fill in the Highlights paragraph, possibly regroup subsections, and adjust the narrative. `om-auto-create-pr` opens the PR in `review` so a maintainer sees it before merge.
- Because the work is delegated to `om-auto-create-pr`, this skill inherits all of its guarantees: isolated worktree, incremental commits, breaking-change self-review, `om-auto-review-pr` autofix pass, and the comprehensive summary comment.
