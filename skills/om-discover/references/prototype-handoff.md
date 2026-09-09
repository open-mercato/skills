# From brief to a tested flow hypothesis

Step 8 of `om-discover` uses this sequence after the user confirms the brief.
Keep the selected flow, mode, research directory and completed artifact paths
throughout the hand-off. Track each offer as declined, executed, or explicitly
chosen for later execution. Run each accepted step once.

## 1. First synthetic panel

Offer `om-synthetic-users <brief> --flow <first Key flow>` with the research
directory and stance from the mode: `validate` for existing, `simulate` for
client, `adversary` for own. Explain the default three personas and two runs;
under `--quick`, offer `--runs 1 --panel 2`. Run only after an explicit yes.
Keep the returned `Walkthrough:` path and `[SYNTHETIC]` findings. Do not refresh
the brief yet: the prototype offer comes first.

On refusal, use a previously completed panel for this flow only when its source
and scope match the current brief. If none exists, skip the prototype offer and
continue to readiness. Do not manufacture a panel to satisfy the sequence.

## 2. Neutral clickable prototype

After a completed first panel, ask whether to make the selected flow clickable
in a neutral low-fi prototype. On yes, invoke the installed
`om-mockup-prototype <brief> --flow <flow> --panel-report <walkthrough>` skill.
It owns its scope confirmation and file writes. Preserve its `Prototype:`,
`Prototype context:` and `Verification:` fields. Never claim a generated file
was browser-verified when its result says `incomplete` or `not-run`.

On refusal or unavailable skill, continue with the completed panel; explain the
limitation once. If the user chooses the prototype for later, emit its exact
invocation as the single `Next:` and finish this hand-off before refreshing or
drafting the backlog. A future run resumes from the completed step.

## 3. Walk the prototype, optionally

When the prototype is verified, offer a separate synthetic walkthrough through
`om-synthetic-users <Prototype path> --flow <flow>` with the same mode-derived
stance and research directory. The input is now the actual screens. The main
agent operates the browser and supplies observations to isolated personas under
the synthetic skill's rules. This is a separately accepted screen walkthrough,
not an implicit repeat of the first panel on the brief.

If verification is incomplete, name the missing check and skip this offer until
the artifact can be opened and exercised. A declined walkthrough does not block
the brief refresh. No child `Next:` is executed or forwarded automatically.

## 4. Refresh once

If the panel or prototype produced new material, run this skill's refresh path
(steps 2, 4, 5, 7), reading the completed reports and the prototype context.
Keep simulated user reactions as `[SYNTHETIC]` and invented implementation or
flow details as `[ASSUMPTION]`. A browser check proves that the local artifact
behaves as described; it does not prove demand or usability. Prototype approval
records the chosen flow and does not satisfy the ticket-level Definition of Ready.

Keep the step-7 confirmation: show proposed brief changes before writing and
supersede decisions without deleting their history. On a declined brief update,
leave the existing brief unchanged and report the pending findings; do not draft
a backlog as though those changes had been accepted. Otherwise resume at
readiness below, never at the panel or prototype offer. The same rule applies
after an additional round that answers blocking questions.

## 5. Readiness and backlog

Apply the repository's ticket-level Definition of Ready when present; without
it, the backlog skill reports that the product layer is not configured. When
the applicable requirements are met, offer `om-backlog <brief> --dry-run`.
On yes, invoke that skill and let its own gates and confirmation apply.

When information is missing, name the collection tasks, blocking questions or
unowned proposals, and offer to answer the blocking questions. On yes, run one
more interview round and confirm the brief update, then return here. On no,
finish with `Next: none`. A backlog dry run does not authorize issue filing;
that requires a separate explicit choice.

## Report the result

Use `references/report-templates.md`. Link completed artifacts in prose and
keep their status and limitations. Only a user-chosen, unexecuted action may
appear in the final `Next:` line; completed and declined steps yield `Next: none`
unless a different outstanding action was explicitly chosen.
