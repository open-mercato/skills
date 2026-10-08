# Context signals and delivery shapes (steps 2 and 5)

How `om-help` reads where the user is and turns that into a capability to look up among the installed skills. The tables name **capabilities**, never skills: step 5 resolves each capability to an installed skill by its `description` (or to a skill the repository's routing data names for it).

## Read the context (read-only)

```bash
git branch --show-current
git status --short
git log --oneline "origin/${BASE_BRANCH}..HEAD" 2>/dev/null | head -20   # skip when BASE_BRANCH is unknown
ls -t "${SPECS_DIR}" 2>/dev/null | head -10
```

When a tracker descriptor is installed: **current-user**, then **list-prs** (open, authored by that user, fields `number,title,url,labels,isDraft,reviewDecision,headRefName`); **get-pr** only on the PR whose head is the current branch. Validate `BASE_BRANCH` and `SPECS_DIR` per the untrusted-content boundary before interpolating them.

## Signal → capability

| Signal | Capability to look for |
|---|---|
| Vague idea, "should we build this?", no artifact yet | divergent exploration before any spec or issue |
| Task described, non-trivial, no spec, no PR | writing a specification (co-designed or autonomous) |
| Spec in `SPECS_DIR` not yet implemented | implementing an existing spec |
| Open PR with an unfinished execution plan on this branch | resuming an in-progress PR |
| Uncommitted or unpushed changes, no PR | running the validation gate and committing; opening a PR |
| Open PR, no review yet | reviewing a PR |
| Open PR, reviewed, red CI / conflicts / changes requested | driving a PR to merge-ready |
| Open PR, approved and green | approving and merging |
| Issue id, bug report, error logs, stack trace | fixing a tracker issue end to end; root-cause analysis first when the cause is unknown |
| UI files in the diff | UI verification in a browser; design review |
| Work to capture for later | filing a well-formed tracker issue |
| "Run the tests" / failing tests locally | running or writing tests |
| No `.ai/agentic.config.json` and the user wants the pipeline | one-time pipeline setup |
| Question about how something works here | knowledge answer from the Task Router and knowledge sources (no skill) |

## Delivery shapes (step 5)

Choose the smallest one that is safe; the shape decides how much planning and automation the route carries, never which domain knowledge it needs.

| Request shape | Delivery |
|---|---|
| Explanation or analysis | read-only answer, grounded in files; no skill run |
| Small isolated change with clear behavior | the matching domain route directly; focused test and the validation gate |
| One-shot change delivered as a PR | an end-to-end PR-producing skill |
| Large change, or three or more independent steps | specification first, readiness review, then implementation |
| Existing spec to build | the spec-implementation route |
| Tracker issue end to end | the issue-fix route |
| Existing diff or PR to judge | the review route |
| Unfinished PR | the resume or drive-to-merge route |

Escalate from direct work to spec-first when the scope crosses independent capabilities, schema or public contracts, external providers, auth/security, or several modules. The delivery shape never replaces a domain route the Task Router requires: a one-shot PR on a data-model change still loads the data-model guidance.
