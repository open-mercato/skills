<!--
  Template for SDLC.md, consumed by the om-setup-agent-pipeline skill.
  When generating the repo-local SDLC.md:
  - Replace {{baseBranch}}, {{tracker}}, {{specsDir}}, and {{validationCommands}}
    with values resolved from .ai/agentic.config.json. Render
    {{validationCommands}} as a bullet list of the configured commands, in order.
  - Resolve every conditional block marked "IF <condition>" ... "END IF": keep
    the content when the config condition is true, delete it entirely when
    false, and strip the marker comments either way. "IF NOT <condition>"
    keeps the content when the condition is false. A missing config key is
    false.
  - The "IF discovery" blocks are the product layer, switched by
    `discovery.enabled` (written by om-discovery-setup, never asked for by
    om-setup-agent-pipeline). When it is true, keep them and replace each
    outer pair of markers with `<!-- discovery:start -->` and
    `<!-- discovery:end -->` instead of stripping them, so om-discovery-setup
    can find and refresh exactly those blocks in a file it did not generate.
    Nested blocks inside them ("IF discovery.roles.<role>") resolve as usual.
  - Delete this instruction comment from the generated file.
-->

# Software delivery process

## Purpose

This file documents how work flows from ticket to merged PR in this repository. The agent skills configured in `.ai/agentic.config.json` enforce the process; humans read it here. PRs target `{{baseBranch}}`; issues and PRs live in {{tracker}}, with every tracker operation the skills run defined in `.ai/trackers/{{tracker}}.md` (edit that file to extend or override tracker behavior).

Work enters through two paths: a free-form task brief handed to an agent, or a filed ticket. Both converge on the same review loop, the same validation gate, and the same merge gates.

Before intake, the work is shaped: `om-brainstorm` turns a single idea or question into a routing decision and a brief, and the spec skills (`om-spec-writing`, `om-auto-write-spec`) turn a feature into a design document before anything is built. Those steps feed the table below; they are not the ticket flow itself.

<!-- IF discovery -->
Before any of that, `om-discover` establishes the product context every later decision reads: `{{specsDir}}/product-brief.md` — who the users are, what hurts, what the product is not, which rules and decisions bind the work. The Definition of Ready below is the contract between that context and Intake.
<!-- END IF -->

## Roles

- **Author** — the human or agent who writes the change. Owns the ticket from claim to a merge-ready PR.
This document and `.ai/agentic.config.json` describe the same process: change them together, and re-run the `om-setup-agent-pipeline` skill when the toolchain or label taxonomy changes.

<!-- IF discovery -->
The product-layer blocks between `<!-- discovery:start -->` and `<!-- discovery:end -->` are owned by `om-discovery-setup`: re-run it to add or refresh them, and edit everything else by hand.
<!-- END IF -->

The design contract the Design and Review stages read is set up once: `om-ux-setup` extracts it from the repository and is re-run when the design system changes.

Per-skill deviations — extra review rules, a different PR body template, an added gate step — belong in a repo-local skill of the same name at `.ai/skills/<skill-name>/SKILL.md`, which takes precedence over the installed skill (and can `@`-import or reference it to extend rather than replace it); local rules win, but a repo-local skill cannot grant what the installed skill's safety rules forbid.
