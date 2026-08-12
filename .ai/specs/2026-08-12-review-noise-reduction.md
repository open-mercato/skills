# Reduce auto-review noise on PRs — suppress no-op re-reviews and cap review-comment volume

## 📝 TLDR

The auto-review pipeline currently speaks when nothing changed, and when it does speak it says far too much. A daily rebase on a long-lived PR rewrites every head SHA, which is the only signal `om-auto-review-pr` uses to decide "there are new commits", so the PR collects a fresh full review per rebase; a PR left un-rebased collects periodic conflict comments instead. Separately, the posted review body is the complete `om-code-review` report reproduced verbatim, and the collection's own rules forbid shortening it. This spec introduces a **rebase-invariant diff fingerprint** as the re-review trigger, a **quiet mode** for deltas that carry no review signal, **state-as-status-comment** for conflicts and red CI, an opt-out label, and a **two-audience split** where the full report stays with the agent and the PR gets a budgeted summary. Design only — no implementation here.

## 📝 Problem Statement

Feedback from the OM Core channel, 2026-08-11/12:

- **Maciej Dudziak** rebases long-lived module PRs on `develop` daily so they stay conflict-free while waiting for manual QA. Every rebase produces another full auto-review; the PR accumulates roughly ten long AI comments and the message he left for the QA reviewer is buried. When he stops rebasing, the automation instead posts recurring conflict comments. His ask, verbatim: the skills should sense the diff context between the previous review and the current one, and stay quiet for rebases and CI-only tweaks — "maybe it's enough to tell the skills that such cases exist".
- **Patryk Lewczuk** (three 👍): the volume of generated text per comment is far too high; reading it costs tokens and most of it is filler. He does not read most of it.
- **Maciej Gren**: agrees, believes it is fixable at the skill level.
- **Piotr Karwatka**: agrees — "I almost never read this."

These are two independent defects that happen to share a blast radius.

### Defect 1 — the automation speaks when nothing changed

| Where | What it does today | Why it misfires |
|---|---|---|
| `skills/om-auto-review-pr/references/pr-metadata.md` §3 | Re-review is triggered when "the PR head SHA changed after that review" | A rebase rewrites every SHA while the PR's net diff against its base is byte-identical. The skill has no way to see "same content, new SHAs". |
| `skills/om-auto-review-pr/references/early-exit-checks.md` §4a | `CONFLICTING`/`DIRTY` → submit a changes-requested review and stop | The review is submitted afresh on every pass. Nothing deduplicates against the identical review submitted an hour earlier for the identical conflict. |
| `skills/om-auto-review-pr/references/early-exit-checks.md` §4b | Any failing required check → submit a changes-requested review listing them | Same: a flaky check that stays red produces one review per pass. |
| `skills/om-auto-review-pr/references/verdict-and-labels.md` "Author handoff" | Every changes-requested outcome, "including early exits", posts a handoff comment | Multiplies defect 1 by one extra comment per pass. |

Comment budget for a single pass today: claim comment, `🏷️ label rationale`, the review body, the author handoff, the completion comment, and — on an approving pass of a `needs-qa` PR — the manual-QA route template. Up to six entries. Multiply by a daily rebase over a two-week QA wait and Maciej's observation is arithmetic, not exaggeration.

### Defect 2 — when it speaks, it says too much

Verbosity is not drift; it is a written rule in four places:

- `skills/om-code-review/references/output-format.md`: *"Never compress the report to save tokens, and never shrink a section to a bare verdict."*
- `references/rules.md` "Reporting style", duplicated across 34 skills: *"terser improvisations are a defect"*.
- `AGENTS.md` §3, which restates the same rule collection-wide.
- `skills/om-auto-review-pr/references/verdict-and-labels.md`: the review body **is** the full `om-code-review` report reproduced verbatim — *"do not condense it into a fresh short summary"*.

Two structural consequences:

1. **The agent-facing report and the human-facing PR comment are the same artifact.** Everything the reviewing agent needs to reason and to hand off to `om-auto-fix-pr` is also mailed to every PR watcher. This is the root cause; the rest is symptom.
2. **Sections render unconditionally.** `output-format.md` prints a ten-item Breaking-Changes checklist on every review, including a two-line docs fix that breaks nothing, and demands a Test Coverage narrative even when coverage is fine.

### The decision this spec revisits

