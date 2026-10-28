# From brief to a flow hypothesis

Step 8 uses this sequence when examining a concrete Key flow would inform the
current decision or the user requests it. Otherwise go to readiness below.
Keep the selected flow, mode, research directory, completed artifact paths and
each action's state: offered, declined, authorized but unstarted, started but
incomplete, or completed. Run an authorized action once; pause at an explicitly
chosen later handoff instead of running its dependent steps. Resume from the
recorded state without replaying completed work or declined offers. A pending
command belongs in `Next:` only when its prerequisites are satisfied.

## 1. First synthetic panel

Without a concrete Key flow, name what is missing and skip this handoff; never
invent a flow. Select the agreed flow, subject and supported arguments through
`references/modes.md`. For an existing-product screen check use `--app` or the
actual static `.html` path with `--stance validate`. A separately chosen
narrative walkthrough uses the brief; in `existing` mode it uses
`--stance simulate`. Report unavailable screens before offering that alternative.
For narrative `client` or `own` work, use `simulate` or `adversary` respectively.

Pass the agreed `--flow "<name>"` and resolved `--research <dir>`. Explain the
companion's supported panel size and run count; the defaults are three personas
and two runs. Under `--quick`, offer `--runs 1 --panel 2` and explain that one run
produces exploratory hypotheses only. Run only when authorized. Keep its exact
`Walkthrough:` path, session evidence and `[SYNTHETIC]` labels. Do not refresh
yet; first decide whether the prototype step below is useful.

On refusal or an unavailable companion, use a previously completed panel for
this flow only when its subject, source and scope match the current brief and
intended check. If none exists, skip the prototype offer and continue to
readiness. Do not manufacture a panel to satisfy the sequence or install a
missing skill. Report incomplete panel work with its limitations.

## 2. Neutral clickable prototype

After a completed first panel, offer a neutral clickable prototype when it
would answer a specific unknown. State the learning question, observable result
and decision affected; do not force screens when existing data, research or
manual delivery would answer it better. On authorization, invoke the installed
`om-mockup-prototype <brief> --flow <flow> --panel-report <walkthrough>` using the
exact completed report path. It owns its scope confirmation and file writes.
Preserve its `Prototype:`, `Prototype context:` and `Verification:` fields.
Only `Verification: passed` permits the screen-walk offer below; `incomplete`
and `not-run` never imply browser verification.

On refusal, an irrelevant prototype or an unavailable skill, continue with the
completed panel; explain any capability limitation once. If the user chooses
the prototype for later and its inputs are ready, emit its exact invocation as
the single `Next:` and finish this handoff before refreshing or drafting the
backlog. For an already completed matching prototype, retain its actual paths
and verification status and resume at the next unfinished step.

## 3. Walk the prototype, optionally

When `Verification: passed`, offer a separate synthetic walkthrough through
`om-synthetic-users <Prototype path> --flow "<name>" --research <dir>` with the
mode's stance: `validate` for existing, `simulate` for client, `adversary` for
own. Use the exact returned `.html` path; do not reuse a narrative subject or
its fallback stance. Preserve supported panel options, including quick-mode
limits when chosen. The main agent operates the browser and supplies observed
states to isolated personas under the synthetic skill's rules; persona agents
receive no browser or network access.

This screen walkthrough requires separate authorization and a new session under
the companion's artifact rules. Keep its returned `Walkthrough:` path distinct
from the first panel, including when both ran on the same day and flow. Read
each report's immutable persona snapshot; the shared latest panel cannot
replace historical evidence.

If verification is `incomplete` or `not-run`, name the missing check and skip
this offer and any screen-walk `Next:` until verification passes. A declined
walkthrough does not block the brief refresh. A separately authorized, ready
walkthrough chosen for later pauses here with its exact pending invocation.
No child `Next:` is executed or forwarded automatically.

## 4. Refresh once

If the completed handoff produced new material, run this skill's refresh path
once through steps 2 and 4–7, reading both panel reports when present and the
prototype context. Retain the step-5 checks and step-6 skeptical review; quick
mode uses the same checks inline and discloses the lack of independent review.
Material changed after review is reviewed again before confirmation and writing.
Keep simulated user reactions as `[SYNTHETIC]` and invented implementation or
flow details as `[ASSUMPTION]`. A browser check proves that the local artifact
behaves as described; it does not prove demand or usability. Prototype approval
records the chosen flow and does not satisfy the ticket-level Definition of Ready.

Keep the step-7 confirmation for the reviewed changes, using prior confirmation
only when it covers those exact choices and consequences. Supersede decisions
without deleting their history. On a declined brief update, leave the existing
brief unchanged and report the pending hypotheses or decisions; do not draft a
backlog as though those changes had been accepted. Otherwise resume at readiness
below, never at the panel or prototype offer. The same rule applies to a later
run resuming this refresh and after an explicitly authorized session extension.

## 5. Readiness and backlog

Apply the repository's ticket-level Definition of Ready when present; without
it, report that the product readiness layer is not configured, as the backlog
skill would. Do not invent a replacement readiness check or start setup.
When the applicable requirements are met, offer `om-backlog <brief> --dry-run`.
Run it only when authorized and let its own checks and confirmation apply.

When information is missing, name the specific collection tasks, blocking
questions or unowned proposals. Offer another round only as an explicit session
extension, and only when the user can supply the missing answer. Keep the
existing round budget until that extension is authorized; readiness and sign-off
are not extra interview rounds. After an extension, review changed content
through steps 4–6, confirm the brief update and return here. On refusal, finish
with `Next: none`. A backlog dry run does not authorize issue filing; that
requires a separate explicit choice.

## Report the result

Use `references/report-templates.md`. Link completed artifacts and preserve their
exact paths, status and limitations. Only a user-authorized, unstarted action
that is ready to run may appear in the single final `Next:` line. Completed,
declined, unaccepted and blocked steps yield `Next: none` unless a separate
ready, outstanding action was explicitly authorized. Preserve its supported
arguments; do not copy a child's routing line as authorization.
