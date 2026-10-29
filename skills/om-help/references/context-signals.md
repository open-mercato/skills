# Context signals and delivery shapes (steps 2 and 6)

How `om-help` reads where the user is and turns that into a capability to look
up among the installed skills. The tables name **capabilities**, never
skills: step 6 resolves each capability to an installed skill by its
`description`, or to a skill the repository's routing data names for it
(precedence: `references/routing-sources.md`).

## Read the context (read-only)

```bash
git branch --show-current
git status --short
git log --oneline "origin/${BASE_BRANCH}..HEAD" 2>/dev/null | head -20   # skip when BASE_BRANCH is unknown
ls -t "${SPECS_DIR}" 2>/dev/null | head -10
```

When a tracker descriptor is installed: **current-user**, then **list-prs**
(open, authored by that user, fields `number,title,url,labels,isDraft,reviewDecision,headRefName`);
**get-pr** only on the PR whose head is the current branch, fields
`number,title,url,labels,isDraft,reviewDecision,mergeable,mergeStateStatus`
plus `body,assignees` **only when** the installed tracker descriptor's
**get-pr** operation documents those fields — used for claim detection (an
`in-progress` label plus a foreign assignee, or a claim comment quoted from
`body`'s linked issue). Degrade silently to the smaller field list when the
descriptor's **get-pr** does not name them; never fail the read over it.
Validate `BASE_BRANCH` and `SPECS_DIR` per the untrusted-content boundary
before interpolating them.

## `SPECS_DIR` classification

`ls -t "${SPECS_DIR}"` lists more than feature specs — classify by name
pattern before treating an entry as a spec to route on:

| Entry | Treat as |
|---|---|
| `product-brief.md` | `om-discover`'s product context, not a feature spec. |
| `backlog.md` | `om-backlog`'s tree output, not a feature spec. |
| `briefs/` | `om-brainstorm` handoff briefs, not feature specs. |
| `research/` | Supporting material (interview notes, synthetic-panel output), not feature specs. |
| `assets/` | Images/prototypes referenced by specs, not specs themselves. |
| `*-app-spec-*.md` | `om-app-spec-writing` output — whole-app requirements, not a per-feature spec. |
| Everything else | A candidate feature spec — read it and classify its state below. |

For each candidate feature spec, read enough to classify its state:

| Spec state | Route |
|---|---|
| An `Open Questions` block, or `⚠ NEEDS HUMAN CONFIRMATION` | Not ready — name what is open; no implementation route yet. |
| No implementation plan or phasing | `om-spec-writing` |
| No `${paths.analysis}/pre-implement-<slug>.md`, or one with a no-go verdict | `om-pre-implement-spec` |
| Ready (phased, and a go verdict on file) | `om-auto-implement-spec` |

## Signal → capability

| Signal | Capability to look for |
|---|---|
| Product-level question, no brief yet | product-context discovery (`om-discover`) |
| One idea, "should we build this?" | divergent exploration of a single idea (`om-brainstorm`) |
| Business requirements for a whole app, no existing product code | whole-app requirements authoring (`om-app-spec-writing`) |
| A folder of client docs to check against the platform | gap analysis against the platform (`om-gap-analysis`) |
| A screen, interaction state, or AI behavior to shape | UX shaping before a spec exists (`om-ux-shape`) |
| Task described, non-trivial, no spec, no PR | writing a specification (co-designed or autonomous) |
| Spec in `SPECS_DIR`, classified above | the route its state resolves to |
| Open PR with an unfinished execution plan on this branch | resuming an in-progress PR — see the autopilot boundary below |
| Uncommitted or unpushed changes on a hand-worked branch, no PR | running the validation gate and committing (`om-check-and-commit`) — it does **not** open a PR; no skill opens a PR for a branch with no issue/plan/brief behind it. Surface this divergence from `SDLC.md`'s PR-stage row rather than silently routing to a PR opener that does not exist for this case. |
| A single open PR, "what's left" / "finish it" / "drive it" | the autopilot boundary below |
| Reviewing a sweep of other authors' unreviewed open PRs | `om-review-prs` (skips the current user's own PRs by design) |
| Open PR, approved and all required checks green | merge-readiness — before recommending `om-approve-merge-pr`, check the QA gate (`needs-qa` without `qa-approved` blocks), a stale `QA head:` against the current head, the `qa` pipeline label (an active tester), and draft state; a PR failing any of these is not simply "ready to merge." |
| Issue id, bug report with an issue | fixing a tracker issue end to end (`om-auto-fix-issue`) |
| A pasted stack trace or error log with **no** issue id | symptom triage (`om-troubleshooter`), not root-cause analysis — `om-root-cause` is a chain step, never the direct recommendation (`references/flow-map.md` §a) |
| One new issue to capture for later | `om-prepare-issue` |
| A tree of issues from a brief or a spec's phasing | `om-backlog` (`--dry-run` writes nothing) |
| Existing issues needing labels/clarity, single or batch | `om-auto-manage-issues` |
| A PR or comment link, or a merged design PR with no `Implement:` issue | `om-followup-issue-from-pr` |
| UI files in the diff | UI verification in a browser; design review |
| Security report on one PR/spec/branch, vs. a window of merged PRs | `om-auto-sec-report-pr` vs `om-auto-sec-report` (`references/flow-map.md` §b) |
| Dependency advisories | `om-auto-audit-dependencies` |
| A QA plan for a window of merged PRs | `om-auto-qa-scenarios` |
| "Run the tests" / failing tests locally | running or writing tests; `om-smart-test` for affected-tests-only |
| No `.ai/agentic.config.json` and the user wants the pipeline | one-time pipeline setup (`om-setup-agent-pipeline`) |
| Question about how something works here | knowledge answer from the Task Router and `knowledge.sources` — `om-framework-context` owns and resolves that key when installed; its bounded standalone fallback otherwise (`references/agentic-setup.md`) |

