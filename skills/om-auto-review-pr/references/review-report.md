# Review and fix loop

Use this procedure for steps 8 and 11 of `om-auto-review-pr`.

## Run the review engine

Run `om-code-review` inside the isolated worktree. Use the diff for the tree under review.
Apply its complete workflow, including `validation.commands` in order.
Check public contracts, compatibility rules, security, coverage, and effects on consumers.
Warn about protected-surface violations from `BACKWARD_COMPATIBILITY.md`. Treat an incompatible change without its required migration as a blocker.

## `om-auto-review-pr` specifics — review inputs

Use the tracker file list to identify the original scope. Include local conflict resolutions and fixes in the reviewed diff.
Read the relevant project instructions, design documents, and configured review checklist.
Include applicable diff-pattern findings and verified `INHERITED` findings. Report each defect once.
Keep the actual result for every validation command. Record the reviewed tree and relevant input changes with that evidence.

For `SPEC_ONLY`, use `references/spec-review.md` instead of the code engine. Keep fixes in the spec and its assets.

## `om-auto-review-pr` specifics — eligibility

Run autofix only when `--autofix` is present or the PR author is `CURRENT_USER`.
Otherwise, publish the review and author handoff without branch changes. State:

```text
autofix: skipped (not my PR — re-run with --autofix to fix it here)
```

## `om-auto-review-pr` specifics — one fix loop

Publish the changes-requested verdict before fixing. Then repeat this loop while an actionable finding remains:

1. Fetch the latest PR base. Resolve any conflict first inside the isolated worktree.
2. Select the next batch of findings, including inherited requests. Check existing coverage for the behavior that will change.
3. Apply the smallest complete fix. Add or update meaningful regression tests. Documentation changes do not require artificial unit tests.
4. Run the new or changed tests during implementation. Run the complete review engine on the updated local diff.
5. Use that engine's full validation gate for the pass. Do not repeat the same full gate immediately before or after it.
6. If actionable findings remain, publish them through step 10. Repeat from item 1. Otherwise, follow the publication steps below.

Fix conflicts before findings. Address CI failures after both are clear.
Refresh conflict and CI findings for the current head. Do not carry a resolved conflict as a current blocker.
Use `references/pre-review-signals.md` for current remote signals. Disclose checks that still refer to an older pushed head.

Do not add tests solely because the diff has no test filename. Inspect coverage and the changed behavior first.
Every code behavior change still requires appropriate tests. Validation at trust boundaries and safeguards against data loss must remain.

Stop only for a live claim conflict, an explicit human-confirmation gate, or a blocker that this run cannot resolve.
Examples include missing access, an incompatible contract change without a permitted migration, or a necessary decision outside the authorized scope.
Document the blocker and the next action. Make routine reversible decisions without asking.

## `om-auto-review-pr` specifics — publish fixes

For a writable same-repository head, commit fixes only after the local re-review is approvable. Then push the commits.
Use new conventional commits. Never force-push without explicit user approval.
Keep the final validation evidence tied to the tree that you push.
After the push, refresh the PR head and its CI signals. Publish the final verdict for that head.

For fork heads, follow `references/fork-pr-flow.md`. Preserve contributor commits and authorship on a replacement branch.
Create the replacement PR before closing the original. Carry over the required labels, evidence, and contributor credit.
