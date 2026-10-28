# PR finalize — open or reuse, labels, evidence, summary comment, markers

The single procedure for the "commit → push → open (or reuse) the PR → normalize labels → evidence → summary comment → chaining reference lines" mechanics (steps 6 and 7 of the skill body). The point is **one** implementation of PR opening + labeling, reused rather than copied, and never a second PR for work that already has one.

## Never open a duplicate PR

Before opening anything, check whether a PR already exists for this branch (or, in an issue-driven run, one that references the issue) via **search-prs** / **get-pr**. If one exists, **reuse it** — push new commits to its head branch and update its body/labels — never open a second PR. Only the skill that first opens the PR owns opening it; everyone else updates that same PR.

## Prefer the `om-open-pr` skill when installed

`om-open-pr` already implements exactly this: it commits the worktree, pushes the branch, opens a **ready-for-review** PR against `$BASE_BRANCH` (draft only with `--draft`) with the unified body template, applies the full SDLC label set (pipeline `review`, category, QA meta, one priority, one risk) through the descriptor guards with rationale comments, posts the caller's summary comment, and (in an issue-driven run) hands the issue back and releases the `in-progress` lock — emitting the `PR:` / `Issue:` chaining reference lines. When it is installed, **delegate to it** instead of re-deriving the steps:

- Issue-driven run: invoke `om-open-pr {issueId} documentation --title "docs(specs): ${TITLE}"` (add `--draft` when the high-stakes guard applies) and capture the PR number and URL from its `PR:` reference line.
- Brief-driven run (no issue): invoke it without `{issueId}`; the issue-handback and lock-release parts don't apply.

## Graceful fallback when `om-open-pr` is NOT installed

`om-open-pr` is an **optional** enhancement — a repo may install this skill without it, and it must still work. When `om-open-pr` is absent, perform the mechanics inline:

1. Commit the worktree changes with a conventional-commit subject; push the branch.
2. Open the PR via the tracker operation **create-pr** against `$BASE_BRANCH`, with the spec-PR body template below.
3. Normalize labels per the section below.

Detect availability simply: if invoking `om-open-pr` is not possible in this environment (skill not present), take the inline path. Behavior is identical either way — the same PR, the same labels — so installing `om-open-pr` only removes duplication, it never changes the outcome.

## Ready vs draft

Open the PR **ready for review** — the spec PR is the finished deliverable of this run, not a work-in-progress handoff. Draft only when the high-stakes guard applies: any assumption carrying `⚠ NEEDS HUMAN CONFIRMATION` converts (or keeps) the PR draft, and the body states that merge is gated on confirming those assumptions.

## PR body

Title: `docs(specs): ${TITLE}`. This body is the canonical explanation of the
proposal. Aim for 150–300 words, less for a small spec; omit empty sections.
Describe proposed behavior as proposed, and ground claims in the spec or code.

```markdown
Refs #{issueId}
Source doc: ${SPEC_PATH}
Status: complete

## 🎯 What changes
{Who would gain what capability, what happens today, and why the change is needed.
State that this PR delivers the design; implementation follows separately.}

## 📋 Scope
{Where the proposal lands and how it affects shared systems or current consumers.
Name dependencies on future work when they determine whether the design pays off.}

## ⚠️ Decision needed
{Only if relevant: the direction call or assumption to confirm, the recommended
choice and its tradeoff. Link the defaults comment for the full resolved table.
Include every `⚠ NEEDS HUMAN CONFIRMATION` merge gate here.}

## 💥 Compatibility
{Only when proposed contracts, schema, defaults or dependencies will be costly
to reverse: who would be affected and the migration/rollback limits.}

## 🧪 Validation
{Design checks actually completed and remaining uncertainties. Link current-app
screenshots and proposed-UI mockups, clearly distinguished; if expected visuals
could not be produced, state why. Do not imply mockups prove working behavior.}
```

Omit `Refs` when no issue exists; never use `Closes` on a spec PR. Preserve the
`Source doc:` and `Status:` fields, and state any draft/merge gate in the body.
Use a small Mermaid dependency/flow diagram only when it explains system reach;
label existing/new/planned components and add one prose takeaway. Distinguish
observed facts, inferences and behavior not checked. Cite a specific repository
rule for any claimed violation; a direction preference is not a code defect.

## Label normalization

Apply labels from the config's taxonomy after opening the PR, always through the `apply_label` guard from the tracker descriptor (missing labels degrade to a logged skip; `labels.enabled: false` skips everything — note that in the summary comment).

For a spec PR the set is: `review` (pipeline), `documentation` (category), `skip-qa` (docs-only — a spec PR changes no runtime behavior), exactly one priority (inferred from the brief/issue), exactly one risk (typically `risk-low` for design-only changes). Never both `needs-qa` and `skip-qa`; never `qa-approved` from this skill. After applying the set, post exactly **one** marker-idempotent consolidated rationale comment — never one comment per label (that spams the PR timeline and multiplies tracker API calls). Labels are still applied individually through the `apply_label` guard; only the commentary consolidates. **One label per line**, each with its emoji and a full-sentence reason; on any later label change, find the marker via **list-issue-comments** and rewrite this same comment via **update-comment** — never post an additional per-change comment:

```markdown
🤖 `om-auto-write-spec` — 🏷️ label rationale

- 🔍 `review` — ready for specification review.
- 📚 `documentation` — lands a spec document, design-only.
- ⏭️ `skip-qa` — docs/design-only, no runtime behavior to QA.
- 🔹 `priority-medium` — {why this priority}.
- 🟢 `risk-low` — {why this risk}.
```

## Evidence comment

After the PR exists, publish the step-5 visuals via **attach-image-evidence**: `{prNumber}`, a short scenario report (a table mapping each image to its screen and current/proposed role), slug `spec-${SLUG}`, and the image paths — so they render inline on the PR, the same mechanism `om-auto-qa-pr` uses. When the descriptor cannot render inline, it still posts the comment with links — surface the limitation, don't fail.

## Summary comment

Update the marker below via **update-comment** on a rerun; use **comment-pr**
with a body file only when absent. Aim for 40–100 words: publication state,
remaining decision and handoff, with a link to the canonical PR body. Never
repeat its scope, visual inventory or label rationale; never include secrets.

```markdown
## 🤖 `om-auto-write-spec` — run summary

**Final status:** {complete | draft — merge gated on ⚠ assumptions}
{The spec is ready for review, or name the assumption that keeps it draft.}
{Only when relevant: link to the resolved defaults or visual evidence needed for the decision.}
[Proposal and scope]({PR URL})
Implement with `om-auto-implement-spec ${SPEC_PATH}`; use
`om-auto-continue-pr {prNumber}` for further design work on this PR.
```

## Marker emission

End the run's final report with the chaining reference lines, one per line, exact shape — include `Issue:` only when the run is issue-driven:

```
Issue: #<issue number> (link: <full issue URL>)
PR: #<PR number> (link: <full PR URL>)
Spec: <repo-relative spec path>
```

Chained consumers (`om-auto-implement-spec`, `om-auto-review-pr`, orchestration scripts) parse these exact text markers — never rename, translate, or decorate them.
