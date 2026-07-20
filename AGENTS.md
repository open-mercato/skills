# Agent instructions

This repository is the source of the **Open Mercato Skills** collection: thirty agent skills (`skills/<name>/SKILL.md`) that run a full PR pipeline — plan, implement, review, QA gate, merge — installable into any repo via [skills.sh](https://skills.sh). The deliverables here are markdown skill documents plus a small amount of shell/Node tooling; there is no application code.

## Task routing

| When the task involves… | Read first | Key rules |
|---|---|---|
| Editing or adding a skill (`skills/<name>/SKILL.md`) | `DECISIONS.md`, `scripts/lint.sh`, the **Cross-skill contract** section below, the skill's own `references/` dir if present | Frontmatter `name` must equal the directory name and `description` must be present (≤500 chars — lint-enforced; aim for ≤350). Content must stay product-agnostic: no Open Mercato product references, no hard-coded base branch or package manager (the lint gate greps for these). All tracker state management goes through named tracker operations, never direct `gh` commands (only `references/trackers/` may contain them). Config values (`baseBranch`, paths, labels, validation commands) always come from `.ai/agentic.config.json`, never hard-coded. New `om-auto-*` skills MUST implement the Cross-skill contract. |
| Cross-skill contracts (tracker operations, config schema, Progress format) | `skills/om-setup-agent-pipeline/SKILL.md`, `skills/om-setup-agent-pipeline/references/trackers/TEMPLATE.md`, `BACKWARD_COMPATIBILITY.md` | Multiple skills parse each other's outputs (execution-plan Progress sections, `test-env.json`, tracker descriptors). Changing a shared format requires updating every consumer in the same PR. |
| Installer / tooling scripts (`scripts/*.sh`, `scripts/*.mjs`) | `package.json`, the script itself, `.github/workflows/` | Keep scripts POSIX-portable where they run in CI (ubuntu) and locally (macOS). `scripts/lint.sh` is the CI gate — changes to it change what every PR must pass. |
| CI workflows (`.github/workflows/*.yml`) | `scripts/lint.sh`, `scripts/audit-skills.sh` | `lint.yml` runs the frontmatter + product-agnosticism gate on every PR. `skills-audit.yml` is informational (skills.sh third-party audit surfacing). |
| Process / pipeline configuration | `.ai/agentic.config.json`, `SDLC.md`, `.ai/trackers/github.md` | Config and `SDLC.md` describe the same process — change them together. |
| README, DECISIONS.md, LICENSE | `DECISIONS.md` | These MAY reference the upstream Open Mercato project (the agnosticism gate is scoped to `skills/**` only). Read `DECISIONS.md` before proposing structural changes — most "obvious" restructurings were already considered and decided. |

## Cross-skill contract (rules for every skill — binding for `om-auto-*`)

These invariants make the auto skills composable; every new or edited skill must preserve them (they are also the review bar for skill PRs):

1. **Autonomous and chainable.** An `om-auto-*` skill runs unattended end-to-end — when a decision is needed mid-run it makes the recommended, most-reversible call itself and documents it (in the plan/spec and as a PR/issue comment where sensible) instead of stopping to ask; the only hard stops are claim conflicts without `--force` and `⚠ NEEDS HUMAN CONFIRMATION` defaults. It documents a `## Chaining` section: which params it accepts (`{prNumber}`, `{issueId}`, `--spec`, …), what it consumes from the previous skill, and what it emits. A previous skill may already have created the PR — detect it (**search-prs**, the body's `Tracking plan:` line) and continue on that PR; **never open a duplicate**. PR-producing/-driving skills end their report with `PR_URL=` / `PR_NUMBER=` markers on their own lines.
2. **SDLC compliance, always.** Every skill that touches PRs/issues follows `SDLC.md` through the tracker descriptor's guards (`apply_label`, `set_pipeline_label`, `labels.enabled`). PR creation applies the full set — one pipeline label, category, QA meta (`needs-qa`/`skip-qa`, never both), exactly one priority, exactly one risk — per the canonical label rules (`om-open-pr` step 6; each PR-producing skill carries them in its own `references/pr-finalize.md`). Pipeline PRs open **ready for review**; draft only for explicitly incomplete work (spec-only design PRs, interrupted hand-offs, `⚠ NEEDS HUMAN CONFIRMATION` guards). `qa-approved` is never applied by automation (self-QA sign-off in `om-auto-qa-pr` is the one documented exception).
3. **Standard communication.** Tracker comments use stable markers — `🤖 <skill-name> — <purpose>` — and are idempotent: a re-run finds its marker and updates in place, never duplicates. The standard set: claim comment, per-label rationale, assumptions (autonomous defaults), run summary (the `om-auto-create-pr` step-12 structure), evidence (screenshots via **attach-image-evidence**), release/handback. A skill posts exactly the subset relevant to its role, in that format. All user-facing output (PR bodies, comments, reports) uses the shared emoji glossary consistently: 🤖 agent comment marker · 🎯 goal · 📋 plan/tracking · 📝 spec/design · 🏷️ label rationale · 📸 UI evidence · 🔍 review findings · 🧪 tests/QA · 💥 breaking changes · ✅ pass/approved · ❌ fail/changes-requested · ⚠️ needs human/risk · ⛔ blocked · 🔁 resume/continuation · 🚀 merge/release. Emojis decorate; parsers key on the text markers (`🤖 <skill> —`, `PR_URL=`, `Status:`), never on emojis alone. Each skill carries this glossary and the other shared communication rules in its own `references/rules.md`.
4. **Dependencies = invocation, files = own copies.** Skills compose by invoking each other **by name**; there is no install-time dependency mechanism. Every cross-skill call either has an inline fallback so the skill works standalone (preferred — documented in the skill's own `references/pr-finalize.md` for PR opening) or stops cleanly naming the missing skill (`om-setup-agent-pipeline`'s coverage check prints the install command for anything missing). A skill never points into another skill's `references/` directory — the one exception is `om-apply-upgrade-notes`, whose job is reading the shipped descriptor templates in `om-setup-agent-pipeline/references/trackers|browsers/`.
5. **Standard step files, duplicated per skill — and kept in sync by asking.** Repeatable steps live in each skill's own `references/` under standard names: `agentic-setup.md` (config load + repo-local override contract + untrusted-content boundary), `worktree-setup.md`, `claim-pr.md`, `pr-finalize.md` (open/reuse, labels, body + summary templates, markers), `review-report.md`, `rules.md` (shared rules incl. the emoji glossary). Every skill has its **own copy** so it installs standalone; `om-auto-create-pr` holds the canonical text; a skill only carries the files for steps it actually performs, and skill-specific behavior goes under a marked "specifics" section, not into the shared part. The deliberate cost is duplication, managed by this binding rule: **whenever you edit one of these standard files (or the shared part of a step) in any skill, diff the same file in the other skills and ask the user whether to sync the change across them — list the skills that would change.** SKILL.md itself keeps only the numbered main algorithm with direct instructions; repeatable detail stays behind `references/<step>.md` so unused steps cost no tokens.

## Validation

Run before every PR (also the full CI gate):

```bash
bash scripts/lint.sh
```

## Conventions

- Skills are written in second person, addressed to the executing agent, with `## Arguments`, `## Workflow` (numbered steps), and `## Rules` sections. Match this structure when editing.
- Skill names keep the upstream `om-` prefix deliberately (see `DECISIONS.md` → Naming).
- Shell snippets inside skills must be POSIX-ish bash and platform-portable; they run on whatever machine the installing user has.
- Cross-references between skills use the skill name (e.g. "the `om-code-review` skill"). Paths into another skill's `references/` directory are not allowed (Cross-skill contract §4–5); the sole exception is `om-apply-upgrade-notes` reading `om-setup-agent-pipeline`'s shipped descriptor templates.

## Process documents

- `SDLC.md` — the ticket flow the skills automate (stages, labels, QA gate, claim protocol).
- `CODE_REVIEW.md` — review rules applied by `om-code-review` / `om-auto-review-pr`.
- `BACKWARD_COMPATIBILITY.md` — the protected contract surfaces of this collection.
- `.ai/agentic.config.json` — machine-readable pipeline settings; `.ai/trackers/github.md` — tracker operation implementations.
