# Acceptance draft (step 6)

Some projects first decide whether they want a change from an outside
contributor at all, before review and CI time is spent on it. A workflow
marks those PRs with `prTriage.acceptanceLabel`, and a maintainer decides.
This step only drafts the answer for that maintainer.

It runs only when `prTriage.acceptanceLabel` is set and the PR carries it.

## Questions

Answer each one in one short line, from the PR, its linked issue and the
diff:

1. **Wanted?** Does the change fit what the project builds (agent
   instructions, specs under `SPECS_DIR`, the product brief when one exists)?
   Is there an agreed issue or spec?
2. **Size.** Reviewable as one PR, or should it be split? Name the split.
3. **Closed areas.** Does it touch paths the project closes to outside
   contributions, or paths that need a maintainer (code owners, CI and
   release files, paths the agent instructions call closed)?
4. **Contributor agreement.** When the project has one, is it signed or
   checked?

## Draft verdict

One of:

- **accept**: wanted, the right size, no closed area.
- **needs changes**: wanted, but the author must change something first;
  say what.
- **decline**: not wanted; one sentence a maintainer can reuse when closing.

A simple, low-risk fix (a typo, a small bug fix with a test, no new feature,
no closed area) also gets the line "Proposed for automerge" with the reason.

## Limits

- This skill never adds the acceptance decision, the automerge label or an
  approval. For an outside contribution, automation is never the only path
  to merge: the maintainer's label and review are the decision.
- The draft goes into the triage comment under **Acceptance (draft)**,
  rewritten in place on every run, like the rest of the comment.
