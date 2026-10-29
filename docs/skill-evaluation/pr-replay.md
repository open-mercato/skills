# PR replay adapter

A review case is ordinary version-1 case JSON plus frozen context files. The core
CLI does not contact a tracker, infer PR state or submit reviews. A trusted
controller collects read-only evidence before `prepare`; the worker inspects
that frozen evidence under the same boundary as another skill's case.

Use exact PR base/head commit IDs in `source`. Fetch any missing commits locally
before preparing the experiment, without changing the source checkout's branch.
Freeze the following in a dedicated context directory, omitting credentials and
irrelevant discussions:

- PR metadata, description and changed-file inventory.
- Existing review comments/discussions, with timestamps and commit IDs so the
  worker can distinguish stale findings from current-head evidence.
- Current-head checks, the repository's actual relevant CI workflow identity,
  and available failure logs. Match the workflow ID/name and head commit; do not
  substitute a successful unrelated workflow or a skipped backport run.
- Applicable repository guidance, reference requirements and known evidence
  limits. Record unavailable/action-required logs explicitly rather than treating
  unavailable evidence as a passing check.

Example task (part of config, not instructions to mutate a PR):

> Review the frozen change using the assigned review skill. Read context metadata
> and current-head checks first, then compare source base/head. Apply local review
> extensions. Return a concise review description, verdict, evidence-backed
> findings, proposed tracker actions and limitations. Do not claim, label,
> comment, submit a review, autofix or change any external state. Distinguish a
> verified defect from a risk or a direction question. Retain material CI and
> compatibility qualifications in the generated description.

Do not give workers live tracker credentials or require source dependency
installation. If meaningful validation needs a writable runtime, provide existing
validation evidence as frozen context and disclose that the replay did not rerun
those checks. This adapter evaluates review reasoning/artifacts and proposed
actions; it does not certify the write-side PR workflow.

Choose diverse changes and include clean cases as well as known defects.
Natural PRs rarely have complete ground truth. Write each case's `expectations`
before the run: `mustFind` for defects a correct review must name, and
`mustNotClaim` for false claims seen in earlier runs (for example "no issues
found" on a PR with a known defect). Earlier reviewer disagreements make good
cases. The report then gives a paired pass rate next to the cost deltas.

Have an independent reviewer judge retained evidence, unsupported claims,
severity and usefulness using blinded artifacts. When the judge is a model:

- Give it only `judge/blinded-artifacts.json` — never `reports/` or `private/`.
- Use one fixed judge prompt and rubric for both arms.
- Judge each pair twice with the presentation order swapped, and treat a verdict
  that flips with the order as a tie.

Keep any native pilot in a separate named cohort from the CLI study.
