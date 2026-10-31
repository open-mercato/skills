# om-auto-merge-triage

> 🤖 Autonomous — runs end-to-end without supervision, and stops for human confirmation before labeling

Chooses which open PRs should enter the unattended merge queue. Every open PR is checked against hard gates and placed in the first eligibility tier it matches. Each tier is then ordered by priority label, risk and age. The skill proposes the top PRs and, once a human confirms, labels them `automerge` for [om-auto-merge-buddy](om-auto-merge-buddy.md) to work.

| Default tier | PRs that… |
|---|---|
| 1 | already carry `qa-approved` |
| 2 | AI judgment finds an important, still-relevant fix close to merge, favoring older PRs with screenshots and bounded requested changes |
| 3 | carry a security label, or change fewer than 10 files |
| 4 | come from an author in `trustedAuthors` |
| 5 | fix a linked issue |

PRs from first-time contributors, outside collaborators, or authors with no association are never proposed, unless the author is in `trustedAuthors`. Drafts, PRs that target another branch, and PRs labeled `do-not-merge`, `blocked` or `qa-failed` are never proposed either. All of these rules live in `automerge.eligibility` and are set by [om-setup-agent-pipeline](om-setup-agent-pipeline.md).

AI judgment reads the current diff, issue, reviews, screenshots and test evidence to check whether the fix makes sense, addresses an important problem and has a bounded path to merge. PRs waiting at least `aiJudgment.staleAfterDays` (default `7`) get extra attention. A `changes-requested` label or review state is eligible only after a positive judgment, regardless of other tier matches; major unresolved objections keep it out. Screenshots and age never substitute for review, QA or CI approval. The proposal cites evidence, remaining work and gaps. Existing explicit exclusions and tier order are preserved; to adopt the rescue path, add `ai-judgment` to the tiers and remove `changes-requested` from exclusions.

A run without `--apply` is a dry run: it shows the proposal and stops at `⚠ NEEDS HUMAN CONFIRMATION`, so it is safe to schedule. Confirmed PRs are re-checked before labeling. Each labeled PR gets one label-rationale comment explaining its tier.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--apply <n,n,…\|all>` | No | The human confirmation. It labels these PRs, or every PR in the current proposal with `all`. |
| `--limit <n>` | No | The most PRs to propose. Default `automerge.eligibility.limit` (`10`). |
| `--pr <number>` | No | Evaluate one PR and explain every gate and tier. |

## Works with

Reads open PRs through the tracker, including the new **get-pr-author-association** operation, and its rules from `.ai/agentic.config.json` (`automerge.label`, `automerge.eligibility`, `labels.priority`, `labels.risk`). It feeds [om-auto-merge-buddy](om-auto-merge-buddy.md), and emits one `PR:` reference line per PR it labeled.

---
*Source: [`skills/om-auto-merge-triage/SKILL.md`](../../skills/om-auto-merge-triage/SKILL.md)*
