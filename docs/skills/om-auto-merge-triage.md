# om-auto-merge-triage

> 🤖 Autonomous — runs end-to-end without supervision, and stops for human confirmation before labeling

Chooses which open PRs should enter the unattended merge queue. It looks at one window of open PRs at a time: by default those opened in the last month, or the oldest month with `--from-oldest`, and `--window <n>` scrolls to the next one. Up to 100 PRs from the window are checked against hard gates, placed in the first label-based tier they match, and ordered by tier, priority label, risk and age. The top 20 form a shortlist. AI judgment runs on that shortlist only, and the result is proposed. A human then labels all of it or a selection `automerge`, for [om-auto-merge-buddy](om-auto-merge-buddy.md) to work, or scrolls to the next window.

| Default tier | PRs that… |
|---|---|
| 1 | already carry `qa-approved` |
| 2 | AI judgment finds an important, still-relevant fix close to merge, favoring older PRs with screenshots and bounded requested changes |
| 3 | carry a security label, or change fewer than 10 files |
| 4 | come from an author in `trustedAuthors` |
| 5 | fix a linked issue |

PRs from first-time contributors, outside collaborators, or authors with no association are never proposed, unless the author is in `trustedAuthors`. Drafts, PRs that target another branch, and PRs labeled `do-not-merge`, `blocked` or `qa-failed` are never proposed either. All of these rules live in `automerge.eligibility` and are set by [om-setup-agent-pipeline](om-setup-agent-pipeline.md).

AI judgment reads the current diff, issue, reviews, screenshots and test evidence to check whether the fix makes sense, addresses an important problem and has a bounded path to merge. PRs waiting at least `aiJudgment.staleAfterDays` (default `7`) get extra attention. A `changes-requested` label or review state is eligible only after a positive judgment, regardless of other tier matches; major unresolved objections keep it out. Screenshots and age never substitute for review, QA or CI approval. The proposal cites evidence, remaining work and gaps. Existing explicit exclusions and tier order are preserved; to adopt the rescue path, add `ai-judgment` to the tiers and remove `changes-requested` from exclusions.

A run without `--apply` is a dry run: it shows the proposal and stops at `⚠ NEEDS HUMAN CONFIRMATION` with three commands (label all, label selected, next window), so it is safe to schedule. Confirmed PRs are re-checked before labeling. Each labeled PR gets one label-rationale comment explaining its tier.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--apply <n,n,…\|all>` | No | The human confirmation. It labels these PRs, or every PR in the current proposal with `all`. |
| `--limit <n>` | No | Output limit: the shortlist AI judgment runs on, and the most PRs proposed. Default `automerge.eligibility.limit` (`20`). |
| `--analyze-limit <n>` | No | The most in-window PRs gated and label-ranked. Default `automerge.eligibility.analyzeLimit` (`100`). |
| `--lookback-days <n>` | No | Window length. Default `automerge.eligibility.lookbackDays` (`30`, the last month). |
| `--window <n>` | No | Scroll to the `n`-th window (default `1`), each `lookbackDays` long, without overlap. Every proposal prints the next-window command. |
| `--from-oldest` | No | Start the window at the oldest open PR and cover `lookbackDays` from there, oldest first. |
| `--pr <number>` | No | Evaluate one PR and explain every gate and tier. |

## Works with

Reads open PRs through the tracker, including the new **get-pr-author-association** operation, and its rules from `.ai/agentic.config.json` (`automerge.label`, `automerge.eligibility`, `labels.priority`, `labels.risk`). It feeds [om-auto-merge-buddy](om-auto-merge-buddy.md), and emits one `PR:` reference line per PR it labeled.

---
*Source: [`skills/om-auto-merge-triage/SKILL.md`](../../skills/om-auto-merge-triage/SKILL.md)*