`DECISIONS.md`, 2026-07-23, *"Reporting is template-based and deliberately un-laconic"*: output quality had diverged by runtime — rich on Claude, terse on Codex — because report shapes were inline prose carrying the word "concise". The fix was templates plus binding "never compress" rules.

**That decision was right about the mechanism and wrong about the lever.** What made Codex output poor was the absence of an enforced *structure*, not the absence of *volume*. A template with mandatory fields and a hard character budget fixes runtime divergence in exactly the way the original decision intended, while removing the licence to pad. This spec therefore keeps template-driven reporting and replaces "never compress" with "fill every mandatory field, then stop" — see Resolved assumption **A3**, which is flagged for human confirmation because it amends a recorded architectural decision.

## 📝 Proposed Solution

Five changes, ordered by how much relief they buy per unit of risk.

**1. Fingerprint the diff, not the commits.** Before deciding review vs. re-review vs. no-op, compute a rebase-invariant identity for what the PR actually proposes:

```
BASE_SHA=$(git merge-base origin/<baseRefName> <headSha>)
FINGERPRINT=$(git diff "$BASE_SHA" <headSha> | git patch-id --stable | cut -d' ' -f1)
```

`git patch-id --stable` hashes the patch content while ignoring commit SHAs, author, date, message, and absolute line numbers — it is designed for exactly the question "is this the same change, rebased?". The value is persisted in the submitted review body as an HTML comment:

```html
<!-- om-review: v=1 fingerprint=<40-hex> base=<baseRefOid> head=<headRefOid> files=<n> -->
```

On the next pass the skill reads the newest own-marker review body, parses the fingerprint, and compares. **Identical ⇒ NO-OP**: no review, no comment, no label mutation, no worktree, no validation run. The run reports the no-op in the terminal and exits.

**2. Classify the delta when the fingerprint did change.** A changed fingerprint is not automatically review-worthy. Compare the changed-file set between the two fingerprinted states and classify:

- **`no-signal`** — the delta touches only CI/workflow definitions, lockfiles, changelog/release notes, or is whitespace-only (`git diff -w` between the two states is empty). Run **quiet mode**: no review submitted, no label mutation; the single status comment gains one line recording that the PR moved and why no review ran.
- **`code`** — anything else. Run the normal review, scoped per Phase 3 to the delta.

Whitespace/formatting-only is deliberately in `no-signal`: a formatter run is exactly the case Maciej describes, and a formatter that changes semantics is a formatter bug, not a review finding.

**3. Treat conflicts and red CI as state, not as reviews.** Both early exits stop submitting reviews. Instead they maintain one marker-idempotent status comment, updated in place via **update-comment**, keyed by the condition plus the base SHA it was observed against:

```markdown
🤖 `om-auto-review-pr` — status

⛔ **Merge conflicts** with `develop` (as of `a1b2c3d`) — review paused until they are resolved.
Last full review: [#123 review](url) · fingerprint unchanged since 2026-08-10.
```

Re-observing the same condition against the same `baseRefOid` rewrites the comment (or does nothing when the body is unchanged); it never posts a second one. A pipeline label still moves, because labels are the machine-readable signal and they are free of notification cost. The author handoff comment fires only on a **substantive** changes-requested verdict — never on a conflict or CI early exit, which the author can already see in the tracker's own UI.

**4. `do-not-review` opt-out.** A read-only label, outside `.ai/agentic.config.json`'s taxonomy, following the `do-not-close` precedent (`skills/om-setup-agent-pipeline/SKILL.md`): skills only ever read it, so no consumer repo needs a config migration. Present ⇒ `om-auto-review-pr` exits before claiming, and `om-review-prs` filters the PR out of its queue. This is the manual escape hatch for a PR parked on someone else's QA — the case where even correct automation is unwanted.

**5. Split the two audiences.** `om-code-review` keeps producing its full report; that report stays the agent-facing artifact consumed by `om-auto-fix-pr` and the autofix loop, and is what the run prints to the terminal. What gets **posted** is a new budgeted projection of it:

