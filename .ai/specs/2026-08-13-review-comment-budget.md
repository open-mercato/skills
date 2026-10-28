# Give PR review comments a bounded human-facing projection

## 📝 TLDR

The full `om-code-review` report serves two audiences poorly: autonomous fixing needs exhaustive structured findings, while a PR watcher needs a fast verdict and actionable blockers. This spec keeps the full report as the agent/chain artifact and defines a bounded PR-review projection with mandatory fields, one line per blocking finding, and lower severities shown only while budget remains. It is a separate capability from no-op review suppression. The maintainer approved the reporting-rule amendment and collection-wide standard-file sync during PR #80's review on 2026-08-13.

## 📝 Resolved decisions

- **D1 — Decision amendment: approved.** Amend the 2026-07-23 `DECISIONS.md` rule from “never compress” to “fill every mandatory field, explain every decision, then respect the channel's budget.”
- **D2 — Standard-file sync: all 34 copies.** The implementation PR updates every `references/rules.md` copy and each affected report-template preamble in the same change, following the binding sync procedure; no review-only exception or deferred sweep.

These decisions preserve mandatory content while avoiding contradictory behavior across independently installed skills.

## 📝 Problem Statement

Today `om-code-review` produces a complete structured report and `om-auto-review-pr` posts that report verbatim. The same content is also consumed by an autonomous caller that needs the mechanical verdict and full blocker/major detail.

The repository deliberately enforced verbose templates after runtimes produced inconsistent, under-explained reports. That decision solved a real problem, but the current rule conflates completeness with volume: green validation tables, empty breaking-change checklists, and detailed low-severity prose are mailed to every watcher even when the skimming decision fits in a few lines.

The desired outcome is a two-artifact contract:

- **Full report:** complete agent-facing output used by the current run, autofix reasoning, and terminal/session handoff.
- **PR projection:** a human-facing review body that preserves verdict, validation outcome, every blocker/major, finding counts, and actionable fixes within a channel-specific budget.

## 📝 Scope and non-goals

This spec owns only the review-body projection and its reporting-rule amendment.

It does not:

- decide when a re-review should run (see `.ai/specs/2026-08-12-review-noise-reduction.md`);
- implement delta-only/incremental review;
- change severity or verdict rules;
- introduce inline review comments or a new tracker operation;
- change chaining lines, CEZ task markers, claim markers, label semantics, or QA gates.

## 📝 Grounded contract inventory

The current repository does **not** list code-review headings in `BACKWARD_COMPATIBILITY.md` §5, and no checked-in consumer parses the emoji review headings. Current skill callers consume the explicit `approve` / `request changes` verdict and blocker/major findings as instructed behavior; `om-approve-merge-pr` uses tracker review state, and `om-review-prs` records the delegated skill's returned verdict.

The implementation will nevertheless preserve the following headings as a conservative compatibility measure:

- `# 🔍 Code Review:` / `Re-review:`
- `## Verdict`
- `## Findings`
- `### ⛔ Blocker`, `### ⚠️ Major`, `### 🔹 Minor`, `### 💅 Nit`

Before implementation, repeat the repository-wide consumer search and inspect any repo-local/session integration documented at that time. If an external parser is confirmed, add the format to `BACKWARD_COMPATIBILITY.md` and keep its previous parser shape accepted for at least one release cycle. Do not claim an undocumented parser exists.

## 📝 Proposed Solution

### Full agent-facing report

`om-code-review` continues to produce the full validation table, complete findings, internal breaking-change checklist results, and test-coverage analysis. Nothing in the severity model or validation gate is weakened. The autofix loop reasons over this artifact, not the shortened PR projection.

### Human-facing PR projection

`om-auto-review-pr` posts a deterministic projection:

