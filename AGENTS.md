# Agent instructions

This repository is the source of the **Open Mercato Skills** collection: twenty-five agent skills (`skills/<name>/SKILL.md`) that run a full PR pipeline — plan, implement, review, QA gate, merge — installable into any repo via [skills.sh](https://skills.sh). The deliverables here are markdown skill documents plus a small amount of shell/Node tooling; there is no application code.

## Task routing

| When the task involves… | Read first | Key rules |
|---|---|---|
| Editing or adding a skill (`skills/<name>/SKILL.md`) | `DECISIONS.md`, `scripts/lint.sh`, the skill's own `references/` dir if present | Frontmatter `name` must equal the directory name and `description` must be present. Content must stay product-agnostic: no Open Mercato product references, no hard-coded base branch or package manager (the lint gate greps for these). All tracker state management goes through named tracker operations, never direct `gh` commands (only `references/trackers/` may contain them). Config values (`baseBranch`, paths, labels, validation commands) always come from `.ai/agentic.config.json`, never hard-coded. |
| Cross-skill contracts (tracker operations, config schema, Progress format) | `skills/om-setup-agent-pipeline/SKILL.md`, `skills/om-setup-agent-pipeline/references/trackers/TEMPLATE.md`, `BACKWARD_COMPATIBILITY.md` | Multiple skills parse each other's outputs (execution-plan Progress sections, `test-env.json`, tracker descriptors). Changing a shared format requires updating every consumer in the same PR. |
| Installer / tooling scripts (`scripts/*.sh`, `scripts/*.mjs`) | `package.json`, the script itself, `.github/workflows/` | Keep scripts POSIX-portable where they run in CI (ubuntu) and locally (macOS). `scripts/lint.sh` is the CI gate — changes to it change what every PR must pass. |
| CI workflows (`.github/workflows/*.yml`) | `scripts/lint.sh`, `scripts/audit-skills.sh` | `lint.yml` runs the frontmatter + product-agnosticism gate on every PR. `skills-audit.yml` is informational (skills.sh third-party audit surfacing). |
| Process / pipeline configuration | `.ai/agentic.config.json`, `SDLC.md`, `.ai/trackers/github.md` | Config and `SDLC.md` describe the same process — change them together. |
| README, DECISIONS.md, LICENSE | `DECISIONS.md` | These MAY reference the upstream Open Mercato project (the agnosticism gate is scoped to `skills/**` only). Read `DECISIONS.md` before proposing structural changes — most "obvious" restructurings were already considered and decided. |

## Validation

Run before every PR (also the full CI gate):

```bash
bash scripts/lint.sh
```

## Conventions

- Skills are written in second person, addressed to the executing agent, with `## Arguments`, `## Workflow` (numbered steps), and `## Rules` sections. Match this structure when editing.
- Skill names keep the upstream `om-` prefix deliberately (see `DECISIONS.md` → Naming).
- Shell snippets inside skills must be POSIX-ish bash and platform-portable; they run on whatever machine the installing user has.
- Cross-references between skills use the skill name (e.g. "the `om-code-review` skill"), never file paths into another skill's directory.

## Process documents

- `SDLC.md` — the ticket flow the skills automate (stages, labels, QA gate, claim protocol).
- `CODE_REVIEW.md` — review rules applied by `om-code-review` / `om-auto-review-pr`.
- `BACKWARD_COMPATIBILITY.md` — the protected contract surfaces of this collection.
- `.ai/agentic.config.json` — machine-readable pipeline settings; `.ai/trackers/github.md` — tracker operation implementations.
