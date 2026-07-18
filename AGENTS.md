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

1. **Autonomous and chainable.** An `om-auto-*` skill runs unattended end-to-end and documents a `## Chaining` section: which params it accepts (`{prNumber}`, `{issueId}`, `--spec`, …), what it consumes from the previous skill, and what it emits. A previous skill may already have created the PR — detect it (**search-prs**, the body's `Tracking plan:` line) and continue on that PR; **never open a duplicate**. PR-producing/-driving skills end their report with `PR_URL=` / `PR_NUMBER=` markers on their own lines.
2. **SDLC compliance, always.** Every skill that touches PRs/issues follows `SDLC.md` through the tracker descriptor's guards (`apply_label`, `set_pipeline_label`, `labels.enabled`). PR creation applies the full set — one pipeline label, category, QA meta (`needs-qa`/`skip-qa`, never both), exactly one priority, exactly one risk — per the canonical rules (`om-open-pr` step 6 = `om-auto-create-pr/references/label-normalization.md`). Pipeline PRs open **ready for review**; draft only for explicitly incomplete work (spec-only design PRs, interrupted hand-offs, `⚠ NEEDS HUMAN CONFIRMATION` guards). `qa-approved` is never applied by automation (self-QA sign-off in `om-auto-verify-pr-ui` is the one documented exception).
3. **Standard communication.** Tracker comments use stable markers — `🤖 <skill-name> — <purpose>` — and are idempotent: a re-run finds its marker and updates in place, never duplicates. The standard set: claim comment, per-label rationale, assumptions (autonomous defaults), run summary (the `om-auto-create-pr` step-12 structure), evidence (screenshots via **attach-image-evidence**), release/handback. A skill posts exactly the subset relevant to its role, in that format.
4. **Dependencies = invocation + fallback.** Skills compose by invoking each other by name; there is no install-time dependency mechanism. Every cross-skill call either has an inline fallback so the skill works standalone (preferred — see `om-auto-create-pr/references/pr-open-reuse.md`) or stops cleanly naming the missing skill. Never copy another skill's content wholesale.
5. **Paired files stay in sync** (update all in the same PR): the unified PR body template (`om-open-pr/references/pr-body-template.md` ↔ `om-auto-create-pr/references/pr-body-template.md`), the label rules (`om-open-pr` step 6 ↔ `om-auto-create-pr/references/label-normalization.md`), the spec-resolution procedure (`om-auto-implement-spec/references/spec-resolution.md` and its consumers), and the shared preamble blocks (`om-create-skill/references/shared-boilerplate.md`).

## Validation

Run before every PR (also the full CI gate):

```bash
bash scripts/lint.sh
```

## Conventions

- Skills are written in second person, addressed to the executing agent, with `## Arguments`, `## Workflow` (numbered steps), and `## Rules` sections. Match this structure when editing.
- Skill names keep the upstream `om-` prefix deliberately (see `DECISIONS.md` → Naming).
- Shell snippets inside skills must be POSIX-ish bash and platform-portable; they run on whatever machine the installing user has.
- Cross-references between skills use the skill name (e.g. "the `om-code-review` skill"). A path into another skill's directory is allowed only for the documented shared-contract files listed in the Cross-skill contract (e.g. `om-auto-create-pr/references/pr-open-reuse.md`).

## Process documents

- `SDLC.md` — the ticket flow the skills automate (stages, labels, QA gate, claim protocol).
- `CODE_REVIEW.md` — review rules applied by `om-code-review` / `om-auto-review-pr`.
- `BACKWARD_COMPATIBILITY.md` — the protected contract surfaces of this collection.
- `.ai/agentic.config.json` — machine-readable pipeline settings; `.ai/trackers/github.md` — tracker operation implementations.