```markdown
# 🔍 Code Review: <title>

## Verdict
❌ request changes — 2 blockers and 1 major. Validation: ✅ 1/1 configured commands passed.

## Findings

### ⛔ Blocker
- `path:88` — The scope id comes from caller input, allowing cross-scope access. Read it from the authenticated session instead.

### ⚠️ Major
- `path.test:1` — No regression test covers the denied cross-scope request. Add a case that proves the other scope remains inaccessible.

<details><summary>3 minor · 2 nits (2 shown within budget)</summary>

### 🔹 Minor
- `path:120` — …

### 💅 Nit
- `path:141` — …

3 additional low-severity findings are omitted from this PR projection and remain in the full run report.

</details>
```

Mandatory projection fields:

1. title and review/re-review mode;
2. verdict plus the finding counts that drive it;
3. configured validation pass count, or the failing-command rows when any fail;
4. every blocker and major with `file:line`, concrete failure, and fix;
5. total minor/nit counts, plus as many actionable lines as fit inside `<details>` after mandatory content;
6. test-coverage gaps when present;
7. the additive fingerprint marker when the noise-suppression spec is installed.

The internal Breaking-Changes checklist does not render when every item passed. An actual compatibility violation remains a blocker finding and therefore cannot be folded away.

### Budget and overflow

- Approve projection limit: 2,500 characters.
- Changes-requested projection limit: 6,000 characters.
- Blockers and majors are never deleted or semantically truncated to meet the limit.
- If the complete mandatory projection—title/mode, verdict/counts, validation, every blocker/major, test gaps, and optional fingerprint marker—exceeds the limit, render all mandatory content, state the exact overage, and omit all lower-severity detail.
- After mandatory content, render minor/nit lines in severity and source order only while the complete body remains within the limit. Then state exactly how many were omitted and that they remain in the full run report; never imply the PR projection is exhaustive.
- Each finding uses at most two sentences; a blocker may use a third sentence for the concrete failure mode.
- Budgets are measured by a fixture renderer so examples cannot silently drift beyond them.

The limits are grounded in this repository's most recent 30 PRs at design time. Non-trivial approved review bodies measured 907, 6,051, and 10,873 characters; changes-requested bodies measured 371, 3,999, 5,255, and 15,243. A 2,500-character approval limit forces the common skim path onto one screen, while 6,000 covers three of the four observed changes-requested reviews; mandatory blockers/majors remain the explicit exception.

This is not a token-saving exception to correctness. It is a channel contract: the full artifact remains exhaustive, while the notification artifact has mandatory information and a maximum presentation cost.

## 📝 Compatibility and instruction surface

Implementation must update every instruction that currently says the whole report is posted verbatim or that shortening any user-facing artifact is always defective. The known surface is:

- `skills/om-code-review/SKILL.md` (Contract and Output Format);
- `skills/om-code-review/references/output-format.md`;
- `skills/om-code-review/references/review-checklist.md` (internal checklist remains mandatory);
- `skills/om-auto-review-pr/SKILL.md` (workflow step 10 and Rules);
- `skills/om-auto-review-pr/references/verdict-and-labels.md`;
- `CODE_REVIEW.md` communication-template priority;
- `AGENTS.md` Cross-skill contract §3 and Skill authoring standard §2;
- `DECISIONS.md` 2026-07-23 entry and a new amendment entry;
- all 34 standard `references/rules.md` copies and every affected report-template preamble.

Before editing a standard file, enumerate and diff every same-named copy and list the 34 skills that will change. Apply the approved collection-wide sync in one PR and verify the shared Reporting-style text is byte-identical wherever it is intended to be shared.

No tracker descriptor, config schema, label, or operation changes.

## 📝 Edge Cases & Failure Scenarios

| Case | Behavior |
|---|---|
| Clean approval with no findings | Verdict and validation summary only; no empty severity or breaking-change sections |
| Validation failure | Show only failing command rows; the failure remains a blocker |
| Complete mandatory projection exceeds the limit | Exceed the limit rather than omit required content; state the exact overage and omit all lower-severity detail |
| Minor/nit-only approval within 2,500 characters | Show counts in the verdict and the actionable lines inside `<details>` |
| Minor/nit-only approval over 2,500 characters | Show lines in severity/source order while they fit, then report the exact omitted count and point to the full run report |
| Test gap | Render it as its actual major/blocker finding and include the Test Coverage subsection |
| Older `om-auto-review-pr` with newer `om-code-review` | Older caller may post the full report; correct but verbose |
| Newer `om-auto-review-pr` with older `om-code-review` | Projection adapter accepts the old full structure or fails open by posting it unchanged |
| Unknown/malformed full report | Do not guess or drop findings; post the full report and record the projection failure |

