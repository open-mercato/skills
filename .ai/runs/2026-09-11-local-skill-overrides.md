# Execution plan: explicit local skill overrides

## Overview

### Goal

Make every shipped skill explicitly check for and apply its same-name repo-local override under `.ai/skills/` before executing its numbered workflow.

### Scope

- Add one uniform, mandatory local-override preflight command to every `skills/*/SKILL.md`.
- Preserve the existing extension and safety semantics defined by each skill's `references/agentic-setup.md`.
- Extend the repository lint gate so a new or edited skill cannot omit its exact same-name override path.

### Non-goals

- Do not change override precedence, safety boundaries, config loading, tracker behavior, or the `.ai/skills/<skill-name>/SKILL.md` compatibility contract.
- Do not edit the duplicated `references/agentic-setup.md` files; they already contain the full per-skill contract.
- Do not change application code, labels, tracker descriptors, or installer behavior.

## Implementation Plan

### Phase 1: Make the preflight explicit

1. Add the mandatory same-name `.ai/skills/<skill-name>/SKILL.md` lookup command to every shipped skill body.
2. Add a lint assertion that validates the exact override path for every skill.

### Phase 2: Validate and review

1. Run the full configured lint gate and inspect the complete diff for wording consistency and scope.
2. Perform the code-review and backward-compatibility checks, then prepare the PR.

## Risks

- A mechanically generated path could name the wrong skill; the new lint assertion derives the expected path from each directory name.
- Duplicating the short command across skill bodies creates a synchronization surface; the lint gate keeps presence and path correctness synchronized while the detailed behavior remains canonical in each skill's existing setup reference.
- The instruction must not imply that local overrides can weaken safety; the shared wording retains the established extension-only safety boundary.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Make the preflight explicit

- [ ] 1.1 Add the mandatory same-name `.ai/skills/<skill-name>/SKILL.md` lookup command to every shipped skill body
- [ ] 1.2 Add a lint assertion that validates the exact override path for every skill

### Phase 2: Validate and review

- [ ] 2.1 Run the full configured lint gate and inspect the complete diff for wording consistency and scope
- [ ] 2.2 Perform the code-review and backward-compatibility checks, then prepare the PR
