---
name: approve-merge-pr
description: Approve (submit an approving review) and squash-merge a GitHub PR given only its number, refusing when the QA gate or a blocking label forbids it. Optionally file a follow-up issue at the same time. Use when the user says "approve and merge PR 123", "ship PR 123", or gives a PR number with intent to merge.
---

# Approve & Squash-Merge PR

Given a single PR number, submit an approving review and then squash-merge it. Optionally, if the user supplies a follow-up, file a tracking issue in the same run. Convenience skill for the code-review process — keep it fast and low-friction, but never faster than the merge gates: this skill is one of the QA gate's enforcement points.

## Inputs

- **PR number** (required) — e.g. `2805`.
- **Repo** (optional) — defaults to the repo of the current working directory. If not in a git repo, ask which `owner/repo`.
- **Follow-up** (optional) — see [Optional follow-up](#optional-follow-up). Triggered by phrasing like
  "…and add a follow-up", "with follow-up <text>", "follow-up: <ask>", or a pasted PR/comment link alongside the merge request.

## Steps

0. **Load pipeline config.** Load `.ai/agentic.config.json` using the standard snippet from the `setup-agent-pipeline` skill. If the file is missing, stop and tell the user to run `setup-agent-pipeline` first. This skill uses:
   ```bash
   LABELS_ENABLED=$(jq -r '.labels.enabled // false' "$CONFIG")
   QA_GATE=$(jq -r '.qaGate // false' "$CONFIG")
   ```
   All label names below come from the config's label taxonomy.

1. **Resolve the PR and sanity-check it.** Run:
   ```bash
   gh pr view <number> --json number,title,state,isDraft,mergeable,mergeStateStatus,reviewDecision,labels,headRefName,url,author
   ```
   - If `state != OPEN`, stop and report (already merged/closed).
   - If `isDraft == true`, stop and ask whether to mark ready first (`gh pr ready <number>`). Don't merge a draft silently.
   - If `mergeable == "CONFLICTING"`, stop and report the conflict — do not attempt the merge.
   - Note `title`, `url`, and `author.login` for the summary and any follow-up.

2. **Enforce label blocks and the QA gate.** Skip this step only when `labels.enabled` is `false` (then note in the final report that label gates were not evaluated). Otherwise, inspect the PR's labels:
   - **Hard blocks — refuse to merge and report the blocker:**
     - `qa-failed` — manual QA failed; the PR must not merge until QA re-runs and the label is cleared.
     - `do-not-merge` — explicit hard block.
     - `blocked` — blocked by a dependency.
   - `qa` (pipeline) — manual QA is in progress right now; stop and report. Do not merge under an active tester.
   - **QA-approval gate** (when `QA_GATE` is `true`): a PR carrying `needs-qa` without `qa-approved` is **not mergeable**, even when review and CI are green and even though the user asked to ship it. Refuse, and explain how to satisfy the gate:
     - a QA reviewer tests the PR and applies `qa-approved`, or
     - the self-QA exception: an engineer checks the PR out, runs it locally, exercises the affected flow, attaches proof (screenshot or a written account of what was exercised), then applies both `qa-approved` and `qa-self-verified`, or
     - `skip-qa` is applied when the change is genuinely low-risk and non-user-facing (never combined with `needs-qa`).
     Refer to QA reviewers by role, never by handle. When `QA_GATE` is `false`, `needs-qa` without `qa-approved` is advisory: mention it in the report and proceed.
   - If the PR carries both `needs-qa` and `skip-qa`, flag the inconsistency and ask the user which one is right before proceeding.
   - If `changes-requested` is present, point it out and confirm intent before proceeding — the approving review may supersede the review state, but the label suggests unresolved feedback.

3. **Approve.** Submit an approving review:
   ```bash
   gh pr review <number> --approve --body "Approved."
   ```
   - If `gh` rejects self-approval (you authored the PR), report that GitHub forbids approving your own PR and ask whether to proceed straight to merge anyway.

4. **Squash-merge.** Default flags:
   ```bash
   gh pr merge <number> --squash
   ```
   - Add `--auto` instead of a plain merge only if the user asked to merge once checks pass, or if required checks are still running (`mergeStateStatus == "BLOCKED"` / `"BEHIND"` due to pending CI).
   - Add `--delete-branch` only if the user asks to delete the branch.
   - If the merge is blocked by required reviews/checks beyond what approval satisfies, report the `mergeStateStatus` and stop — don't force anything.

5. **Optional follow-up** (only if one was provided — see below).

6. **Report** the outcome: PR title, number, url, whether it merged now or is queued for auto-merge, any label gates that were checked (or skipped), and the follow-up issue URL if one was created.

## Optional follow-up

If the user provides a follow-up alongside the merge request, file it **after** the merge step succeeds (so the issue can reference a merged PR). Two shapes are supported:

- **Free-text ask** — the user types the actionable item inline (e.g. "follow-up: extract the data-scoping check into a shared helper and reuse it"). Build the issue directly:
  - **Title:** concise restatement of the ask.
  - **Assignee:** the @-mention in the ask if present, otherwise the PR author (`author.login`).
  - **Body:** a `## Follow-up from #<number>` header linking the PR, the ask quoted verbatim, an `### Acceptance criteria` checklist, and a `Related: #<number>` footer.
  - **Labels:** infer from the PR (mirror its category labels; only apply labels that exist in the repo, and skip labels entirely when `labels.enabled` is `false`).
  - Create it:
    ```bash
    gh issue create --repo <owner>/<repo> --title "<title>" --assignee <login> --label <labels> --body "<body>"
    ```
- **A PR or comment link** — hand off to the `followup-issue-from-pr` skill, which extracts the actionable comment and applies the same assignee rule (@-mention wins, else PR author). Don't duplicate its logic here.

Report the created issue URL in the final summary. If no follow-up was provided, skip this entirely.

## Rules

- One PR per invocation unless the user lists several.
- Never merge past the QA gate: while `qaGate` is `true`, a `needs-qa` PR without `qa-approved` is not mergeable — refuse and explain how to satisfy the gate (QA sign-off, the evidenced self-QA exception, or `skip-qa` where genuinely appropriate). Do not merge until the labels change.
- `qa-failed`, `do-not-merge`, and `blocked` are hard blocks — never merge over them; surface the blocker instead.
- Never use `--admin` to bypass branch protection unless the user explicitly asks.
- Never force-merge a conflicting or failing PR; surface the blocker instead.
- Pass the repo through with `--repo <owner>/<repo>` on every `gh` call when the user specified one or you're not inside the target repo.
- Follow-up assignee rule matches `followup-issue-from-pr`: an explicit @-mention wins; otherwise the PR author.
- Create the follow-up only after a successful merge (or successful `--auto` queue), so it references real merged work.
