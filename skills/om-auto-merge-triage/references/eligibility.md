# Eligibility — gates, criteria, ranking

Every value here comes from `automerge.eligibility` (loaded in
`references/agentic-setup.md`). The defaults shown apply when a key is absent.

## Window and analyze limit

Applied in SKILL.md step 1, before any gate.

| Mode | Window (by `createdAt`) | Analyze order |
|---|---|---|
| default | the last `LOOKBACK_DAYS` days (default 30), ending now | newest first |
| `--from-oldest` | from the oldest open PR's `createdAt` to `LOOKBACK_DAYS` days later | oldest first |
| `--window <n>` | the window above shifted by `(n-1) × LOOKBACK_DAYS` days — back in time by default, forward with `--from-oldest` | as above |

Windows never overlap, so scrolling `--window 1`, `2`, `3`, … visits every open
PR once. A window past the oldest open PR (default) or past today
(`--from-oldest`) is empty: report `No open PRs in window <n>` and stop with no
next-window command.

Keep the first `ANALYZE_LIMIT` (default 100) PRs of the window in that order;
only they go through the hard gates and the label-based ranking. Filter and
sort on `createdAt` yourself, so it works on any tracker. PRs already carrying
`AUTOMERGE_LABEL` are listed as *already queued* whatever their age, in window 1 only. The report
states the window, how many open PRs fell outside it, and how many in-window PRs
were past the analyze limit, with the flag that reaches the rest (`--from-oldest`
or a larger `--lookback-days` / `--analyze-limit`).

## Hard gates

A PR must pass every gate to be proposed. Evaluate them in this order, which
runs the cheap list fields before any extra tracker call, and record the
**first** gate that fails as the PR's reason.

| # | Gate | Fails when | Reason recorded |
|---|---|---|---|
| 1 | Not queued | it carries `AUTOMERGE_LABEL` → *already queued* list; `automerge-blocked` → skipped (SKILL.md step 2, before every other gate) | `already queued` / `automerge-blocked` |
| 2 | Open | state is not open | `closed` |
| 3 | Ready | the PR is a draft | `draft` |
| 4 | Base | `baseRefName` ≠ `BASE_BRANCH` (stacked or release-branch PRs merge through their own base) | `targets <branch>` |
| 5 | No excluded label | it carries any label in `EXCLUDE_LABELS` (default `do-not-merge`, `blocked`, `qa-failed`) | `label <name>` |
| 6 | Author | **get-pr-author-association** returns a value in `EXCLUDE_ASSOCIATIONS` (default `first-time-contributor`, `outside-collaborator`, `none`), and the author is not in `TRUSTED_AUTHORS` | `author is <association>` |

Gate 6 fails closed. When the association cannot be read, or the operation is
missing from an older descriptor, the PR is rejected with
`author association unknown — re-sync the tracker descriptor`. An author in
`TRUSTED_AUTHORS` passes gate 6 without the lookup.

For a PR in the *already queued* list, re-run gates 2–6 and flag every
gate it now fails (for example, `⚠️ now labeled do-not-merge`). Never remove the
label. Report the flag and leave the decision to a human.

### Normalized author associations

**get-pr-author-association** returns one of these values, whatever the code
host calls them:

| Value | Meaning |
|---|---|
| `owner` | owns the repository |
| `member` | member of the organization or group that owns the repository |
| `collaborator` | has repository access on a user-owned repository |
| `outside-collaborator` | has repository access on an organization-owned repository without being an organization member |
| `contributor` | has had a change merged before, with no repository access |
| `first-time-contributor` | has never had a change merged in this repository |
| `none` | no association the host can report |

## Requested changes

`changes-requested` is no longer excluded by default: a nearly finished PR may
need the buddy to address a small, concrete review backlog. After the hard
gates, detect requested changes from either the pipeline label or
`reviewDecision` / latest review feedback. Require `ai-judgment` to match before
**any** tier can propose such a PR. Unreadable feedback or an unresolved major
correctness, security, design or scope objection rejects it with a cited reason.
A configured `excludeLabels` that still includes `changes-requested` continues
to reject it; judgment never overrides an explicit exclusion.

## Criteria

Each tier in `TIERS` is a list of criterion names, and a PR matches the tier when
it matches **any** of them. Only these names are valid:

| Criterion | Matches when | Data |
|---|---|---|
| `qa-approved` | the PR carries `qa-approved` | labels |
| `ai-judgment` | evidence shows a meaningful, important fix close to merge, with a bounded remaining path | current diff, linked issue, reviews, screenshots / test evidence; see `references/ai-judgment.md` |
| `security` | the PR carries any label in `SECURITY_LABELS` (default `security`) | labels |
| `small` | `changedFiles` < `SMALL_PR_FILE_LIMIT` (default 10, so 1–9 files) | `changedFiles`, else the count from **get-pr** |
| `trusted-author` | the author's login is in `TRUSTED_AUTHORS` (case-insensitive) | `author` |
| `fixes-issue` | the PR has at least one closing issue reference | `closingIssuesReferences` |
| `high-priority` | the PR carries one of the two highest labels in `labels.priority` (default `priority-high`, `priority-extreme`) | labels |

`changedFiles` that is missing or zero counts as unknown. The PR then does not
match `small`, but it can still match another criterion.

Default tiers: `[["qa-approved"], ["ai-judgment"], ["security","small"], ["trusted-author"], ["fixes-issue"]]`.
A PR lands in the **first** tier it matches. A trusted author's security fix is
therefore tier 3, not tier 4, unless it also matches an earlier tier. A PR
matching no tier is reported as `no tier matched` and is not proposed. Additional
final tiers may broaden the proposal, but never bypass the hard gates or the
requested-changes judgment.

## Ranking

Ranking runs twice: first on the label-based tiers to cut the shortlist
(SKILL.md step 4), then again on the shortlist after AI judgment (step 5). AI
judgment never runs on a PR outside the shortlist. In the first pass,
`ai-judgment` matches nothing and judgment-only candidates sort after every
tiered PR. Sort by these keys, in order:

1. **Tier**, lowest index first.
2. **Priority label**, highest first. The rank is the label's position in `labels.priority` (lowest → highest), and a PR without one sorts after every labeled PR.
3. **Risk label**, lowest first. The rank is the label's position in `labels.risk`, and a PR without one sorts after `risk-medium`.
4. **Age**, oldest `createdAt` first.

The first pass keeps the first `LIMIT` (default 20) as the shortlist. The
second pass orders whatever survives the judgment; dropped PRs are not replaced,
so the proposal can be shorter than `LIMIT`. Report how many eligible PRs fell
past the shortlist, so the next run can pick them up.

## `--pr` explain mode

With `--pr <n>`, evaluate that PR only and report each gate with ✅ or ❌, each
criterion with matched or unmatched, and the resulting tier and rank keys. Then
continue to the confirmation step as usual.
