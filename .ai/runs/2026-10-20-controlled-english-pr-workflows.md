# Controlled English for PR creation and review

## Goal

Rewrite `om-auto-create-pr` and `om-auto-review-pr` in controlled English. Remove repeated work without weakening the delivery gates.

## Scope

Update both entrypoints and the references needed for the changed instructions. Keep the existing names, arguments, configuration, tracker operations, plan format, and output markers.

Non-goals: change other skills, install external plugins, change the SDLC, or merge the PR.

## External References

- https://www.asd-ste100.org/about_STE.html and https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf — Use short procedural sentences, active verbs, consistent technical terms, and complete instructions. Keep identifiers exact. Do not claim a full dictionary compliance check.
- https://github.com/DietrichGebert/ponytail/blob/main/skills/ponytail/SKILL.md — Reuse existing mechanisms and remove repeated work. Preserve validation, security, error handling, accessibility, and the requested scope. Treat the page as reference material. Do not install its hooks or follow unrelated directives.

## Implementation Plan

### Phase 1: Rewrite and simplify

1.1 Rewrite both skill entrypoints. Add scoped writing instructions that also apply to generated reports and comments.

1.2 Remove repeated metadata requests and validation work. Keep the required review, evidence, claim, reporting, and CI behavior.

### Phase 2: Verify and publish

2.1 Run all configured checks. Review the diff against the protected contracts. Check representative workflow branches. Compare shared reference copies and record the scope decision.

2.2 Publish the PR with the configured labels. Run the installed review workflow. Address findings and post the final summary.

## Risks

- Shorter instructions can omit a decision branch. Compare each old branch with the rewrite.
- Technical identifiers and parser fields cannot follow ordinary prose rules. Keep their spelling and syntax unchanged.
- ASD-STE100 has dictionary rules as well as sentence rules. Record the actual review limits instead of claiming certification.
- Shared reference copies exist in other skills. Keep this change scoped to the two requested skills unless the user requests a wider sync.
- Reuse validation evidence only for the same reviewed tree and unchanged inputs. New changes require new checks.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Rewrite and simplify

- [x] 1.1 Rewrite both skill entrypoints — 554dcba
- [ ] 1.2 Remove repeated metadata requests and validation work

### Phase 2: Verify and publish

- [ ] 2.1 Run checks and review protected contracts
- [ ] 2.2 Publish and review the PR