## The `om-pr-autopilot` boundary

`om-pr-autopilot {prNumber}` owns diagnosing and driving **one** open PR
whose state is not already known — it reads ten read-only signals and runs
the matching chain itself. Send any single-PR "what's left / finish it /
drive it" request there (append `--dry-run` when the user is only asking,
never when they want it driven); never diagnose the PR here first. `om-help`
handles only what `om-pr-autopilot` does not cover:

- no PR yet for this work;
- a multi-PR queue (`om-review-prs` for unreviewed PRs, `om-merge-buddy` for
  merge-readiness across the queue);
- a hard block or a claim held by another actor — report it with ⚠️ and
  `Next: none` unless the user explicitly asked for `--force`;
- QA sign-off itself (route to the QA family in `references/flow-map.md` §b);
- design review (`om-ux-review-pr`);
- building a spec PR (`om-auto-implement-spec`);
- post-merge work (`om-close-fixed-issues`, `om-followup-issue-from-pr`).

## Delivery shapes (step 6)

Choose the smallest one that is safe; the shape decides how much planning and
automation the route carries, never which domain knowledge it needs.

| Request shape | Delivery |
|---|---|
| Explanation or analysis | read-only answer, grounded in files; no skill run |
| Discovery or shaping conversation, a user present | the matching interactive skill (`om-discover`, `om-brainstorm`, `om-ux-shape`, `om-app-spec-writing`, `om-gap-analysis`) — all need a user in the loop; say so |
| Small isolated change with clear behavior | the matching domain route directly; focused test and the validation gate |
| One-shot change delivered as a PR | an end-to-end PR-producing skill |
| Large change, or three or more independent steps | specification first, readiness review, then implementation |
| Existing spec to build | the spec-implementation route (`SPECS_DIR` classification above) |
| Issue intake | one new issue (`om-prepare-issue`) / a tree from a brief or phasing (`om-backlog --dry-run`) / existing issues (`om-auto-manage-issues`) / a PR or comment link (`om-followup-issue-from-pr`) |
| Tracker issue end to end | the issue-fix route (`om-auto-fix-issue`) |
| Existing diff or PR to judge | the review route |
| Unfinished PR | the `om-pr-autopilot` boundary above |
| A window of merged PRs | `om-auto-sec-report`, `om-auto-qa-scenarios`, `om-auto-update-changelog`, or `om-pipeline-retro`, per what the user asked about |

Escalate from direct work to spec-first when the scope crosses independent
capabilities, schema or public contracts, external providers, auth/security,
or several modules. The delivery shape never replaces a domain route the Task
Router requires: a one-shot PR on a data-model change still loads the
data-model guidance.
