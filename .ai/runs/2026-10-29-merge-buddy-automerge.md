# Execution plan — om-merge-buddy automerge mode

> 🔁 **Rewritten 2026-10-31 (Phase 8).** On the owner's request the `om-merge-buddy --automerge` mode and the `om-approve-merge-pr --automerge` handoff (Phases 3, 5, 6.1) were reverted. They are replaced by a new `om-auto-merge-buddy` skill driven by three signal labels, plus an `--orchestrated` mode in `om-auto-review-pr`, `om-auto-qa-pr` and `om-auto-fix-pr`. Phases 1, 2, 6.2 and 7 still stand. The Goal and Decisions below describe the original design; Phase 8 records the rewrite.

## Goal

Add an `--automerge` mode to `om-merge-buddy` that works the queue of PRs a human labeled `automerge` (label name configurable through `om-setup-agent-pipeline`): one PR at a time, approve pending CI workflow runs, merge the latest base in and resolve conflicts, drive review/CI green via `om-auto-fix-pr` / `om-auto-review-pr` (fork PRs through the carry-forward replacement), skip PRs another agent or orchestrator task is working on, and merge through `om-approve-merge-pr` once every gate is genuinely green.

## Scope

- `skills/om-merge-buddy/` — SKILL.md (mode, arguments, chaining, workflow), new `references/automerge.md`, `references/claim-pr.md`, report template, rules specifics.
- `skills/om-setup-agent-pipeline/` — new optional config key `automerge.label` (schema, field reference, `config-capabilities.md`, interview question, SDLC template), label taxonomy creation.
- Tracker contract — new operation **approve-pending-runs** in `TEMPLATE.md`, `github.md`, `gitlab.md`, and the `linear.md` / `jira.md` delegations; installed `.ai/trackers/github.md` copy.
- Repo docs — `docs/skills/om-merge-buddy.md`, README rows, `SDLC.md`, `.ai/agentic.config.json`, `UPGRADE_NOTES.md`.

## Non-goals

- No change to the default (read-only) `om-merge-buddy` report mode.
- No relaxation of any merge gate: QA gate, required checks, blocking labels still apply; automation never applies `qa-approved`.
- No change to the default interactive merge flow or to `om-auto-review-pr` behavior. The requested follow-up adds an explicit automerge handoff to `om-approve-merge-pr` and makes existing-PR operations follow the actual target branch.

## Decisions

