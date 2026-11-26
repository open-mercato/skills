# Review procedure (step 4)

The review follows the `om-code-review` skill so every reviewer in the
pipeline applies the same rules and the same severity scale. The one
difference: this skill does not run `validation.commands` locally. The
hosted CI on the head SHA (step 5) is the validation evidence, because the
project's CI already ran the checks the triage labels asked for.

## What to apply from `om-code-review`

Follow its Review Workflow steps in order, skipping step 3 (the local
validation gate):

1. **Scope.** Classify every changed file by layer (HTTP handler, data model,
   migration, validation, UI, background job or subscriber, CLI, config,
   build, test).
2. **Context.** Read the agent instructions for each touched area and the
   spec or issue the PR implements. Separate a direction or scope question
   from a code defect; cite the repository rule before calling a design
   choice a violation.
3. **Breaking-change and product-decision gates.** Its step 4.
4. **Checklists.** `om-code-review/references/review-checklist.md`, plus
   `REVIEW_CHECKLIST`, `CODE_REVIEW.md` and `BACKWARD_COMPATIBILITY.md` when
   present. Repository rules extend the built-in checklist.
5. **Test coverage**, including the risk-high evidence gate. Its step 6.
6. **Cross-boundary impact.** Trace the consumers of changed events,
   contracts and extension points (its step 7). A consumer in another module
   that the triage CI line does not cover is a reason to raise an area label
   in step 6 of this skill.
7. **UI performance gate** for changes to routes, shared providers, the app
   shell or heavy widgets.

## Severity and verdict

Use the scale and the verdict rule from `om-code-review` (Severity and
Verdict): blocker and unwaived major request changes; only minors and nits
approve. A failing required CI check on the head is a blocker (step 5).

## Findings

Each finding states: severity, file and line, what goes wrong for whom, the
rule or behavior behind it, and a concrete fix. Keep findings about this
diff; a pre-existing problem the diff does not touch is mentioned once as a
note, never as a blocker. Qualify absence claims by where you searched.

## Re-reviews

On a PR this skill reviewed before, read the earlier review and the commits
since. Check each earlier finding: fixed, still open, or no longer relevant.
Carry the open ones forward with their original severity.