```markdown
# 🔍 Code Review: <title>

## Verdict
❌ request changes — 2 blockers, 1 major. Validation gate: ✅ 1/1 green.

## Findings

### ⛔ Blocker
- `packages/core/src/auth/session.ts:88` — the tenant id is read from the request body instead of the session, so a caller can read another tenant's sessions. Take it from `ctx.session.tenantId`.
- `packages/core/src/auth/session.ts:141` — the new branch returns before the audit-log write, so revocations are unlogged. Move the write above the early return.

### ⚠️ Major
- `packages/core/src/auth/session.test.ts:1` — no regression test covers the revocation path; add one asserting the audit entry.

<details><summary>3 minor · 2 nits</summary>
…
</details>
```

Rules for the projection:

- Every finding is one line: `` `path:line` `` — what is wrong → the fix, at most two sentences. Blockers may take a third sentence for the concrete failure they cause; nothing else may.
- The validation gate is one line when green; the table renders only when something failed, and then only the failing rows.
- The Breaking-Changes checklist is **not** rendered. It stays a mandatory internal check in `review-checklist.md`; only actual violations appear, as findings, at their real severity.
- Test Coverage renders only when there are gaps.
- Minor and nit sections are collapsed inside `<details>`.
- Character budget: ~2,500 for an approving review, ~6,000 when blockers exist. Overflow goes into `<details>`, never into deletion of a finding — a review that cannot fit is a review with too many findings, and it says so in one line.
- Parsed anchors are unchanged: the `# 🔍 Code Review` heading, the `## Verdict` section, and the severity headings `### ⛔ Blocker` / `### ⚠️ Major` / `### 🔹 Minor` / `### 💅 Nit` keep their exact text.

## 📝 Architecture

Nothing in this collection is a running service; the "architecture" is which skill owns which decision and what state survives between runs.

```
om-review-prs ──filters do-not-review──┐
                                       ▼
                          om-auto-review-pr  ◄── the only owner of the
                            │                    speak/stay-silent decision
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  gate: fingerprint    gate: delta class   gate: do-not-review
  (rebase-invariant)   (no-signal | code)  (human opt-out)
        │                   │
        └────── speak ──────┘
                │
                ▼
          om-code-review  ──full report──►  agent / terminal / om-auto-fix-pr
                │
                └──budgeted projection──►  the PR comment
```

**Where the decision lives.** All suppression logic lands in `om-auto-review-pr` — one owner, one place to audit. `om-review-prs` only gains the `do-not-review` filter (a cheap pre-filter; the authoritative check still runs inside the review skill, so a direct `/om-auto-review-pr 123` invocation cannot bypass it). `om-code-review` gains the projection format and loses the never-compress instruction; it does not learn about fingerprints.

**Where the state lives.** In the PR itself, in the review body's HTML marker. No sidecar file, no `.ai/` state, no tracker-specific storage — the state travels with the artifact it describes, is visible to a human who views source, and needs no new tracker operation. Reading it uses **get-pr** (`reviews[].body`), which every descriptor already provides.

**Reused primitives, not new ones.** Marker-idempotent comments via **list-issue-comments** + **update-comment** already exist for `🏷️ label rationale`; the status comment is the same pattern with a different marker. The label guards, the claim protocol, and `set_pipeline_label` are untouched.

## 📝 Data Model

One record, embedded in each submitted review body:

| Field | Type | Meaning | Absent ⇒ |
|---|---|---|---|
| `v` | int | Marker schema version, currently `1` | pre-marker review; treat as unknown |
| `fingerprint` | 40-hex | `git patch-id --stable` of `merge-base(base, head)..head` | cannot compare; fall back to head-SHA semantics |
| `base` | 40-hex | `baseRefOid` at review time | conflict-state dedup falls back to always-report-once-per-run |
| `head` | 40-hex | `headRefOid` at review time | diagnostic only |
| `files` | int | Changed-file count, for a cheap sanity check | diagnostic only |

Read path: **get-pr** → `reviews[]` filtered to `$CURRENT_USER` → newest body containing `<!-- om-review:` → parse. Write path: the marker is appended to the review body at submission.

The status comment carries its own marker line, `condition=<conflict|ci-red> base=<sha>`, in the same HTML-comment form.

No PII, no credentials, nothing that is not already public in the PR.

## 📝 API Contracts

**Unchanged, and deliberately so** (`BACKWARD_COMPATIBILITY.md` §5 — these are parsed by `om-auto-fix-pr`, `om-approve-merge-pr`, `om-review-prs`, and session orchestrators such as cezar):