- The `automerge` label is a standing, human-given merge instruction; it counts as the confirmation `om-approve-merge-pr` asks for, never as an override of a refused gate or a stale QA head.
- Duplicate-work guard is generic: the three-signal `in-progress` claim plus an optional orchestrator check (active tasks referencing the PR) when the run executes under an orchestrator that exposes a task list (e.g. cezar's `runs list --json` `prRefs`). Missing orchestrator → check skipped and disclosed.
- The label is a top-level optional `automerge.label` key (default `automerge`), not a `labels.meta` entry, so older configs keep working and renaming it does not touch the taxonomy arrays; setup still creates it.

## Risks

- New tracker operation: custom descriptors lack it → mode degrades to reporting "pending approval" instead of approving runs.
- Autonomous merging: mitigated by delegating the final gate check to `om-approve-merge-pr`.

## Progress

PR: #158

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Tracker contract

- [x] 1.1 Add approve-pending-runs operation to tracker descriptors — 133791a

### Phase 2: Pipeline configuration

- [x] 2.1 Add automerge.label config key and label creation to om-setup-agent-pipeline — baa47b3

### Phase 3: Merge buddy automerge mode

- [x] 3.1 Add automerge mode to om-merge-buddy SKILL.md and references — 3093a1d

### Phase 4: Docs

- [x] 4.1 Update docs page, README, SDLC.md, config, and upgrade notes — 8dc3df5

### Phase 5: Review fixes

- [x] 5.1 Apply om-auto-review-pr findings — 00e1370

### Phase 6: Requested review and target-branch follow-up

- [x] 6.1 Fix the automerge self-approval handoff and trim the merge-buddy description — c26de23
- [x] 6.2 Use the PR target branch for base updates, merge gates, and merge destination — c26de23
- [x] 6.3 Validate the final branch and complete the review pass — ff575f3

- [x] Post-review fix: include automerge.label in the setup schema and field reference, preserving the skill size budget — ff575f3

### Phase 7: Carry-forward labels and autonomous continuation

- [x] 7.1 Preserve applicable labels and continue the automerge chain on every replacement PR — b1d48d6
- [x] 7.2 Validate and re-review the updated PR — b1d48d6

### Phase 8: Rewrite into om-auto-merge-buddy

Decisions:
- **Orchestrated mode, not duplication.** Each sub-skill gains one flag plus a `references/orchestrated-mode.md` loaded only when the flag is set. The orchestrator owns the claim, labels and CI waits; the sub-skill keeps its core logic in one place. Rejected alternatives: copying the review, QA and fix logic into the buddy (three-way drift), or extracting shared "core" files across skills (would break standalone installs, Cross-skill contract §4).
- **Signals are bound to the head SHA** in one status comment per PR, which also serves as the claim, label-rationale and summary comment. Labels alone are never trusted.
- **Default mode is `prepare-to-merge`**, the most reversible option. `prepare-and-merge` squash-merges with a head-SHA guard and the new `bypass-protection` form of **merge-pr**.
- **The QA signal reuses `om-auto-qa-pr`'s self-QA eligibility verdict**, so risk-high PRs still need a human. QA failures are fixed through the review autofix as `INHERITED` findings.

- [x] 8.1 Revert the om-merge-buddy automerge mode and the om-approve-merge-pr handoff — 305a59e
- [x] 8.2 Add the om-auto-merge-buddy skill, orchestrated mode in three sub-skills, the merge-pr bypass, the labels, config and docs — 83cbeda
- [x] 8.3 Merge the latest main and run the full validation gate — 83cbeda

## Follow-up validation and compatibility evidence

- Full configured gate: all seven commands passed on Python 3.14.4 with `TMPDIR=/tmp`. The cockpit normally puts temporary directories under a parent Git checkout; an external temporary root lets the existing no-Git UX fixture exercise its intended condition. No tests or assertions were changed.
- Real Git branch matrix: ran the documented fetch/merge commands in three disposable repositories targeting `release/1.2`, `feature/integration`, and `maintenance`, each with a divergent configured default. Every target tip became an ancestor of the PR head; default-only commits stayed excluded.
- Instruction walkthrough: default interactive self-approval still asks; validated automerge self-approval proceeds to the ordinary merge attempt; missing label/claim, another live claim, stale QA, conflicting QA labels, and required independent review all leave the PR unmerged. Retargeting invalidates gate readings; fork replacements preserve the original target. No live automerge was attempted.
- Standard references were compared with their peers. The self-approval/delegated-claim rules are merge-skill-specific, so they are not synced to other roles. Target-branch handling is synced through merge/fix/resume consumers; both setup SDLC templates stay aligned. Generic safety, markers, labels, and glossary rules are unchanged.
- Compatibility: optional `--automerge` handoff is additive; caller and callee ship together and an older callee stops with an upgrade blocker. No config keys, tracker operations, skill names, persisted Progress format, or chaining markers changed in this follow-up.

- Final code review: the major self-approval handoff and minor description-length finding from the external review are fixed. The additional setup-schema omission was fixed in `39f85b5` / `ff575f3`; the full seven-command gate passed again afterward. No actionable findings remain in this pass. GitHub cannot record an approving review from the PR author; report the local verdict honestly and leave independent reviewer requirements intact.

## Carry-forward follow-up verification

- Phase 7 copies the original PR's current applicable labels before closing it, including custom labels and the configured automerge label. It normalizes pipeline/priority/risk state, preserves human blocks and QA requirements, and creates fresh claim/QA state instead of copying approvals or another run's transient labels.
- The merge driver consumes the replacement's PR reference, updates all active PR and cleanup context, and continues review, CI, and guarded merging in the same invocation without a user restart. Author handback remains advisory in the automerge chain; standalone review/fix skills do not gain merge authority.
- Re-review walked the success path and failure cases: removed source automerge authorization, missing required labeling, conflicting QA requirements, stale QA evidence, competing ownership, and repeated replacements. Genuine gates and bounded waits remain enforced. These are instruction walkthroughs, not live carry-forward/merge executions.
- All seven configured validation commands passed again in order with `TMPDIR=/tmp`. Both SDLC templates match; same-name `claim-pr.md` and `pr-finalize.md` peer copies were compared. The explicit follow-up request authorizes syncing the applicable merge/review/fix consumers; unrelated skills' shared rules remain unchanged.
- Re-review verdict: approve (code review), no actionable findings. The author cannot submit a native approving review; the published comment review states that limitation and does not dismiss the independent reviewer's state.
