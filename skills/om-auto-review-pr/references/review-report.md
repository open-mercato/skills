# Full om-code-review pass inside the worktree

Detailed procedure for step 6 of `om-auto-review-pr`. Execute the `om-code-review` skill in the isolated worktree.

Mandatory scope and gates:

- Scope changed files with the changed-file list from the tracker operation **get-pr-diff** for `{prNumber}`
- Gather context from the repository's agent-instruction and contributing docs covering the changed areas, plus the repo-local review checklist when the config's `reviewChecklist` points at one
- Run the full validation gate: every command in `validation.commands`, in order
- Apply the full review checklist
- Apply the breaking-change checklist: exported APIs, HTTP routes and response shapes, event names, CLI flags, DB schema, config formats — honoring `BACKWARD_COMPATIBILITY.md` from the repo root when it exists (violations of its protected surfaces are Blockers and the review must explicitly WARN the user) plus any other documented compatibility rules
- Verify test coverage and cross-cutting impact

Merge findings from step 5 into the final review report. Do not duplicate the same issue twice.
