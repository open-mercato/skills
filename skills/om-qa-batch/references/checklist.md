# Checklist: which PRs a human checks (steps 3-5)

## Run the classifier

`scripts/classify-batch.mjs` reads JSON on stdin and writes buckets as JSON.
It makes no tracker calls and no writes.

```json
{
  "config": { "...": "the whole loaded .ai/agentic.config.json object" },
  "baseBranch": "<resolved base branch>",
  "batchBranch": "<batch head branch, or null for --range/--since>",
  "automationIdentities": ["<login of the review automation>"],
  "prs": [{
    "number": 123, "title": "...", "url": "...", "author": "login",
    "baseRefName": "...", "headSha": "<full sha>",
    "labels": ["needs-qa", "..."],
    "qaApproval": { "head": "<full tested sha>", "human": true },
    "files": [{ "path": "src/app/page.tsx", "status": "added" }],
    "comments": [{ "author": "login", "body": "...", "createdAt": "...", "updatedAt": "..." }]
  }]
}
```

`automationIdentities` lists the logins the review automation posts as, so
their `qa-triage v1` blocks are trusted next to
`humanQaPolicy.trustedTriageAuthors`. A block is used only when its `head`
equals the PR's `headSha`. Logins compare case-insensitively, without an
`app/` prefix or `[bot]` suffix.

`qaApproval` is optional. Supply it only from the latest qualifying QA grant
or scope-reconfirmation comment that actually vouches for the current
`qa-approved` label, after checking the author and approval provenance.
Never use an arbitrary comment containing `QA head:` or an older matching
line to override newer evidence. Unknown provenance/head → omit it; a
present approval without matching evidence stays must-test. `human` is
true only for a verified human grant, never self-QA or a custom label.
Malformed or head-unbound triage records are ignored.

## Buckets

| Bucket | Meaning | In the checklist |
|---|---|---|
| `gateMissed` | Has a failed verdict, stale/unverified approval, an unanswered human QA gate, or trusted human triage without a qualifying human grant. It reached the base branch without the tester it required. | Must test, first. |
| `batchCheck` | Carries `humanQaPolicy.batchCheckLabel`, or trusted triage chose the batch lane. | Must test. |
| `candidates` | A path, file-count, new-UI-file, feature or missing-evidence signal fired. | Agent decides (below). |
| `coveredHuman` | A qualifying human approval is pinned to this head. | Appendix; re-check only when a later PR in the batch touches the same area. |
| `coveredAuto` | Automatic QA evidence label present. | Appendix. |
| `noManualQa` | `skip-qa`, or no UI file changed. | Appendix; the smoke and CI cover it. |
| `stabilization` | Merged into the batch branch, or into an earlier batch branch (any base starting with `qaBatch.branchPrefix`) after its green tag, with no manual-QA signal or UI change. | Covered appendix. Other stabilization fixes use the normal QA buckets, including on the first checklist. |
| `otherBase` | Merged into another branch that is neither the base nor a batch branch (a release line). | Appendix. |

A fix merged into the current batch before the first `--start` is part of
the initial tested build. Classify it by the same verdict, lane and UI
rules as a base PR; `stabilization: true` records its provenance without
exempting it from testing. A failed verdict always stays must-test.
`--retest` narrows the commit range; the base branch alone never does.

## Agent judgment on `candidates` (step 4)

Read each candidate's diff (sample large ones) and its QA instructions. Keep
it when a user of the product would see or do something differently in a
way automatic QA cannot judge well: a new or rearranged screen, a changed
flow, a customer-facing page, a changed message the user acts on, drag and
drop, keyboard or focus behavior, responsive layout, printing. Drop it when
the visible change is trivial and already covered by recorded evidence, or
when the UI file is a type-only, test-only or internal refactor. One line of
reason for each, kept or dropped; dropped candidates go to the appendix with
that reason.

## Where to click (step 4)

Per kept PR, in this order of sources:

1. The review automation's QA test instructions comment on the PR.
2. Testing notes in the PR body.
3. The changed routes and components in the diff, mapped to screens through
   the repository's own docs and routing files.

Write: **where** (screen and path), **verify** (action → expected result),
**can go wrong** (one or two concrete symptoms). An unresolved route is
written as unresolved with the entry file. Never invent one.

## Grouping and order (step 5)

1. ⛔ Open blockers from earlier batches: **search-issues** open, labelled
   `qaBatch.blockerLabel`. Retest them first; a fixed one is closed by the
   tester after the retest passes.
2. 🧪 Smoke: the repo file at `qaBatch.smoke`. When unset, the generic
   smoke: the app starts after migrations; sign in and out; open the main
   list screens; create, edit and save one main record and reload it; run
   the main business flow end to end once; a second organization or tenant
   cannot open the first one's record by URL when the product has tenants.
3. ⚠️ Must test: `gateMissed`, then `batchCheck`, grouped by area (the
   classifier's `areas`), then by priority label.
4. 🔍 Agent-picked: kept candidates, grouped the same way.
5. ✅ Covered appendix: every other PR with its bucket reason, plus counts.

Keep the must-test part short enough to finish in one session: when it
holds more than about 15 PRs, say so at the top and list the order to take
them in, highest priority first, so a partial pass still covers the riskiest
part.