- The `# 🔍 Code Review` heading and the `Re-review:` title variant.
- The `## Verdict` section and the words `approve` / `request changes`.
- The severity names and headings blocker / major / minor / nit.
- The chaining reference lines `PR: #<n> (link: <url>)` and `Issue: #<n> (link: <url>)`.
- Every tracker operation and label guard. **No new tracker operation is introduced** — a deliberate constraint, since adding one would require updating `TEMPLATE.md` plus every shipped descriptor in the same PR (§3 of the compatibility contract).

**Additive:**

- The `<!-- om-review: … -->` marker. An older installed skill copy ignores unknown HTML comments — it renders as nothing and parses as nothing. A newer skill reading a review body written by an older copy finds no marker and falls back to today's head-SHA behaviour, which is correct-but-noisy rather than wrong.
- The `do-not-review` label, read-only and outside the taxonomy.

**Changed, and requiring the sync procedure of `AGENTS.md` §5:**

- `skills/om-code-review/references/output-format.md` — rewritten around the projection.
- The "Reporting style" bullet in `references/rules.md`. That file exists in **34 skills** with 23 distinct contents (one group of 12 identical copies, the remaining 22 locally drifted), so a blanket rewrite is 34 diffs plus 34 review passes. Resolved assumption **A1** scopes the change to the four skills that actually post review bodies — `om-code-review`, `om-auto-review-pr`, `om-review-prs`, `om-auto-fix-pr` — plus `AGENTS.md` §3, and leaves the other 30 copies untouched until a separate sweep. Under-syncing here is safe: an unchanged copy keeps today's behaviour.

## 📝 UI/UX

The PR comment *is* this feature's user interface, and its design goal is a single screen a reviewer reads without scrolling.

**Notification budget per pass, before → after:**

| Situation | Today | After |
|---|---|---|
| Rebase, no content change | full review + handoff + completion + labels | nothing |
| CI-config-only tweak | full review + handoff + completion | one line inside the existing status comment |
| Conflicts observed again | changes-requested review + handoff | status comment rewritten in place |
| Real code change, approve | full report (often 8–15k chars) | ≤ ~2,500 chars |
| Real code change, blockers | full report | ≤ ~6,000 chars, minors/nits folded away |

**Comment consolidation.** The claim comment, the completion comment, and the state notices merge into the single `🤖 om-auto-review-pr — status` comment updated in place; `🏷️ label rationale` stays separate (it is a different concern with its own idempotency rule elsewhere in the collection). A pass that ends in a real verdict therefore posts at most: one review + one status update + one label-rationale update, versus up to six entries today.

**Reading order.** Verdict first, blockers second, everything else behind a fold. Piotr's "I almost never read this" is the acceptance criterion: the first two lines have to carry the decision.

## 📝 Edge Cases & Failure Scenarios

| Case | Behaviour | Rationale |
|---|---|---|
| No marker on the previous review (older skill copy, or a human deleted it) | Fall back to head-SHA semantics and review; write a marker this time | Degrades to today's behaviour, never to silence |
| `git patch-id` unavailable or errors | Log it, fall back to head-SHA semantics | Suppression must fail open — a spurious review is recoverable, a swallowed blocker is not |
| Binary files in the diff | `patch-id` hashes the binary-patch header, so a changed binary changes the fingerprint | Verified as part of Step 1.2's fixture set |
| Mode-only change (chmod) | Included in the patch text ⇒ fingerprint changes ⇒ classified `no-signal` unless a code file is also touched | Correct: a mode flip is not review-worthy on its own |
| Very large diff (>100k lines) | Fingerprint computed on the diff stream without materializing it; if the command exceeds a 60 s budget, fall back to head-SHA semantics | Bounded cost, fail-open |
| Force-push that reverts to a previously reviewed state | Fingerprint matches an *older* review ⇒ no-op | Correct: the content was already reviewed. The status comment records the head change so the history is not silent |
| Base branch advances underneath an unchanged PR | `merge-base` moves, so the fingerprint can change without the author doing anything. Delta classification then compares file sets and reports `no-signal` when the author's own files did not move | Prevents "develop moved" from becoming a review trigger |
| PR reopened after close | Treated as any other pass; the marker is still on the old review | No special case needed |
| Real blocker introduced by a whitespace-only formatter run | Not detected — accepted risk, mitigated by the whitespace check using `git diff -w` between the two fingerprinted states rather than trusting a commit message | Documented in Risks |
| `do-not-review` present on a PR with an unresolved blocker | Skill exits silently; the existing `changes-requested` label and review remain visible | The label is a human decision and outranks automation |
| Two reviewers' markers on one PR | Only markers authored by `$CURRENT_USER` are read | Prevents cross-automation interference |
| A finding set that cannot fit the budget | Render blockers and majors in full, fold the rest, and state the count that was folded | Never silently drop a finding |

