# Autonomous autofix flow and fix-forward loop

Detailed procedure for steps 9–10 of `om-auto-review-pr`.

## 9. Autonomous autofix flow

After posting a `changes_requested` review, **immediately proceed to fix all actionable findings** without asking the user. The om-auto-review-pr skill must be fully autonomous — it reviews, fixes, re-reviews, and iterates until the PR is merge-ready or a real blocker remains.

Only stop and ask the user in these critical situations:

- Ambiguous product or architecture decisions that could go multiple valid ways
- Missing credentials, environment access, or infrastructure failures
- Changes that would break public contracts in ways the project's compatibility rules do not allow
- Scope expansion that would fundamentally change what the PR does

For everything else — missing tests, code style issues, i18n problems, type errors, lint failures, missing metadata exports, security hardening — fix them autonomously.

## 10. Autofix and fix-forward loop

Continue inside the isolated worktree. Do not stop after the first patch. Treat autofix as an iterative loop:

0. **Unit test audit**: Before fixing code findings, check whether the PR includes unit tests for the changed behavior. If the PR has no test files in the diff (`*.test.*`, `*.spec.*`, `__tests__/*`, or the repo's equivalent), add appropriate unit tests as the first autofix action. Every behavior change, bug fix, or new feature must have corresponding test coverage — this is non-negotiable in autofix mode.
1. Convert the current review findings into a concrete fix list.
2. If the PR is currently conflicted, resolve conflicts against the latest base branch first.
3. Implement the next batch of fixable findings.
4. Run validation for the updated code:
   - Run the targeted subset of `validation.commands` relevant to the changed scope (the test and typecheck commands for the affected packages when the toolchain supports scoping; otherwise unscoped).
   - If the review findings touched shared contracts or multiple packages, expand to the full `validation.commands` gate.
5. Re-run the code review on the updated diff in the same worktree.
6. If new or remaining actionable findings exist, repeat from step 1.
7. Stop only when:
   - the re-review outcome is `approved`, or
   - a real blocker remains that cannot be resolved autonomously in the current turn.

Examples of real blockers: ambiguous product or architecture decisions that require user input; environment or infrastructure failures unrelated to the changed code; missing credentials or missing external access.

Conflict-resolution rules for autofix mode:

- Resolve conflicts only inside the isolated worktree or carry-forward branch.
- Never attempt conflict resolution in the user's active worktree.
- Always fetch the latest `{baseRefName}` before resolving conflicts.
- After conflicts are resolved, rerun the relevant validation commands and the code review before deciding the branch is ready.
- If conflict resolution introduces additional findings, continue the autofix loop instead of stopping.

For autofix mode, the goal is not "submit one fix commit". The goal is "finish the PR". Keep iterating until the code review is clean and validation passes, unless a real blocker stops progress.

### 10a. Same-repo PRs

If the PR head branch is in the main repository and you have push access, implement the fixes on the checked-out PR branch, resolve any base-branch conflicts there if needed, run the autofix loop above, then commit and push to that branch only after the latest re-review is approvable.

Rules:

- Never force-push unless the user explicitly asked for it.
- Prefer a normal follow-up commit.
- Use conventional-commit-style messages scoped to the affected area: `fix(<area>): <summary>`, `feat(<area>): <summary>`, `refactor(<area>): <summary>`, etc.
- Before pushing, ensure the latest autofix cycle included tests, the targeted validation commands, and a fresh code review on the final diff.

### 10b. Fork PRs

For fork PRs, do not wait on the original author and do not push to the contributor's branch by default. Instead, keep the fetched PR head SHA (to preserve authorship), build a `carry/pr-{prNumber}-ready` branch in the main repo, run the autofix loop there, push it, open a replacement PR crediting the original author, and close the original only after the replacement exists. The full step sequence, the autofix validation requirements, the replacement-PR requirements, and the suggested body / handoff / closing-comment templates are in `references/fork-pr-flow.md`.