## 📝 Risks & Impact Review

| Risk | Severity | Mitigation |
|---|---|---|
| Projection omits a blocker | High | Mandatory severity parsing, fixture snapshots, fail-open to full report |
| Runtime divergence returns | Medium | Exact mandatory-field template plus fixture budgets; no prose-only “be concise” instruction |
| Partial upgrade breaks the chain | Medium | New caller accepts old full format; old caller can post new full report; malformed input fails open |
| Shared reporting rules contradict each other | Medium | Complete instruction-surface audit plus the approved all-34 standard-file sync |

Rollback restores verbatim posting. No tracker or repository state requires migration.

## 📋 Implementation Plan

1. **Carry the approved decisions into implementation.** Reference D1/D2 and the 2026-08-13 `DECISIONS.md` entry in the implementation PR.
2. **Add projection fixtures.** Cover clean approval, re-review mode, blockers, validation success/failure, minor/nit folding within and beyond budget, test gaps, over-budget blockers, old full format, malformed input, and the optional fingerprint marker; assert every mandatory field, omitted count, and character count.
3. **Rewrite `om-code-review` output ownership.** Update its `SKILL.md`, `output-format.md`, and checklist so the full internal artifact stays exhaustive and the projection schema is explicit.
4. **Update `om-auto-review-pr` posting instructions.** Change its `SKILL.md` and `verdict-and-labels.md` to post the projection while preserving full terminal/chain output and fail-open behavior.
5. **Update repository review law.** Amend both relevant `AGENTS.md` sections, `CODE_REVIEW.md`, and `DECISIONS.md`; preserve complete sentences, reasons, and mandatory templates while making the channel budget explicit.
6. **Perform the approved all-34 standard-file sync.** Enumerate every affected `rules.md` and report-template preamble, update them in the same PR, and verify byte-identical shared text where required.
7. **Re-audit consumers and compatibility.** Search the whole repository and documented session integrations; add backward-compatible parsing and a `BACKWARD_COMPATIBILITY.md` entry only for confirmed consumers.
8. **Validate and announce.** Run projection fixtures and every configured command; update `CHANGELOG.md` and `UPGRADE_NOTES.md` with the two-audience behavior and partial-upgrade fallback.

## 📋 Acceptance Criteria

- The full agent artifact still contains every configured validation result, finding, internal breaking-change result, and test-coverage conclusion.
- PR projections preserve the title and review/re-review mode, verdict, finding counts, validation pass count or failing rows, every blocker/major and concrete fix, lower-severity totals, test gaps, and the optional fingerprint marker; no clean checklist boilerplate renders.
- A lower-severity overflow fixture stays within the applicable limit, renders findings in deterministic order, reports the exact omitted count, and leaves every omitted line in the full agent artifact.
- Approve and changes-requested fixtures meet their limits unless the complete mandatory projection exceeds the limit; that fixture renders every mandatory field, an exact overage notice, and no lower-severity detail.
- Old/new mixed installations remain correct, with verbosity as the only allowed degradation.
- A malformed-report fixture posts the original full report unchanged and records the projection failure in the run/completion report so the fallback is visible.
- Repository-wide searches find no contradictory “post the whole report verbatim” instruction in the affected skills and no partially changed shared Reporting-style rule.

## 📋 Rollout

1. Carry the resolved D1/D2 decisions and the decision-record link into the implementation PR description.
2. Ship projection fixtures with the first implementation PR.
3. Compare the next ten real review-body lengths and verify every posted blocker against the full agent report.
4. Revert on any omitted blocker or malformed mixed-version handoff; rollback is documentation-only.