## 📝 Risks & Impact Review

| Risk | Severity | Mitigation |
|---|---|---|
| **A real blocker is silently suppressed** — the fingerprint says "same" when the content differs | High | `patch-id --stable` is a git primitive with a decade of use in `git rebase`/`format-patch`; Step 1.2 adds fixture tests (rebase, force-push, whitespace, binary, mode, base-advance). Every suppression decision is logged in the terminal report, so a maintainer can always ask "why did it stay quiet". Fail-open on every error path. |
| **Quiet mode hides a genuine change misclassified as `no-signal`** | Medium | The classifier is path-based and conservative: anything not on the explicit `no-signal` list is `code`. The status comment records every quiet pass, so the suppression is visible rather than invisible. |
| **Shortened reviews drop context a human needed** | Medium | Nothing is deleted — it is folded into `<details>` or lives in the terminal report. The budget forces prioritization, not omission. Phase 2 ships behind team confirmation (assumption **A3**). |
| **Runtime divergence returns** (the 2026-07-23 problem: rich on Claude, terse on Codex) | Medium | The projection is a mandatory-field template with a *maximum*, not a prose instruction with a minimum. A missing mandatory field is a defect on any runtime; brevity beyond the fields is not. |
| **Partial upgrades in consumer repos** — new `om-auto-review-pr` with old `om-code-review`, or vice versa | Medium | The marker is additive and ignorable; the projection lives entirely inside `om-code-review`'s output file. A mixed install produces today's verbosity or today's noise, never a crash. |
| **The 30 unsynced `rules.md` copies drift further** | Low | Explicitly scoped and recorded here plus in `DECISIONS.md`; a follow-up sweep is filed when Phase 2 merges. |
| **`do-not-review` becomes a way to dodge review entirely** | Low | It suppresses *automation*, not the human review requirement or the QA gate; branch protection and `qaGate` are untouched. |

**Rollback story.** Each phase is independently revertible, and reverting is a documentation change with no migration: Phase 1 reverted means the skill goes back to head-SHA triggers (leftover markers become inert HTML comments); Phase 2 reverted means the full report is posted again. No state needs cleaning up, because the only state is a comment in a PR body.

**Blast radius.** Every OM Core engineer's PRs. This is why Phase 1 (behaviour, no format change) and Phase 2 (format contract) ship separately and are announced separately.

## 📝 Resolved assumptions (autonomous defaults)

| # | Question | Decision | Rationale |
|---|---|---|---|
| **A1** | Does the Reporting-style change touch all 34 `rules.md` copies or only the review skills? | **Only the four review-posting skills** (`om-code-review`, `om-auto-review-pr`, `om-review-prs`, `om-auto-fix-pr`) plus `AGENTS.md` §3 | Smallest blast radius; an unsynced copy keeps today's behaviour, so under-syncing is safe while over-syncing is 30 extra diffs. A sweep is filed as a follow-up. |
| **A2** | Where does the fingerprint live — review body, status comment, or a repo file? | **Review body HTML marker** | Needs no new tracker operation, travels with the artifact, survives branch deletion, and is already fetched by **get-pr**. |
| **A3** | May this spec amend `DECISIONS.md` 2026-07-23 ("deliberately un-laconic")? | **Yes — replace "never compress" with mandatory-fields-plus-budget**, keeping template-driven reporting | The original decision targeted runtime divergence; a mandatory-field template with a cap serves that goal better than a volume floor. **⚠ NEEDS HUMAN CONFIRMATION** — it amends a recorded architectural decision that the whole collection cites. |
| **A4** | Is `do-not-review` added to the config taxonomy? | **No — read-only, outside the taxonomy** | Follows the `do-not-close` precedent; consumer repos need no config migration and no `om-setup-agent-pipeline` re-run. |
| **A5** | Does quiet mode post anything at all? | **One line appended to the existing status comment; never a new comment** | Keeps suppression auditable without adding a notification. |
| **A6** | Is the character budget binding or advisory? | **Binding, with overflow folded into `<details>`** | An advisory budget is the 2026-07-23 failure mode in reverse. |
| **A7** | Should this be three separate specs? | **One spec, three phases** | The three changes share one owner file, one compatibility contract, and one rollout announcement; splitting would triple the coordination cost of a single behavioural promise to the team. Phase 2 is nonetheless independently revertible. |
| **A8** | Does suppression extend to other commenting skills (`om-auto-qa-pr`, `om-auto-manage-issues`)? | **No — review skills only** | Smallest scope that solves the reported problem; the same pattern can be lifted later if those skills prove noisy. |
| **A9** | Should findings be posted as inline diff comments instead (the market-leader pattern)? | **Deferred, not rejected** | It would require a new `create-review-comment` tracker operation added to `TEMPLATE.md` **and** every shipped descriptor in one PR (compatibility §3). Recorded in Research as the natural Phase 4. |

