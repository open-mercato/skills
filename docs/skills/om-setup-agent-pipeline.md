# om-setup-agent-pipeline

> 🧑‍💻 Interactive — acts once, may ask questions, hands control back

The one-time configurator for the whole agent PR pipeline, and the first skill to run in a fresh repository. It inspects the repo (default branch, validation scripts, label taxonomy), asks a few questions, then writes `.ai/agentic.config.json` — the file every other skill reads — installs the tracker and browser provider descriptors, and generates the missing project docs (SDLC.md, CODE_REVIEW.md, BACKWARD_COMPATIBILITY.md, and an AGENTS.md starter), each derived from the current repository. It also verifies cross-skill coverage and prints the install command for anything missing. Re-run it when the toolchain or label taxonomy changes.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--defaults` | Optional | Skip all questions and write the auto-detected config without confirmation. |

## Works with

Produces the shared `.ai/agentic.config.json` (base branch, validation gate, label taxonomy, paths, QA gate) plus the tracker descriptor at `.ai/trackers/<tracker>.md` and browser descriptor at `.ai/browsers/<provider>.md` that every other skill in the collection reads. Other skills' setup steps auto-run this one when the config is missing; its report points users at entry points such as [om-auto-create-pr](om-auto-create-pr.md), [om-auto-review-pr](om-auto-review-pr.md), and [om-merge-buddy](om-merge-buddy.md).

---
*Source: [`skills/om-setup-agent-pipeline/SKILL.md`](../../skills/om-setup-agent-pipeline/SKILL.md)*
