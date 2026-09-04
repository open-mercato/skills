# Fork PRs — carry-forward replacement flow (step 11)

The autofix branch `om-auto-review-pr` takes when the PR head branch lives in a
fork instead of the main repository. For fork PRs, do not wait on the original
author and do not push to the contributor's branch by default. (Same-repo PRs
are covered in `references/review-report.md`.)

Instead:

1. Keep the current worktree based on the fetched PR head SHA so the original commits and authorship are preserved.
2. Create a new branch in the main repository, for example `carry/pr-{prNumber}-ready`.
3. Implement the fixes there.
4. Resolve any conflicts against `{baseRefName}` on that carry-forward branch.
5. Run the autofix loop from `references/review-report.md` until the branch is re-reviewed as approvable or a real blocker remains.
6. Commit and push the new branch to `origin`.
7. Open a replacement PR against `{baseRefName}` via the tracker operation **create-pr**.
8. Close the original PR only after the replacement PR exists successfully.

Validation requirements for autofix mode:

- On every cycle, run the test commands from `validation.commands` for the changed scope.
- On every cycle, run the typecheck (or equivalent static-check) commands from `validation.commands` for the changed scope.
- Before the final push, run at least one last test pass and one last static-check pass against the final branch state.
- If the original review required broader workspace validation, rerun the broader validation before opening or updating the replacement PR.

Replacement PR requirements:

- Use conventional-commit-style PR title scoped to the affected module or area: `fix(<area>): <summary>`, `feat(<area>): <summary>`, `refactor(<area>): <summary>`, etc. Where `<area>` is the primary affected module or package (e.g., `auth`, `api`, `ui`, `shared`)
- Include the original PR link
- Credit the original PR author explicitly
- State that the new PR carries forward the original work plus the requested fixes
- Mention that the branch was re-reviewed after autofix and is intended to be merge-ready
- Reassign the replacement PR to the original PR author when possible, and leave a handoff comment inviting them to do the next recheck from the carried-forward branch

Replacement PR body — this is the canonical explanation of the carried work,
so describe the resulting behavior instead of saying only “original changes.”
Keep the supersede line in the first 20 lines and the exact credit prefix.

```markdown
Supersedes #{prNumber}

Credit: original implementation by @{originalAuthor}.

{Who can do what now, or which failure is corrected, and why it matters.}

{What this run fixed beyond the original PR, with review/evidence links.}
{Only consequential shared-surface or compatibility effects and any remaining gate.}

🧪 {Validation result and applicable QA evidence; disclose pending required checks}.
```

Aim for 150–300 words or fewer when the change is simple. Keep any inherited
`Tracking plan:`, `Status:`, issue linkage, and other parsed body fields exactly.
Use the full label normalization contract without copying labels into the body.

Replacement PR handoff comment:

```markdown
@{originalAuthor}, please recheck {specific corrected behavior} in [this review]({reviewUrl}).
{Reassignment confirmation only when it succeeded}.
```

Original PR closing comment — preserve the first line for credit tooling:

```markdown
Closing in favor of #{newPrNumber} ({newPrUrl}).

Credit to @{originalAuthor} for the original implementation. The replacement
includes {concrete fixes}; review and evidence are linked there.
```