## 📝 Research — what the market does

- **CodeRabbit** defaults to *incremental* reviews: each push is reviewed against the last reviewed commit, the walkthrough is folded into `<details>`, one summary comment is edited in place rather than re-posted, and `@coderabbitai pause` is a first-class opt-out. Validates the fingerprint gate, the fold, and `do-not-review`.
- **Danger JS** has maintained exactly one bot comment per PR, updated in place, since 2016. The convention this collection is missing is not "comment less" but "comment *once*".
- **reviewdog** posts findings as inline diff comments filtered to changed lines, which bounds volume structurally rather than by instruction — the pattern deferred as **A9**.
- **Graphite Reviewer** and **Sourcery** both split "summary for humans" from "detail on demand", which is the two-audience split of Phase 2.
- What they carry that this spec skips: hosted dashboards, per-file confidence scores, and cross-PR learning loops — none of which a file-based skill collection can or should own.

The gap none of them solve and this spec must: those tools are single-purpose bots, whereas here the review output is *also* the input to an autonomous fixing chain. That is precisely why the answer is a two-audience split rather than simply "generate less".

## 📋 Phasing

- **Phase 1 — Noise suppression.** Fingerprint gate, delta classification, state-as-status-comment, `do-not-review`. Behavioural only; no output format changes; no parsed contract touched. Ships alone and delivers most of the relief.
- **Phase 2 — Verbosity budget.** The projection format and the Reporting-style amendment. Changes a contract the collection cites; gated on **A3**; announced separately.
- **Phase 3 — Incremental re-review.** Review the delta rather than the whole PR, carry previous blockers forward by `file:line`, and lead the body with what changed since the last review.
- **Phase 4 (deferred, not scheduled).** Inline diff findings via a new `create-review-comment` operation (**A9**).

## 📋 Implementation Plan

### Phase 1 — Noise suppression

1. **1.1 — Write `references/change-detection.md` in `om-auto-review-pr`.** The fingerprint command, the marker grammar (`v`, `fingerprint`, `base`, `head`, `files`), the read path via **get-pr**, the fallback table from Edge Cases, and the delta classifier's path lists. *Testable:* `bash scripts/lint.sh` passes; a reviewer can compute a fingerprint by hand from the file and get the documented value.
2. **1.2 — Add the fixture set under `scripts/fixtures/`.** Small git repos exercising rebase, force-push-to-earlier-state, whitespace-only, binary change, mode-only change, and base-advance; a script asserting the expected fingerprint-equality verdict for each. *Testable:* the script exits non-zero on a wrong verdict. This is the regression net for the "silently suppressed blocker" risk.
3. **1.3 — Rewrite `references/pr-metadata.md` §3.** Replace the head-SHA rule with the three-way gate: fingerprint identical ⇒ no-op; changed + `no-signal` ⇒ quiet; changed + `code` ⇒ review. Keep the head-SHA path as the documented fallback. *Testable:* lint; no other reference file still claims head SHA is the trigger (grep).
4. **1.4 — Rewrite `references/early-exit-checks.md`.** Conflicts and red CI maintain the status comment keyed by `condition` + `baseRefOid` instead of submitting reviews; specify the marker, the update-in-place path, and the no-change short-circuit. *Testable:* lint; the file no longer instructs a review submission on either early exit.
5. **1.5 — Amend `references/verdict-and-labels.md`.** The author handoff fires only on a substantive changes-requested verdict; early exits hand off through the status comment. *Testable:* lint; grep shows no remaining "including early exits" handoff instruction.
6. **1.6 — Consolidate claim/completion into the status comment.** Update `references/claim-pr.md` and step 12 so one marker-idempotent comment carries claim, state, and completion. *Testable:* lint; the documented comment inventory for one pass is at most three entries.
7. **1.7 — Wire the gates into `SKILL.md`.** New step 3 (change detection) ahead of the early-exit checks, plus the `do-not-review` check in step 1 before the claim. *Testable:* `bash scripts/lint.sh` — including the 20,000-char body budget, which is why 1.1 carries the detail.
8. **1.8 — Add the `do-not-review` filter to `om-review-prs` step 2** and document the label in `om-setup-agent-pipeline` beside `do-not-close`. *Testable:* lint; both skills describe identical semantics.
9. **1.9 — Record the decision in `DECISIONS.md` and `CHANGELOG.md`.** *Testable:* lint; the entry names the fingerprint mechanism and the fail-open rule.

