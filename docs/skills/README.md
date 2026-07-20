# Skill cards

One card per skill, with its parameters and the companion skills it works with. Each card links back to the skill's `SKILL.md` source.

**Naming convention:** the `om-auto-*` prefix marks a skill as 🤖 **autonomous** — hand it a brief, an issue, or nothing at all and it runs end-to-end without supervision (isolated worktree, validation gate, self-review, claim locks). Every other skill is 🧑‍💻 **interactive**: it acts once, may ask you questions, reports, and hands control back.

| Skill | Type | What it does |
|---|---|---|
| [om-auto-create-pr](om-auto-create-pr.md) | 🤖 | Takes a free-form task brief end-to-end to a labeled, self-reviewed PR. Resumable. |
| [om-auto-create-pr-loop](om-auto-create-pr-loop.md) | 🤖 | Advanced create-pr for long spec builds: run folder, one commit per step, checkpoint verification. |
| [om-auto-continue-pr](om-auto-continue-pr.md) | 🤖 | Resumes an in-progress PR from the first unchecked step of its tracking plan. |
| [om-auto-continue-pr-loop](om-auto-continue-pr-loop.md) | 🤖 | Resumes a create-pr-loop run from the first non-done Tasks-table row. |
| [om-auto-fix-issue](om-auto-fix-issue.md) | 🤖 | The issue-to-PR entry point: classifies the issue, then drives the bug or feature route. |
| [om-auto-fix-pr](om-auto-fix-pr.md) | 🤖 | Drives one PR to merge-ready: base merge, review-autofix, CI stabilization, UI QA. |
| [om-auto-write-spec](om-auto-write-spec.md) | 🤖 | Turns a brief or feature-request issue into a finished spec on a ready PR with mockups. |
| [om-auto-implement-spec](om-auto-implement-spec.md) | 🤖 | Implements an existing spec and ships a reviewed, UI-verified PR. |
| [om-auto-review-pr](om-auto-review-pr.md) | 🤖 | Reviews or re-reviews a PR by number, with an autofix loop until merge-ready. |
| [om-auto-qa-pr](om-auto-qa-pr.md) | 🤖 | QAs a PR's UI in a real browser and posts screenshot evidence — no source touched. |
| [om-auto-manage-issues](om-auto-manage-issues.md) | 🤖 | Brings existing issues up to standard: label sync, screenshot analysis, spec-coverage checks. |
| [om-auto-update-changelog](om-auto-update-changelog.md) | 🤖 | Drafts a CHANGELOG release entry for merged PRs and ships it as a docs PR. |
| [om-review-prs](om-review-prs.md) | 🧑‍💻 | Sweeps every unreviewed open PR, newest first, through the review skill. |
| [om-close-fixed-issues](om-close-fixed-issues.md) | 🧑‍💻 | Post-merge housekeeping: closes issues merged PRs fixed, comments on closed-unmerged PRs. |
| [om-merge-buddy](om-merge-buddy.md) | 🧑‍💻 | Reports which open PRs can merge now and which are close but blocked. |
| [om-approve-merge-pr](om-approve-merge-pr.md) | 🧑‍💻 | Approves and squash-merges a PR by number, honoring the QA gate. |
| [om-setup-agent-pipeline](om-setup-agent-pipeline.md) | 🧑‍💻 | One-per-repo configurator: writes the config, installs descriptors, generates project docs. |
| [om-apply-upgrade-notes](om-apply-upgrade-notes.md) | 🧑‍💻 | Applies UPGRADE_NOTES.md after an upgrade, preserving local edits. |
| [om-check-and-commit](om-check-and-commit.md) | 🧑‍💻 | Runs the validation gate on the branch, fixes obvious drift, commits and pushes when green. |
| [om-prepare-issue](om-prepare-issue.md) | 🧑‍💻 | Files one well-formed, labeled tracker issue from a brief without implementing it. |
| [om-spec-writing](om-spec-writing.md) | 🧑‍💻 | Writes and reviews feature specs to staff-engineer standards. |
| [om-followup-issue-from-pr](om-followup-issue-from-pr.md) | 🧑‍💻 | Turns a PR or PR comment into a tracked follow-up issue. |
| [om-prepare-test-env](om-prepare-test-env.md) | 🧑‍💻 | Boots the app for QA and tests on any stack and provisions the browser provider. |
| [om-integration-tests](om-integration-tests.md) | 🧑‍💻 | Creates and runs integration/E2E tests by exploring the running app first. |
| [om-create-skill](om-create-skill.md) | 🧑‍💻 | Authors a new OM skill, or splits an oversized SKILL.md into layered references. |
| [om-verify-in-repo](om-verify-in-repo.md) | 🧑‍💻 | Read-only triage gate: decides whether an issue is a real, still-unfixed defect. |
| [om-root-cause](om-root-cause.md) | 🧑‍💻 | Read-only analysis: locates the bug and the minimal change surface. |
| [om-fix](om-fix.md) | 🧑‍💻 | Implements the minimal change with regression tests and runs the validation gate. |
| [om-open-pr](om-open-pr.md) | 🧑‍💻 | The shared PR opener: commits, pushes, opens or reuses a labeled PR, emits chain markers. |
| [om-code-review](om-code-review.md) | 🧑‍💻 | The review checklist behind om-auto-review-pr: correctness, security, contract surfaces. |
