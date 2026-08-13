# Reduce auto-review noise on PRs — suppress no-op re-reviews and cap review-comment volume

## 📝 TLDR

The auto-review pipeline currently speaks when nothing changed, and when it does speak it says far too much. A daily rebase on a long-lived PR rewrites every head SHA, which is the only signal `om-auto-review-pr` uses to decide "there are new commits", so the PR collects a fresh full review per rebase; a PR left un-rebased collects periodic conflict comments instead. Separately, the posted review body is the complete `om-code-review` report reproduced verbatim, and the collection's own rules forbid shortening it. This spec introduces a **rebase-invariant, whitespace-preserving diff fingerprint** as the re-review trigger, a deliberately **narrow quiet mode** — non-executable prose only, never anything that runs or decides what runs — **state-as-status-comment** for conflicts and red CI, reconciled *before* any suppression so a PR's health is never stale, an opt-out label, and a **two-audience split** where the full report stays with the agent and the PR gets a budgeted summary.

It ships as **two independent PRs**: Phase 1 (suppression) then Phase 2 (verbosity). Incremental re-review was carved out to its own spec (#82). Design only — no implementation here.

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

Verbosity is not drift; it is a written rule in six documents (the full inventory, with the Phase 2 step that changes each, is in API Contracts):

- `skills/om-code-review/references/output-format.md`: *"Never compress the report to save tokens, and never shrink a section to a bare verdict."*
- `skills/om-code-review/SKILL.md`: callers post *"this whole report, verbatim"* as the review body.
- `skills/om-auto-review-pr/references/verdict-and-labels.md` and `SKILL.md` (step 10 and Rules): the review body **is** the full report reproduced verbatim — *"never a condensed restatement"*.
- `references/rules.md` "Reporting style", duplicated across 34 skills: *"terser improvisations are a defect"*.
- `AGENTS.md`, both in the cross-skill contract (§3) and in the skill-authoring standards (§2).
- `CODE_REVIEW.md` priority 8, which makes *"a terser variant instead of the skill's shipped template"* a reviewable finding in this very repository.

Two structural consequences:

1. **The agent-facing report and the human-facing PR comment are the same artifact.** Everything the reviewing agent needs to reason and to hand off to `om-auto-fix-pr` is also mailed to every PR watcher. This is the root cause; the rest is symptom.
2. **Sections render unconditionally.** `output-format.md` prints a ten-item Breaking-Changes checklist on every review, including a two-line docs fix that breaks nothing, and demands a Test Coverage narrative even when coverage is fine.

### The decision this spec revisits

`DECISIONS.md`, 2026-07-23, *"Reporting is template-based and deliberately un-laconic"*: output quality had diverged by runtime — rich on Claude, terse on Codex — because report shapes were inline prose carrying the word "concise". The fix was templates plus binding "never compress" rules.

**That decision was right about the mechanism and wrong about the lever.** What made Codex output poor was the absence of an enforced *structure*, not the absence of *volume*. A template with mandatory fields and a hard character budget fixes runtime divergence in exactly the way the original decision intended, while removing the licence to pad. This spec therefore keeps template-driven reporting and replaces "never compress" with "fill every mandatory field, then stop" — Resolved assumption **A3**.

Amending a recorded architectural decision is not the automation's call, so it was taken by a human: **Wojciech Szyjka approved A3 on 2026-08-13**, and `DECISIONS.md` carries a 2026-08-13 entry superseding the 2026-07-23 one, with the original left in place and annotated rather than deleted. Phase 2 therefore carries no confirmation gate; it is gated only on Phase 1 having soaked (Rollout).

## 📝 Proposed Solution

Five changes, ordered by how much relief they buy per unit of risk.

**1. Fingerprint the diff, not the commits.** Before deciding review vs. re-review vs. no-op, compute a rebase-invariant identity for what the PR actually proposes:

```
BASE_SHA=$(git merge-base origin/<baseRefName> <headSha>)
FINGERPRINT=$(git diff "$BASE_SHA" <headSha> | git patch-id --verbatim | cut -d' ' -f1)
```

`git patch-id` hashes the patch content while ignoring commit SHAs, author, date, message, and absolute line numbers — it is built for exactly the question "is this the same change, rebased?". **The mode matters and `--verbatim` is the only safe one here.** Per `git-patch-id(1)`, `--stable` specifies that "all whitespace within the patch is ignored and does not affect the id"; `--verbatim` "calculate[s] the patch-id of the input as it is given, do[es] not strip any whitespace". Line-number insensitivity is a property of patch-id itself, not of `--stable`, so `--verbatim` keeps every bit of the rebase invariance this gate is built on while refusing to call two different programs the same change.

Verified on git 2.50.1 rather than assumed, and the fixture set of Step 1.2 pins both halves as regression tests:

| Scenario | `--stable` | `--verbatim` | Required verdict |
|---|---|---|---|
| `audit_log()` dedented out of an `if user.is_admin:` guard — a whitespace-only diff that changes who gets audited | **identical id** (`4e2b2d7f…` both sides) ⇒ silent no-op | distinct ids (`9b1a2cbd…` / `37d86fee…`) | **review** — `--stable` fails |
| Rebase across an unrelated commit | unchanged | unchanged (`cf241a5d…`) | no-op |
| Rebase across a commit inserting lines *above* the change in the same file | unchanged | unchanged (`cf241a5d…`) | no-op |

The one property dropped with `--stable` is its file-ordering guarantee (identical ids for the same tree pair compared with different `-O<orderfile>` settings). Nothing in this pipeline reorders diffs, and the failure direction is safe: a differently ordered diff yields a *different* fingerprint, so the gate speaks rather than stays silent. The `v` field in the marker below exists so a future ordering fix can bump the schema and treat older markers as unknown — which the fallback table already routes to a review. The flags are mutually exclusive (`git patch-id` rejects `--stable --verbatim` outright), so this is a choice, not a combination.

The value is persisted in the submitted review body as an HTML comment:

```html
<!-- om-review: v=1 fingerprint=<40-hex> base=<baseRefOid> head=<headRefOid> files=<n> -->
```

On the next pass the skill reads the newest own-marker review body, parses the fingerprint, and compares. **Identical ⇒ the substantive review is a no-op**: no review submitted, no worktree, no validation run. The run reports the no-op in the terminal and exits.

**What a no-op still does — the health-state exception.** Suppression covers *opinion*, never *state*. An earlier draft placed the fingerprint gate ahead of the conflict and CI checks, which meant a PR whose content had not changed but whose base had started conflicting, or whose required check had gone red, exited silently while its status comment and pipeline label still described the world as it was days ago — and, worse, the recovery was equally invisible, so a PR that went green stayed labelled red. Stale health state is not quiet; it is wrong.

The order is therefore fixed, and health comes first:

1. **Reconcile mergeability and required-check state.** Read `mergeable`/`mergeStateStatus` and the required checks, and bring the status comment and the pipeline label into line with what is true right now — idempotently, in both directions. A condition that appeared is written; a condition that cleared is **removed**, not left behind; a condition unchanged since the last pass rewrites nothing, because the update-in-place path short-circuits on an identical body. Keyed by `condition` + `baseRefOid`, so re-observing the same conflict against the same base is free.
2. **Then apply the review-noise gate** — fingerprint, then delta classification — which decides only whether a *review* is submitted.

Two consequences worth stating outright: a no-op pass may still update the status comment and move a pipeline label, and that is correct — labels carry no notification cost and are the machine-readable signal other skills consume. And a red check or a conflict never blocks reconciliation of the other: both are evaluated every pass, so a PR that fixes its conflict while CI stays red ends with exactly one accurate status line, not two contradictory ones.

**2. Classify the delta when the fingerprint did change.** A changed fingerprint is not automatically review-worthy — but the burden of proof runs the other way, and an earlier draft of this spec had it backwards. Quiet mode is not "files a reviewer finds boring"; it is **files that nothing executes and that determine nothing executable**.

> **The quiet rule.** A delta may be classified `no-signal` only when *every* changed path is **non-executable prose that no tool consumes** — human-readable narrative whose worst-case corruption is a reader being misinformed. Anything that runs, decides what runs, decides what is installed, or changes how a file may be invoked is `code`, whatever its extension and wherever it lives.

The rule is what binds; the lists below only illustrate it, and an unrecognized path is `code` by construction.

- **`no-signal` — quiet.** Changelog and release-note prose, and documentation whose sole consumer is a human reader. That is the whole category.
- **`code` — normal review.** Everything else. Explicitly, and never negotiable by path:
  - **Anything executed by CI or a scheduler** — `.github/workflows/**` and every equivalent (`.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, `.circleci/**`, `*.tf`, container and compose files). A workflow file is a program with repository credentials; a one-line `on:`/`permissions:` edit can exfiltrate secrets or grant write to a fork-triggered run, and it is invisible in a diff summary that says "CI only".
  - **Anything that decides which dependency is installed** — lockfiles, `package.json` and every manifest equivalent, vendored dependency trees. A lockfile edit swaps the integrity hash and the code that ships; install hooks run arbitrary commands. That an artifact is machine-generated says nothing about whether it is safe, and supply-chain attacks live precisely in the diff nobody reads.
  - **Anything invocable** — scripts, `Makefile`s, git hooks, task definitions, and files under the repo's own `scripts/` area.
  - **Any file-mode change**, including a bare `chmod +x` on a file whose content did not move — making something executable *is* the change.
  - **Instruction documents an agent executes.** In this repository specifically, `skills/**` and `AGENTS.md`/`CLAUDE.md` are prose that an agent runs verbatim (`CODE_REVIEW.md`, review priority 1). They are `code` here, and the classifier reads the repo's own agent-instruction paths rather than assuming markdown is inert.

**Whitespace-only deltas are `code`, not `no-signal`** — the earlier draft had them quiet, and that was the same mistake in a second place. Indentation is syntax in Python, YAML, Makefiles, Nim, F#, Haskell, and here-documents; the fingerprint change reproduced above (`audit_log()` leaving an admin guard) is a security regression whose entire diff is whitespace. A formatter run is only recognizable as one by evidence — a language-aware proof such as an AST comparison, or a formatter check the repo itself runs — and no such proof exists in this design. Absent it, the delta is reviewed. This costs one review after a project-wide reformat; the alternative cost is a silently approved privilege escalation.

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
                            ▼
              gate: do-not-review  (human opt-out — exits before claiming)
                            │
                            ▼
              RECONCILE HEALTH STATE  ── always, even on a no-op pass ──►  status comment
              (mergeability · required checks)                            + pipeline label
                            │                                             (idempotent, both directions)
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
  gate: fingerprint                       gate: delta class
  (rebase-invariant, whitespace-aware)    (no-signal | code)
        │                                       │
        └──────────────── speak ────────────────┘
                          │
                          ▼
          om-code-review  ──full report──►  agent / terminal / om-auto-fix-pr
                │
                └──budgeted projection──►  the PR comment
```

The two review-noise gates sit **below** health reconciliation on purpose: they can silence an opinion, never a fact about whether the PR can merge.

**Where the decision lives.** All suppression logic lands in `om-auto-review-pr` — one owner, one place to audit. `om-review-prs` only gains the `do-not-review` filter (a cheap pre-filter; the authoritative check still runs inside the review skill, so a direct `/om-auto-review-pr 123` invocation cannot bypass it). `om-code-review` gains the projection format and loses the never-compress instruction; it does not learn about fingerprints.

**Where the state lives.** In the PR itself, in the review body's HTML marker. No sidecar file, no `.ai/` state, no tracker-specific storage — the state travels with the artifact it describes, is visible to a human who views source, and needs no new tracker operation. Reading it uses **get-pr** (`reviews[].body`), which every descriptor already provides.

**Reused primitives, not new ones.** Marker-idempotent comments via **list-issue-comments** + **update-comment** already exist for `🏷️ label rationale`; the status comment is the same pattern with a different marker. The label guards, the claim protocol, and `set_pipeline_label` are untouched.

## 📝 Data Model

One record, embedded in each submitted review body:

| Field | Type | Meaning | Absent ⇒ |
|---|---|---|---|
| `v` | int | Marker schema version, currently `1` | pre-marker review; treat as unknown |
| `fingerprint` | 40-hex | `git patch-id --verbatim` of `merge-base(base, head)..head` | cannot compare; fall back to head-SHA semantics |
| `base` | 40-hex | `baseRefOid` at review time | conflict-state dedup falls back to always-report-once-per-run |
| `head` | 40-hex | `headRefOid` at review time | diagnostic only |
| `files` | int | Changed-file count, for a cheap sanity check | diagnostic only |

Read path: **get-pr** → `reviews[]` filtered to `$CURRENT_USER` → newest body containing `<!-- om-review:` → parse. Write path: the marker is appended to the review body at submission.

The status comment carries its own marker line, `condition=<conflict|ci-red> base=<sha>`, in the same HTML-comment form.

No PII, no credentials, nothing that is not already public in the PR.

## 📝 API Contracts

An earlier draft of this section asserted that the review headings are protected by `BACKWARD_COMPATIBILITY.md` §5 and parsed by `om-auto-fix-pr`, `om-approve-merge-pr`, and `om-review-prs`. **That was wrong on both counts**, and the correction matters more than the claim did: a format believed protected and actually unprotected is the worst of both worlds — nobody may change it and nobody has to preserve it. What the repository actually contains, verified by reading it:

| Claim in the earlier draft | What the repository says | Consequence |
|---|---|---|
| The review headings are listed in `BACKWARD_COMPATIBILITY.md` §5 | **They are not.** §5 lists the execution-plan `## Progress` section, the PR-body `Tracking plan:`/`Status:` lines, `<paths.qa>/test-env.json`, the generated launcher scripts, the chaining reference lines, and the `om-brainstorm` routing lines | The review body format has no compatibility protection today |
| `om-approve-merge-pr` parses the review body | It reads the tracker field `reviewDecision` via **get-pr** (`SKILL.md` step 1). It never opens a review body | Verdict travels as tracker state, not as parsed text |
| `om-auto-fix-pr` parses the review body | It invokes `om-auto-review-pr` and consumes **its report, in-session** (`SKILL.md` step 4), including the findings that skill declined to fix | The coupling is a return value, not a text format |
| `om-review-prs` parses the review body | Its only `Verdict` string is a column header in the summary table it prints itself (`SKILL.md` step 5) | Not a consumer |

The one machine-parsed contract this spec's area really does carry is the **chaining reference lines** (`PR: #<n> (link: <url>)`, `Issue: #<n> (link: <url>)`) — genuinely listed in §5, genuinely parsed by the next skill in a chain and by session orchestrators such as cezar. Those are untouched here, and they sit in the final report rather than in the review body, so the budget never applies to them.

**Unchanged, and deliberately so:**

- The chaining reference lines, exactly as §5 protects them.
- Every tracker operation and label guard. **No new tracker operation is introduced** — a deliberate constraint, since adding one would require updating `TEMPLATE.md` plus every shipped descriptor in the same PR (§3 of the compatibility contract).
- The claim/take-over/hand-off/completion comment contract of `claim-pr.md`, in every copy (see UI/UX).
- The review headings themselves (`# 🔍 Code Review`, `## Verdict`, `### ⛔ Blocker` / `### ⚠️ Major` / `### 🔹 Minor` / `### 💅 Nit`) — kept not because a parser demands it, but because humans and agents navigate by them and preserving them costs nothing. Phase 2 changes what goes *under* those headings, never the headings.

**Given that they are worth preserving, Phase 2 adds them to the policy rather than assuming it.** A new §5 bullet records the review-body structure as a cross-skill format with its producer (`om-code-review` via `om-auto-review-pr`) and its consumers named honestly — today: humans, plus any future parser that would otherwise have no contract to rely on. §5's standing requirement then applies: a consumer must tolerate the previous format, which here is free, since the anchors do not move and an older reader simply sees a shorter body under headings it already knows.

**Additive:**

- The `<!-- om-review: … -->` marker. An older installed skill copy ignores unknown HTML comments — it renders as nothing and parses as nothing. A newer skill reading a review body written by an older copy finds no marker and falls back to today's head-SHA behaviour, which is correct-but-noisy rather than wrong.
- The `do-not-review` label, read-only and outside the taxonomy.

**Changed, and requiring the sync procedure of `AGENTS.md` §5.** The full-verbatim-report requirement is not in one file. Every instruction below currently obliges an agent to post the complete report, and each one must change in Phase 2 or the phase contradicts itself — a spec that rewrites `output-format.md` alone leaves four other documents telling the agent to ignore it. Enumerated from a grep of the repository, not from memory:

| File | What it says today | Phase 2 step |
|---|---|---|
| `skills/om-code-review/references/output-format.md` | *"Never compress the report to save tokens, and never shrink a section to a bare verdict."* | 2.1 — rewritten around the projection |
| `skills/om-code-review/SKILL.md` (Callers paragraph) | callers *"post **this whole report, verbatim in its `references/output-format.md` structure**"* as the PR review body | 2.1 — restated as: the full report is the chain-facing artifact, the projection is what is posted |
| `skills/om-auto-review-pr/references/verdict-and-labels.md` | the review body **is** the report reproduced verbatim; *"do **not** condense it into a fresh short summary"* | 2.4 — both audiences stated explicitly |
| `skills/om-auto-review-pr/SKILL.md` step 10 | *"never a condensed restatement"* | 2.4 |
| `skills/om-auto-review-pr/SKILL.md` Rules | *"never condensed and never with emojis stripped"* | 2.4 |
| `CODE_REVIEW.md` priority 8 + Severity guidance | flags *"a report/comment that improvises a terser variant instead of filling the skill's shipped template"*, and grades *"a thinned deliverable"* as Minor | **2.7 (new)** — the rule becomes *fills every mandatory field and respects the budget*, so the projection is compliant rather than a finding |
| `references/rules.md` "Reporting style" | *"terser improvisations are a defect"* | 2.3, scoped by **A1** |
| `AGENTS.md` — cross-skill contract §3 **and** skill-authoring standard §2 | both restate deliverable-not-log with *"terser improvisations are a defect"*; the earlier draft named only §3 | 2.3 |

`CODE_REVIEW.md` is the sharpest of these: it is this repository's own review rulebook, so leaving it unamended would have the reviewer flag the projection as a Minor finding on every single review the projection produces.

`references/rules.md` exists in **34 skills** with 23 distinct contents (one group of 12 identical copies, the remaining 22 locally drifted), so a blanket rewrite is 34 diffs plus 34 review passes. Resolved assumption **A1** scopes the change to the four skills that actually post review bodies — `om-code-review`, `om-auto-review-pr`, `om-review-prs`, `om-auto-fix-pr` — and leaves the other 30 copies untouched until a separate sweep. Under-syncing here is safe: an unchanged copy keeps today's behaviour. `AGENTS.md` §5 nonetheless requires the divergence to be declared on the PR, and Step 2.3 does exactly that.

## 📝 UI/UX

The PR comment *is* this feature's user interface, and its design goal is a single screen a reviewer reads without scrolling.

**Notification budget per pass, before → after:**

| Situation | Today | After |
|---|---|---|
| Rebase, no content change, health unchanged | full review + handoff + completion + labels | nothing |
| Rebase, no content change, but the base now conflicts (or CI went red/green) | full review + handoff + completion + labels | no review; the status comment and pipeline label are corrected in place |
| CI-config or lockfile tweak | full review + handoff + completion | full review (never quiet) — the volume relief comes from Phase 2's budget, not from suppression |
| Changelog/release-note prose only | full review + handoff + completion | one line inside the existing status comment |
| Conflicts observed again | changes-requested review + handoff | status comment rewritten in place |
| Real code change, approve | full report (often 8–15k chars) | ≤ ~2,500 chars |
| Real code change, blockers | full report | ≤ ~6,000 chars, minors/nits folded away |

**Comment consolidation — and what is deliberately excluded from it.** The **state notices** (conflicts, red CI, quiet-mode passes) merge into the single `🤖 om-auto-review-pr — status` comment updated in place. `🏷️ label rationale` stays separate (a different concern with its own idempotency rule elsewhere in the collection).

**The claim protocol is not touched.** An earlier draft of this spec folded the claim and completion comments into the status comment too, which was a concurrency change wearing a notification-reduction costume. The claim comment is the freshness signal every other automation reads to decide whether a PR is being worked on: `references/claim-pr.md` — duplicated by design across the collection's skills — has claimants judge a lock by whether the newest `🤖` claim, take-over, or hand-off comment is inside the stale window, and a comment *updated in place* keeps its original creation timestamp. Under the folded design a live chain would read as an hour-old dead lock, or a dead one as live, depending on which timestamp a given consumer happened to read. Losing the completion comment is the same failure at the other end: the release becomes invisible.

The saving was never worth it either. Claim and completion are two entries **per run**, not per rebase — the noise this spec exists to remove is the re-review multiplier, and the fingerprint gate removes it by not running at all. So:

- The claim, take-over, hand-off, and completion comments keep their current text, timing, and separate-comment identity. Nothing in `claim-pr.md`, in any of its copies, or in the `in-progress`/`ci-monitoring` label semantics changes in either phase of this spec.
- A **no-op pass posts none of them**, because it exits before claiming — which is where the arithmetic actually improves.
- A pass that ends in a real verdict posts at most five entries (claim, review, status, label rationale, completion) against up to six today, and the count that matters — passes per week on a rebased PR — drops to near zero.

Consolidating the claim signal may still be worth doing one day. It is a change to a shared concurrency contract with consumers in every skill that carries `claim-pr.md`, so it needs its own spec, its own consumer inventory, and a detection path tolerant of both formats during rollout. It is out of scope here.

**Reading order.** Verdict first, blockers second, everything else behind a fold. Piotr's "I almost never read this" is the acceptance criterion: the first two lines have to carry the decision.

## 📝 Edge Cases & Failure Scenarios

| Case | Behaviour | Rationale |
|---|---|---|
| No marker on the previous review (older skill copy, or a human deleted it) | Fall back to head-SHA semantics and review; write a marker this time | Degrades to today's behaviour, never to silence |
| `git patch-id` unavailable or errors | Log it, fall back to head-SHA semantics | Suppression must fail open — a spurious review is recoverable, a swallowed blocker is not |
| Binary files in the diff | `patch-id` hashes the binary-patch header, so a changed binary changes the fingerprint | Verified as part of Step 1.2's fixture set |
| Mode-only change (chmod) | Included in the patch text ⇒ fingerprint changes ⇒ classified **`code`** | Making a file executable is the change; quiet mode never covers it |
| Very large diff (>100k lines) | Fingerprint computed on the diff stream without materializing it; if the command exceeds a 60 s budget, fall back to head-SHA semantics | Bounded cost, fail-open |
| Force-push that reverts to a previously reviewed state | Fingerprint matches an *older* review ⇒ no-op | Correct: the content was already reviewed. The status comment records the head change so the history is not silent |
| Base branch advances underneath an unchanged PR | `merge-base` moves, so the fingerprint can change without the author doing anything. The delta between the two fingerprinted states is then computed and classified by the quiet rule like any other — empty or prose-only ⇒ quiet, anything executable ⇒ review | Prevents "develop moved" from becoming a review trigger, without turning "the author did not do it" into a licence to skip an executable change that arrived with the base |
| PR reopened after close | Treated as any other pass; the marker is still on the old review | No special case needed |
| Real blocker introduced by a whitespace-only formatter run | **Detected and reviewed.** `--verbatim` gives the re-indent a new fingerprint, and whitespace-only deltas classify as `code`, so the review runs | A whitespace diff is a semantic diff in indentation-sensitive languages; there is no language-aware proof here that would justify silence |
| A genuine repo-wide reformat with no semantic change | Reviewed once, and the review says so in a line | The cost of the correct default: one review after a reformat, versus a class of silent suppression. Buying the silence back requires an AST-level or formatter-verified proof, which is out of scope for this spec |
| `do-not-review` present on a PR with an unresolved blocker | Skill exits silently; the existing `changes-requested` label and review remain visible | The label is a human decision and outranks automation |
| Two reviewers' markers on one PR | Only markers authored by `$CURRENT_USER` are read | Prevents cross-automation interference |
| A finding set that cannot fit the budget | Render blockers and majors in full, fold the rest, and state the count that was folded | Never silently drop a finding |

## 📝 Risks & Impact Review

| Risk | Severity | Mitigation |
|---|---|---|
| **A real blocker is silently suppressed** — the fingerprint says "same" when the content differs | High | `patch-id` is a git primitive with a decade of use in `git rebase`/`format-patch`, and `--verbatim` is the mode that does not discard whitespace — the one collision class this risk actually has (`--stable`) is reproduced, pinned as a fixture, and rejected in the Proposed Solution. Step 1.2's fixture matrix asserts the required verdict for every case rather than sampling. Every suppression decision is logged in the terminal report, so a maintainer can always ask "why did it stay quiet". Fail-open on every error path. |
| **Quiet mode hides a genuine change misclassified as `no-signal`** | Medium | Quiet mode is bounded by a rule, not a path list: only non-executable prose that no tool consumes qualifies, so executables, CI definitions, dependency manifests and lockfiles, invocable scripts, mode changes, agent-instruction documents, and whitespace-only deltas are all `code` regardless of how they are spelled. An unrecognized path is `code` by construction, so the failure mode of an incomplete list is a spurious review. The status comment records every quiet pass, so the suppression is visible rather than invisible. |
| **Shortened reviews drop context a human needed** | Medium | Nothing is deleted — it is folded into `<details>` or lives in the terminal report. The budget forces prioritization, not omission. Phase 2 ships after a one-week Phase 1 soak, so a suppression regression is never entangled with a format change. |
| **Runtime divergence returns** (the 2026-07-23 problem: rich on Claude, terse on Codex) | Medium | The projection is a mandatory-field template with a *maximum*, not a prose instruction with a minimum. A missing mandatory field is a defect on any runtime; brevity beyond the fields is not. |
| **Partial upgrades in consumer repos** — new `om-auto-review-pr` with old `om-code-review`, or vice versa | Medium | The marker is additive and ignorable; the projection lives entirely inside `om-code-review`'s output file. A mixed install produces today's verbosity or today's noise, never a crash. |
| **The 30 unsynced `rules.md` copies drift further** | Low | Explicitly scoped and recorded here plus in `DECISIONS.md`; a follow-up sweep is filed when Phase 2 merges. |
| **`do-not-review` becomes a way to dodge review entirely** | Low | It suppresses *automation*, not the human review requirement or the QA gate; branch protection and `qaGate` are untouched. |

**Rollback story.** Each phase is independently revertible, in either order, and reverting is a documentation change with no migration: Phase 1 reverted means the skill goes back to head-SHA triggers (leftover markers become inert HTML comments); Phase 2 reverted means the full report is posted again. Neither revert requires the other, because Phase 1 changes *when* a review is posted and Phase 2 changes *what it looks like*. No state needs cleaning up, because the only state is a comment in a PR body.

**Blast radius.** Every OM Core engineer's PRs. This is why Phase 1 (behaviour, no format change) and Phase 2 (format contract) ship separately and are announced separately.

## 📝 Resolved assumptions (autonomous defaults)

| # | Question | Decision | Rationale |
|---|---|---|---|
| **A1** | Does the Reporting-style change touch all 34 `rules.md` copies or only the review skills? | **Only the four review-posting skills** (`om-code-review`, `om-auto-review-pr`, `om-review-prs`, `om-auto-fix-pr`) plus `AGENTS.md` §3 | Smallest blast radius; an unsynced copy keeps today's behaviour, so under-syncing is safe while over-syncing is 30 extra diffs. A sweep is filed as a follow-up. |
| **A2** | Where does the fingerprint live — review body, status comment, or a repo file? | **Review body HTML marker** | Needs no new tracker operation, travels with the artifact, survives branch deletion, and is already fetched by **get-pr**. |
| **A3** | May this spec amend `DECISIONS.md` 2026-07-23 ("deliberately un-laconic")? | **Yes — replace "never compress" with mandatory-fields-plus-budget**, keeping template-driven reporting. **✅ Confirmed by Wojciech Szyjka on 2026-08-13**; recorded as a superseding `DECISIONS.md` entry in this PR | The original decision targeted runtime divergence; a mandatory-field template with a cap serves that goal better than a volume floor. It amends a recorded architectural decision the whole collection cites, which is why it was taken by a human rather than defaulted by the automation. |
| **A4** | Is `do-not-review` added to the config taxonomy? | **No — read-only, outside the taxonomy** | Follows the `do-not-close` precedent; consumer repos need no config migration and no `om-setup-agent-pipeline` re-run. |
| **A5** | Does quiet mode post anything at all? | **One line appended to the existing status comment; never a new comment** | Keeps suppression auditable without adding a notification. |
| **A6** | Is the character budget binding or advisory? | **Binding, with overflow folded into `<details>`** | An advisory budget is the 2026-07-23 failure mode in reverse. |
| **A7** | Should this be three separate specs? | **Revised on review: one spec, two phases — incremental re-review moved out to #82** | Suppression and verbosity share one owner file, one compatibility contract, and one rollout announcement, so keeping them together saves real coordination cost; they ship as two independently revertible PRs with their own acceptance criteria. Incremental re-review does **not** share that footing — it introduces finding-state that outlives a review and can only be designed on top of Phase 1 — so bundling it was scope, not cohesion. |
| **A8** | Does suppression extend to other commenting skills (`om-auto-qa-pr`, `om-auto-manage-issues`)? | **No — review skills only** | Smallest scope that solves the reported problem; the same pattern can be lifted later if those skills prove noisy. |
| **A9** | Should findings be posted as inline diff comments instead (the market-leader pattern)? | **Deferred, not rejected** | It would require a new `create-review-comment` tracker operation added to `TEMPLATE.md` **and** every shipped descriptor in one PR (compatibility §3). Recorded in Research as the natural next step after this spec's two phases and #82. |

## 📝 Research — what the market does

- **CodeRabbit** defaults to *incremental* reviews: each push is reviewed against the last reviewed commit, the walkthrough is folded into `<details>`, one summary comment is edited in place rather than re-posted, and `@coderabbitai pause` is a first-class opt-out. Validates the fingerprint gate, the fold, and `do-not-review`.
- **Danger JS** has maintained exactly one bot comment per PR, updated in place, since 2016. The convention this collection is missing is not "comment less" but "comment *once*".
- **reviewdog** posts findings as inline diff comments filtered to changed lines, which bounds volume structurally rather than by instruction — the pattern deferred as **A9**.
- **Graphite Reviewer** and **Sourcery** both split "summary for humans" from "detail on demand", which is the two-audience split of Phase 2.
- What they carry that this spec skips: hosted dashboards, per-file confidence scores, and cross-PR learning loops — none of which a file-based skill collection can or should own.

The gap none of them solve and this spec must: those tools are single-purpose bots, whereas here the review output is *also* the input to an autonomous fixing chain. That is precisely why the answer is a two-audience split rather than simply "generate less".

## 📋 Phasing

This document carries **two** phases, not three. They address the two independent defects named in the Problem Statement, and they ship as **two separate PRs** in order — never one. Each is independently revertible, each has its own executable acceptance criteria below, and neither depends on the other landing: Phase 1 changes when a review is posted and Phase 2 changes what a posted review looks like.

- **Phase 1 — Noise suppression.** Health-state reconciliation, the fingerprint gate, delta classification under the quiet rule, state-as-status-comment, `do-not-review`. Behavioural only; no output format changes. Ships first and alone, and delivers most of the relief.
- **Phase 2 — Verbosity budget.** The projection format and the reporting-rule amendment across every instruction file enumerated in API Contracts. Ships after Phase 1 has soaked for a week, so a suppression regression is never entangled with a format change.

**Carried out of this document:**

- **Incremental re-review** — review the delta rather than the whole PR and carry previous blockers forward by `file:line`. It is a different kind of change (what a review *covers*, rather than whether one is posted or how long it is), it can only be designed on top of Phase 1's fingerprint, and it introduces finding-state that outlives a single review. It gets its own spec: **#82**.
- **Inline diff findings** via a new `create-review-comment` tracker operation (**A9**) — deferred, not scheduled.

**Reverting.** Phase 1 reverted returns the skill to head-SHA triggers; leftover markers become inert HTML comments and nothing needs cleaning up. Phase 2 reverted restores the "never compress" wording in the files Step 2.3 and 2.4 touched, and the full report is posted again. Neither revert requires the other.

## 📋 Implementation Plan

Every step's *Testable* clause is a check someone can run — a command, a grep, or a fixture assertion — not a reading impression.

### Phase 1 — Noise suppression (PR 1)

1. **1.1 — Write `references/change-detection.md` in `om-auto-review-pr`.** The fingerprint command with `--verbatim` and why not `--stable`, the marker grammar (`v`, `fingerprint`, `base`, `head`, `files`), the read path via **get-pr**, the fallback table from Edge Cases, and the quiet rule with its `code`-by-default construction. *Testable:* `bash scripts/lint.sh` passes; a reviewer following the file by hand on the fixture repos reproduces the documented fingerprints exactly.
2. **1.2 — Add the fixture matrix under `scripts/fixtures/`.** Small git repos and a runner asserting the required verdict for every case in *Fixture matrix* below. *Testable:* the runner exits non-zero when any case yields the wrong verdict, and exits non-zero when run against a build that uses `--stable` — the whitespace-semantic case is a deliberate tripwire for that regression.
3. **1.3 — Reconcile health state before the noise gate, in `references/early-exit-checks.md`.** Mergeability and required checks are read and written to the status comment and the pipeline label on **every** pass, idempotently and in both directions (a cleared condition is removed, not left behind), keyed by `condition` + `baseRefOid`, short-circuiting when the rendered body is unchanged. Neither condition may skip the other's reconciliation. *Testable:* lint; the file no longer instructs a review submission on either early exit; fixture cases CI-3, CI-4, CF-1, CF-2 pass.
4. **1.4 — Rewrite `references/pr-metadata.md` §3.** Replace the head-SHA rule with the gate, applied only after 1.3: fingerprint identical ⇒ review is a no-op; changed + `no-signal` ⇒ quiet; changed + `code` ⇒ review. Keep the head-SHA path as the documented fallback. *Testable:* lint; `grep -rn "head SHA" skills/om-auto-review-pr/` returns only the fallback passages; fixture cases FP-1…FP-4 pass.
5. **1.5 — Amend `references/verdict-and-labels.md`.** The author handoff fires only on a substantive changes-requested verdict; early exits hand off through the status comment. *Testable:* lint; `grep -rn "including early exits" skills/om-auto-review-pr/` returns nothing.
6. **1.6 — Wire the gates into `SKILL.md`.** The `do-not-review` check in step 1 before the claim; health reconciliation next; the change-detection gate after it and ahead of the review. *Testable:* `bash scripts/lint.sh`, including the 20,000-character body budget — which is why 1.1 carries the detail; the step order in the body matches the Architecture diagram.
7. **1.7 — Add the `do-not-review` filter to `om-review-prs` step 2** and document the label in `om-setup-agent-pipeline` beside `do-not-close`. *Testable:* lint; a diff of the two skills' descriptions of the label shows identical semantics.
8. **1.8 — Record the change in `DECISIONS.md` and `CHANGELOG.md`.** *Testable:* lint; the entry names the fingerprint mechanism, the `--verbatim` choice, the quiet rule, and the fail-open rule.
9. **1.9 — Leave the claim protocol untouched, and say so.** No edit to any copy of `claim-pr.md` in this phase. *Testable:* `git diff --name-only` for PR 1 contains no `claim-pr.md`.

**Phase 1 acceptance criteria** — all must hold before it merges:

- **A1-1 (no-op).** A rebase with no content change produces zero new comments, zero label mutations, and one terminal line explaining the no-op. Fixture: FP-2.
- **A1-2 (no false silence).** The whitespace-semantic fixture (WS-1) is **reviewed**, not suppressed; the fixture runner fails if it is suppressed.
- **A1-3 (quiet is bounded).** Every case in the fixture matrix marked `code` is reviewed. A path the classifier does not recognize is reviewed.
- **A1-4 (health never stale).** After a pass in which the PR's content did not change but a conflict appeared, the status comment and pipeline label report the conflict; after the conflict clears, they stop reporting it. Fixtures: CF-1, CF-2.
- **A1-5 (idempotent).** Two consecutive passes over an unchanged PR in an unchanged condition produce exactly one status comment and no edit on the second pass.
- **A1-6 (fail-open).** With `git patch-id` made to fail, the pass falls back to head-SHA semantics and reviews.

### Phase 2 — Verbosity budget (PR 2)

1. **2.1 — Rewrite `skills/om-code-review/references/output-format.md`** around the projection: mandatory fields, one-line findings, conditional sections, the `<details>` fold, the character budget, and an explicit statement that the headings are unchanged. Update the "Callers" paragraph of `om-code-review/SKILL.md` in the same step, so the two do not contradict each other. *Testable:* lint; the worked example in the file measures under budget (`wc -c`).
2. **2.2 — Move the Breaking-Changes checklist into `references/review-checklist.md`** as an internal check that renders only violations. *Testable:* lint; `grep -c '^- \[ \]' skills/om-code-review/references/output-format.md` returns 0.
3. **2.3 — Amend the "Reporting style" bullet in the four review skills' `rules.md`** (A1) and both `AGENTS.md` locations (cross-skill contract §3 and skill-authoring standard §2). *Testable:* lint; the four bullets are byte-identical (`md5` comparison); a grep confirms the other 30 copies are untouched; the PR states the deliberate divergence per `AGENTS.md` §5.
4. **2.4 — Update `references/verdict-and-labels.md` and `om-auto-review-pr/SKILL.md`** (step 10 and Rules) so the posted body is the projection while the full report stays terminal- and chain-facing. *Testable:* lint; `grep -rn "verbatim\|condensed" skills/om-auto-review-pr/` returns only passages that name both audiences.
5. **2.5 — Amend `CODE_REVIEW.md` priority 8 and its severity guidance** so a budgeted projection is compliant and only a *missing mandatory field* is the finding. *Testable:* lint; a review of the Phase 2 PR itself, run by this repository's own rules, does not flag its example projection.
6. **2.6 — Add the review-body format to `BACKWARD_COMPATIBILITY.md` §5** with its producer and consumers named accurately. *Testable:* lint; §5 lists it, and the entry names no consumer that does not exist.
7. **2.7 — File the follow-up issue for the 30 remaining `rules.md` copies.** *Testable:* the issue exists and links this spec.

**Phase 2 acceptance criteria** — all must hold before it merges:

- **A2-1 (budget).** Ten consecutive reviews produced after the change measure under budget: ≤ ~2,500 characters when approving, ≤ ~6,000 with blockers.
- **A2-2 (nothing dropped).** For a review with more findings than the budget fits, every finding is still present — folded into `<details>`, never removed — and the body states how many were folded.
- **A2-3 (headings intact).** The `# 🔍 Code Review` heading, `## Verdict`, and the four severity headings appear with their exact text.
- **A2-4 (no self-contradiction).** `grep` across `skills/**`, `AGENTS.md`, and `CODE_REVIEW.md` finds no remaining instruction to post the full report verbatim.
- **A2-5 (chain intact).** `om-auto-fix-pr` and `om-approve-merge-pr` run end-to-end against a PR reviewed with the projection and behave identically to before — verified by running them, not by reading them.

## 📋 Fixture matrix

Step 1.2 builds these; the runner asserts the *Required verdict* column and fails on any mismatch. Cases marked ⚠ are the ones a previous draft of this spec would have got wrong.

| Id | Scenario | Required verdict |
|---|---|---|
| FP-1 | First pass, no previous marker | review |
| FP-2 | Rebase onto an advanced base, content identical | no-op |
| FP-3 | Force-push reverting to a previously reviewed state | no-op |
| FP-4 | Base advances underneath an unchanged PR | no-op if the resulting delta is empty or prose-only; review otherwise |
| FP-5 | Binary file changed | review |
| FP-6 | Very large diff exceeding the time budget | review (fail-open) |
| FP-7 | `git patch-id` unavailable or erroring | review (fail-open) |
| WS-1 ⚠ | Python: a call dedented out of an `if` guard — whitespace-only diff, semantic change | **review** (`--stable` suppresses this; the runner fails if it does) |
| WS-2 ⚠ | YAML: a key re-indented into a different mapping level | **review** |
| WS-3 ⚠ | Makefile: a recipe line's leading tab replaced by spaces | **review** |
| WS-4 | A pure trailing-whitespace strip across a text file | review (the correct default absent a language-aware proof) |
| EX-1 ⚠ | `.github/workflows/ci.yml` — `permissions:` widened to `write` | **review** |
| EX-2 ⚠ | `.github/workflows/ci.yml` — a `run:` step added that curls and executes a script | **review** |
| EX-3 ⚠ | A non-GitHub CI definition (`.gitlab-ci.yml`) changed | **review** |
| EX-4 ⚠ | `chmod +x` on an existing file, no content change | **review** |
| EX-5 ⚠ | A file added under the repo's `scripts/` area | **review** |
| DEP-1 ⚠ | Lockfile only: a transitive dependency's version and integrity hash change | **review** |
| DEP-2 ⚠ | `package.json` only: a `postinstall` script added | **review** |
| DEP-3 ⚠ | Lockfile only: a registry URL changed, versions untouched | **review** |
| PR-1 | `CHANGELOG.md` only | quiet |
| PR-2 | Release-note prose only | quiet |
| PR-3 | `CHANGELOG.md` **and** a lockfile in the same delta | review (one `code` path poisons the whole delta) |
| PR-4 ⚠ | A file under `skills/**` — prose an agent executes | **review** |
| CI-1 | Required check red on this pass and the previous one, same base | status comment unchanged; no second comment; no review |
| CI-2 | Required check red, base advanced since the last observation | status comment updated in place; no review |
| CI-3 ⚠ | Required check goes **red → green**, PR content unchanged | status and pipeline label cleared; no review |
| CI-4 ⚠ | Required check goes **green → red**, PR content unchanged | status and pipeline label set; no review |
| CF-1 ⚠ | A conflict **appears** while the PR's own content is unchanged | status and label report the conflict; no review |
| CF-2 ⚠ | The conflict **clears** while the PR's own content is unchanged | status and label stop reporting it; no review |
| CF-3 | Conflict and red CI simultaneously, then the conflict clears | one status comment accurately reporting CI only |
| CL-1 ⚠ | A claim comment written by an **older** skill version (bare `🤖 <skill> —`, no backticks) | recognized as a live claim; the pass backs off |
| CL-2 ⚠ | A claim comment written by the **current** version, older than the stale window | recognized as stale; take-over note posted before any work |
| CL-3 ⚠ | An old-format completion comment followed by a new-format claim | lock reads as held by the newer claimant |
| DNR-1 | `do-not-review` present | exit before claiming; nothing posted |
| DNR-2 | `do-not-review` present on a PR with an unresolved blocker | exit silently; the existing review and label remain visible |

CL-1…CL-3 exist even though this spec changes nothing in the claim protocol: they pin the interoperability that the rejected consolidation would have broken, so a future attempt at it starts with the regression net already in place.

## 📋 How we will know it worked

Observable, not vanity. The per-phase acceptance criteria above are the merge gate; these are the field measurements afterwards.

- **The rebase test.** Take one of Maciej's parked module PRs, rebase it on `develop`, run the review. Success is zero new comments and a terminal line explaining the no-op.
- **Comment count per pass.** Countable from the PR timeline: at most five entries on a substantive pass, zero on a no-op — and, the number that matters, near-zero passes per week on a rebased PR.
- **Review body length.** Measurable in characters against the budget on the next ten reviews after Phase 2.
- **The false-silence check.** For four weeks after Phase 1, every PR that merges with a `changes-requested` history is spot-checked for a finding the automation stopped repeating. Any instance is a Phase 1 regression and reverts it.
- **The team stops asking.** The channel thread that produced this spec is the baseline: no recurrence of "it commented again for nothing" is the outcome that matters.

## 📋 Rollout

1. Phase 1 merges as its own PR, with a channel post explaining the gates and their order (health state first, then fingerprint, then delta class), the narrowness of quiet mode, the fail-open rule, and `do-not-review` — the last one is the part engineers can use the same day.
2. A one-week soak on Phase 1 before Phase 2 opens, so a suppression regression is not entangled with a format change.
3. Phase 2 opens as its own PR with a before/after example of a real review body. The amendment to the 2026-07-23 decision was the team's to make, not the automation's, and it was made: **A3 was approved by Wojciech Szyjka on 2026-08-13** and recorded in `DECISIONS.md` alongside the superseded entry. Phase 2's remaining gate is the Phase 1 soak, not a confirmation.
4. Consumer repos pick the changes up on their next skills upgrade; `UPGRADE_NOTES.md` gains an entry describing the marker, the new label, and the fact that no config migration is required.
