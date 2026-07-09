---
name: om-check-and-commit
description: Verify that the current branch is ready to publish by running every configured validation command in order, fix straightforward failures (including locale-file drift when the repo checks it), and once everything passes commit and push the current branch. Use when the user asks to check the branch, make CI-style verification pass, then commit and push.
---

# Check And Commit

Use this skill when the user wants a branch verified end to end and published only if the repository is in a good state.

## Workflow

1. Load the pipeline config.
2. Scope the change first.
3. Run the configured validation commands in order.
4. Fix straightforward failures, especially locale drift and missing keys when the repo checks them.
5. Re-run the failed gates until green.
6. Commit and push only after all required checks pass.

## Configuration

Load `.ai/agentic.config.json` using the standard snippet from the `om-setup-agent-pipeline` skill. If the config or the tracker descriptor is missing, do not stop — run the `om-setup-agent-pipeline` skill now to create them (interactively when a user is present to answer its questions, with `--defaults` when running unattended), then reload the config and continue from this step. Right after loading the config, check for a repo-local skill of the same name at `.ai/skills/om-check-and-commit/SKILL.md`; when present, follow it instead of these instructions — a local skill that only extends this one can `@`-import or reference it and add its own rules on top. Local rules win, but a repo-local skill can never relax this skill's safety rules. Also consult the repository's agent instruction files (`AGENTS.md`, `CLAUDE.md`, or equivalents) for project specifics. The verification gates come from the config:

```bash
jq -r '.validation.commands[]' .ai/agentic.config.json
```

## Scope

- Read `git status --short` and `git diff --stat` first.
- If the diff touches a specific package or area, read the repository's agent instructions or contributing docs for that area before making fixes.
- Do not revert unrelated user changes.

## Verification Gates

Run every command in `validation.commands`, in the configured order, unless the user asks for a narrower scope. Any non-zero exit is a gate failure.

- Commands that are independent of each other's outputs (typically typecheck and unit tests) may run in parallel to save time; when unsure, run them sequentially in the configured order.
- If a configured command regenerates files (codegen, formatting), include the regenerated files in the verification flow and re-run the downstream gates afterward.
- The gate list is authoritative: do not substitute your own commands for the configured ones, and do not skip a configured command because it "probably passes".

## Locale Repair Rules

These apply only when the repo has locale files and a locale sync or usage check among its configured validation commands:

- Treat the locale sync check as a required gate; fix drift before committing.
- Keep locale files aligned across every locale the repo maintains — a key added to one locale is added to all of them.
- Do not leave hard-coded user-facing strings in changed code when the project routes strings through its localization mechanism.
- If a usage check reports missing keys, add them; if it reports unused keys introduced by the current work, remove them.
- If locale failures appear unrelated to the current work and fixing them would expand scope materially, report the blocker and stop before committing.

## Fixing Failures

- Prefer minimal fixes that make the branch correct and mergeable.
- Re-run only the failed command after each fix, then run the full tail of dependent checks again when needed.
- If the change requires a database migration, generate it with the project's migration tooling and confirm the migration content matches the intended schema change before continuing.
- Do not claim success while any required gate is still failing.

## Commit And Push

Only commit and push when the user explicitly asked for publication in the same request.

Before committing:

- Confirm `git status --short` contains only intended changes.
- Review the final diff for accidental noise.
- Use a non-interactive git commit with a conventional-commit subject (`fix(scope): …`, `feat(scope): …`, `chore(scope): …`).
- Do not amend existing commits unless the user asked for it.
- Never skip commit hooks (no `--no-verify`).

Push the current branch after the commit succeeds. Never force-push.

## Output

Report:

- which gates passed
- which issues were fixed
- whether locale files were updated
- the commit SHA and branch name if a push happened

If any required gate still fails, stop and report the exact blocker instead of committing.
