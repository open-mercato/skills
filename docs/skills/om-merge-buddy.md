# om-merge-buddy

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

Scans every open pull request through the configured tracker and answers one question: what can merge right now? It classifies merge readiness from labels, review decisions, CI status, and mergeability, then reports three buckets — ready to merge, almost ready, and blocked — with the blockers spelled out. It is strictly read-only: it never merges, edits, comments, or labels anything. Use it to triage the PR queue before deciding what to ship.

## Parameters

This skill takes no parameters.

## Works with

Reads open PRs and their check status through the tracker and produces a classified report only. When you pick a PR to ship, it hands off to [om-approve-merge-pr](om-approve-merge-pr.md), which re-checks the same gates before actually merging.

---
*Source: [`skills/om-merge-buddy/SKILL.md`](../../skills/om-merge-buddy/SKILL.md)*
