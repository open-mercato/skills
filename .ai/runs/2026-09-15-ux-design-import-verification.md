# Verified import for PR #106

## Decision and scope

The [replacement rollout gate proposed for #106](https://github.com/open-mercato/skills/pull/106#issuecomment-5667076965)
was [accepted by @matgren](https://github.com/open-mercato/skills/pull/106#issuecomment-5678863467).
The governing condition is the Rollout section of
`.ai/specs/2026-08-26-interactive-prototype-skill.md` (the specification merged in
#91). `blocked` remains until @pkarw confirms the revised condition and completes
fresh review of the current #106 head. This report does not grant approval.

The comparison was repeated on 2026-09-15 against the implementation at
`7e3a76671089f8ea047401dbd4d1ff59e8c75a1b`. The rollout amendment changes only
specifications and decision/evidence records; every file under `skills/om-ux-design/`
and both regression suites retains the content at that commit. If later changes
alter the implementation, update this comparison and its relevant checks.

## Pinned source and complete mapping

- Upstream repository: `open-mercato/open-mercato`.
- Source commit: `9ea83205be7447867c042bbcfd3caaa9b4cadfb5`.
- Source root: `.ai/skills/om-mockup-prototype/` at that immutable commit.
- Destination root: `skills/om-ux-design/` in this collection.
- Method: enumerate the source tree with `git ls-tree -r`, read each blob with
  `git show <commit>:<path>`, compare the bytes with the destination, and inspect
  the changes. Compare the parsed token data independently of provenance metadata.

Every row maps the same relative path beneath the source and destination roots.
All 13 source files have counterparts; none is omitted.

| Relative path | Result and accounted difference |
|---|---|
| `SKILL.md` | Changed: the detailed-design stage starts from a spec/backlog, uses actual product components and separates verification, acceptance and publication. Its neutral discovery counterpart keeps the name released in #107. |
| `references/assets/README.md` | Changed: records design sources, requirement/state coverage, simulations, verification and acceptance; explains review-operation preservation and portable-mode limits. |
| `references/assets/comments.js` | Changed: the prototype ID placeholder uses JSON serialization rather than a single-quoted HTML-escaped substitution. |
| `references/assets/components.css` | Byte-identical. |
| `references/assets/index.html` | Changed: replaces the product-specific backend shell with a neutral, explicitly unverified portable scaffold to adapt to the selected design. |
| `references/assets/prototype.css` | Byte-identical. |
| `references/assets/prototype.js` | Changed: validates stored documents and per-operation field types, preserves deletion/reply semantics despite reviewer clock skew, handles unusual screen IDs, and maintains navigation/history in presentation mode. |
| `references/assets/screens.css` | Byte-identical. |
| `references/assets/theme.css` | Byte-identical. |
| `references/ds-tokens.default.json` | The full `tokens` object is equal, including all 124 records. Only the `source` and `generator` provenance metadata differs. |
| `references/screen-patterns.md` | Changed: replaces one product's backend anatomy with a reference template populated from the consuming repository's actual screens/components. |
| `scripts/init-mockup.mjs` | Changed: configurable contained paths, explicit repository-root propagation, atomic/retry-safe initialization, output-context escaping, anatomy scaffolding and ownership checks. |
| `scripts/sync-tokens.mjs` | Changed: current and legacy token schemas, explicit source precedence, theme/alias validation, unsafe-input rejection, path containment and drift checks. |

The destination also adds eight local reference files: `agentic-setup.md`,
`design-contract.md`, `design-workflow.md`, `ds-tokens.md`, `prototype-format.md`,
`quality-gate.md`, `report-templates.md`, and `rules.md`. They provide the standalone
config loader, detailed-design workflow, compatibility/ownership conventions,
verification and reporting required by this collection; they are not missing
upstream imports. Their behavior is described in
`.ai/specs/2026-09-14-ux-design-skill.md` and the 2026-09-14 entry in `DECISIONS.md`.

## Verification

The current configured gate passed on 2026-09-15. Runner: local
Node.js v24.19.0 in an isolated checkout of this skills repository. No application
container or upstream checkout is required by its six validation commands.

| Configured command (in execution order) | Result |
|---|---|
| `bash scripts/lint.sh` | PASS |
| `node scripts/test-browser-providers.mjs` | PASS |
| `node scripts/test-tracker-providers.mjs` | PASS |
| `node scripts/test-classify-runs.mjs` | PASS |
| `node scripts/test-close-keywords.mjs` | PASS |
| `node --test scripts/test-ux-design.mjs scripts/test-ux-design-comments.mjs` | PASS: 38 tests, no failures or skips |

`git diff --check` also passed. Comparing `skills/`, `scripts/` and
`.ai/agentic.config.json` with `7e3a76671089f8ea047401dbd4d1ff59e8c75a1b`
confirmed that this amendment leaves implementation, tests and gate configuration
unchanged.

The checks exercise the actual shipped helpers and comment engine, including
source precedence, both token shapes, invalid snapshots, aliases and themes,
contained paths, atomic failure/retry, literal template values, discovery/detailed
ownership separation, comment persistence, export/reload, tombstones, re-anchoring,
clock skew and navigation. The DOM adapter tests do not establish visual fidelity.

Retained evidence from the [2026-09-14 proposal](https://github.com/open-mercato/skills/pull/106#issuecomment-5667076965)
and the PR's verification record:

- Three browser executions on `7e3a766`: an existing component runtime, no design
  system with portable HTML, and refresh of a prototype with existing feedback.
  The record reports flows inspected at 360px and 1280px, feedback export/reload,
  resolve/reopen, deletion preservation and separation between prototype IDs.
- The existing-runtime date-input check could not use CLI `fill`; it seeded the
  field through DOM events and verified real arrow-key changes. The portable
  execution used individual date-segment key presses. This limitation stays
  disclosed rather than being promoted to an unrestricted input-method pass.
- The pinned upstream baseline was reported to pass eight tests, including
  Chromium. The snapshot-validation defect discovered there is fixed in this
  collection; a separate patch is linked in the proposal for upstream #5832.

These browser and upstream-baseline results are retained historical evidence,
not new browser executions in this documentation-only amendment. Screenshots
and disposable fixtures were kept local in the earlier run and are not attached
here. The fresh comparison and collection gate above are independently repeated.

## 2026-09-29 re-review and gate confirmation

The fresh re-review merged `main` at `10b27b61d61be3cfcedcb0d0c451060782acae1c`.
Conflicts in `DECISIONS.md`, `UPGRADE_NOTES.md` and the installed-skill roster
were resolved as unions, retaining both the detailed-design records and `main`'s
GitLab/QA additions. The integration also synchronized the repository-installed
browser descriptor, restored the setup skill's size budget, and corrected the
collection count to 43 skills.

Review found that shallow comment-operation normalization still allowed a
malformed imported timestamp or message to crash a prototype containing valid
feedback. The engine now rejects invalid per-operation shapes, and a regression
test proves malformed committed/local operations are ignored without hiding the
valid thread. The complete configured gate then passed in order:

| Configured command | Result |
|---|---|
| `bash scripts/lint.sh` | PASS |
| `node scripts/test-browser-providers.mjs` | PASS |
| `node scripts/test-tracker-providers.mjs` | PASS |
| `node scripts/test-classify-runs.mjs` | PASS |
| `node scripts/test-close-keywords.mjs` | PASS |
| `node --test scripts/test-ux-design.mjs scripts/test-ux-design-comments.mjs` | PASS: 39 tests, no failures or skips |

As the original gate owner, @pkarw confirms the revised pinned-source condition,
accepts this mapping and evidence, and completed the required fresh review. This
satisfies rollout item 4: `blocked` can be removed when the approving review is
submitted. Upstream #5832 remains an independent follow-up; this collection is
the source for subsequent consumption.