### Phase 2 — Verbosity budget (gated on A3)

1. **2.1 — Rewrite `skills/om-code-review/references/output-format.md`** around the projection: mandatory fields, one-line findings, conditional sections, the `<details>` fold, the character budget, and an explicit statement that the parsed anchors are unchanged. *Testable:* lint; a worked example under budget is included in the file.
2. **2.2 — Move the Breaking-Changes checklist into `references/review-checklist.md`** as an internal check that renders only violations. *Testable:* lint; `output-format.md` no longer contains the ten checkboxes.
3. **2.3 — Amend the "Reporting style" bullet in the four review skills' `rules.md`** (A1) and `AGENTS.md` §3: deliverable-not-log stays; mandatory fields plus a maximum replace "never compress"; volume is a cost paid by the reader. *Testable:* lint; the four files carry byte-identical bullets; a grep confirms the other 30 are untouched.
4. **2.4 — Update `references/verdict-and-labels.md`** so the posted body is the projection while the full report stays terminal/chain-facing. *Testable:* lint; the file states both audiences explicitly.
5. **2.5 — Verify the consumer chain.** Confirm `om-auto-fix-pr` and `om-approve-merge-pr` read only the preserved anchors, and document the finding in the PR. *Testable:* grep of every consumer against the anchor list; no consumer reads a removed section.
6. **2.6 — File the follow-up issue for the 30 remaining `rules.md` copies.** *Testable:* the issue exists and links this spec.

### Phase 3 — Incremental re-review

1. **3.1 — Extend `references/change-detection.md`** with the delta scope: the file set and hunks between the two fingerprinted states.
2. **3.2 — Update `references/review-report.md`** so a re-review reviews the delta and re-verifies previous blockers by `file:line` rather than re-deriving the whole PR.
3. **3.3 — Add the "changed since last review" lead** to the re-review body, listing carried-forward blockers with their status.
4. **3.4 — Extend the fixture set** with a two-pass scenario asserting that an unfixed blocker survives into the second review.

## 📋 How we will know it worked

Observable, not vanity:

- **The rebase test.** Take one of Maciej's parked module PRs, rebase it on `develop`, run the review. Success is zero new comments and a terminal line explaining the no-op. This is the single acceptance test for Phase 1.
- **Comment count per pass.** Countable from the PR timeline: at most three entries on a substantive pass, zero on a no-op.
- **Review body length.** Measurable in characters against the budget on the next ten reviews after Phase 2.
- **The false-silence check.** For four weeks after Phase 1, every PR that merges with a `changes-requested` history is spot-checked for a finding the automation stopped repeating. Any instance is a Phase 1 regression and reverts it.
- **The team stops asking.** The channel thread that produced this spec is the baseline: no recurrence of "it commented again for nothing" is the outcome that matters.

## 📋 Rollout

1. Phase 1 merges with a channel post explaining the three gates, the fail-open rule, and `do-not-review` — the last one is the part engineers can use the same day.
2. A one-week soak on Phase 1 before Phase 2 opens, so a suppression regression is not entangled with a format change.
3. Phase 2 opens as a PR with a before/after example of a real review body, and merges only after the team confirms **A3** — the amendment to the 2026-07-23 decision is theirs to make, not the automation's.
4. Consumer repos pick the changes up on their next skills upgrade; `UPGRADE_NOTES.md` gains an entry describing the marker, the new label, and the fact that no config migration is required.
