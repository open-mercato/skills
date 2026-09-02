# Upgrade notes

Upgrading the skills themselves is easy — re-run `npx skills add open-mercato/skills --skill '*'`
(or `git pull` in a symlinked local checkout) and the new skill instructions are live on the next
invocation. What does **not** auto-update is everything a skill previously **installed into your
repository**. Those files are yours, they may carry your local edits, and the skills execute
against them — not against the copies shipped in this repo:

| Installed artifact | Installed by | Updated how |
|--------------------|--------------|-------------|
| `.ai/trackers/<tracker>.md` (tracker descriptor — the file every tracker operation executes from) | `om-setup-agent-pipeline` | Manual re-sync (see below) |
| `.ai/browsers/<provider>.md` (browser automation and autonomous provisioning operations) | `om-setup-agent-pipeline` | Manual re-sync (see below) |
| `.ai/agentic.config.json` | `om-setup-agent-pipeline` | Re-run `/om-setup-agent-pipeline`; it preserves answers where it can |
| `SDLC.md`, `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`, `AGENTS.md` starter | `om-setup-agent-pipeline` | Regenerated only when missing — edit or regenerate deliberately |
| `.ai/skills/<name>/SKILL.md` repo-local overrides | you | Never touched by upgrades; review them against new skill behavior |

## 2026-09-02 — New skill: om-synthetic-users, and personas that om-ux-review-pr walks with

**New skill.** `om-synthetic-users` builds personas from the material the repository already holds, runs simulated interviews, and walks a flow through their eyes — on the brief or spec as a narrative, on a static prototype through the browser provider, or on the running app through `om-prepare-test-env`. Install it with:

```bash
npx skills add open-mercato/skills --skill om-synthetic-users
```

- **Two new research files.** `${SPECS_DIR}/research/personas.md` (stable `P0n` ids, every line tagged with its source) and walkthrough reports under `${SPECS_DIR}/research/walkthroughs/`. `om-ux-review-pr` now enters screens as those personas when the file exists and cites the persona id in findings; `om-spec-writing` reads the walkthrough reports as `[SYNTHETIC]` hypotheses for its Edge Cases; `om-discover --refresh` pulls them into the brief's Hypotheses section. Repositories without the files behave exactly as before.
- **A strict label.** Everything the skill produces is `[SYNTHETIC]` and never satisfies the Definition of Ready; the report says "would", never "validated". Three stances (`validate`, `simulate`, `adversary`) default from the brief's mode.
- **New output-contract lines** — `Personas:`, `Walkthrough:`, `Hypotheses:`, `Next:` — follow the line-anchored marker rules. The roster in `om-setup-agent-pipeline`'s coverage check gains `om-synthetic-users`.

## 2026-09-02 — New skill: om-discover, and a product-brief.md the other skills read

**New skill.** `om-discover` runs the product-level discovery and define session before `om-brainstorm` has anything to route, in three modes (existing product, client idea, own idea), and leaves `${SPECS_DIR}/product-brief.md`. Install it with:

```bash
npx skills add open-mercato/skills --skill om-discover
```

- **A new file other skills read.** When `product-brief.md` exists, `om-brainstorm` treats its Vision, Scope, Non-goals, and Decisions as settled context in its Frame step; `om-spec-writing` seeds its Problem Statement from it and turns the brief's blocking open questions and assumption-only problems into spec Open Questions; `om-prepare-issue` fills the ticket-level tier of the Definition of Ready from it and cites decision and non-goal ids. Repositories without the file behave exactly as before.
- **Evidence rules that are new to the collection.** The brief tags every claim with a discovery evidence tier (`[INTERVIEW]`, `[DATA]`, `[DOCUMENT]`, `[PRODUCT]`, `[BENCHMARK]`, `[SYNTHETIC]`, `[ASSUMPTION]`) and carries a coverage line; a section with no material behind it becomes a collection plan with capture templates under the research directory (`${SPECS_DIR}/research/` by default) rather than prose. Nothing to migrate: the tags live only in the brief.
- **New output-contract lines** — `Product brief:`, `Coverage:`, `Collection plan:`, and this skill's `Next:` — follow the same line-anchored rules as `PR:`/`Issue:`/`Spec:`. The roster in `om-setup-agent-pipeline`'s coverage check gains `om-discover`; re-run `/om-setup-agent-pipeline` or the coverage check to pick it up.

## 2026-09-02 — Definition of Ready: the generated SDLC.md gains a Discovery row, a readiness gate, and its own scope

The generated `SDLC.md` started at Intake with a ticket that had "enough detail to act on" — a phrase nothing checked. Three additive changes to `skills/om-setup-agent-pipeline/references/sdlc-template.md`, and to the skills that act on tickets:

- **A Discovery row above Intake** (closes the gap #59 describes): `om-brainstorm` runs before any artifact exists and ends in a routing decision. A "before intake" paragraph names the spec skills as the other pre-ticket step, and an "after merge" paragraph says where the collection stops — deployment, smoke tests, monitoring, and rollback are the repository's release process, not this document.
- **A Definition of Ready section** with two tiers. *Ticket-level* items only a human can supply (the problem and who has it, the expected outcome and how it is checked, what is out of scope, blocking questions answered, autonomous assumptions confirmed). *Spec-level* items a covering spec supplies (acceptance criteria, business rules, paths, data and permissions, dependencies, prototype link). A maintainer may waive an item on the ticket.
- **Two skills enforce it.** `om-auto-manage-issues` records `READY_STATUS` per issue and posts one idempotent `` 🤖 `om-auto-manage-issues` — not ready `` comment naming the missing ticket-level items (its report gains a `ready:` field and a not-ready list). `om-auto-fix-issue`'s feature route stops with a new `NOT_READY` token, after posting the same comment shape, when the ticket fails the ticket-level tier — a spec-level gap is still no stop, the spec is authored as before. `om-prepare-issue` files tickets with the matching sections (Problem, Who has it, Expected outcome, Open questions).
- **Migration:** an existing `SDLC.md` is never regenerated, so add the Discovery row and the Definition of Ready section by hand (copy them from the template) — the skills read the section from the repo's own `SDLC.md` and fall back to the collection's default list when it is absent. No tracker operation, label, or parsed marker changed; `NOT_READY` is a new stop token on `om-auto-fix-issue`'s feature route only, so an orchestrator that keys on `NO_ACTION_NEEDED` should treat it the same way (clean stop, nothing claimed).

## 2026-08-13 — test-env credentials become references: new `credentialsFile` + `passwordEnv`

The environment descriptor recorded demo login values inline (`"password": "<demo>"`), and the QA/test skills read them into the agent's context to sign in — so even demo-grade secrets flowed through model output into commands, and anything that ended up in the descriptor was one quote away from a report. Security audits flagged exactly this path on `om-integration-tests`.

- **The descriptor now carries references.** Each `credentials` entry names its password variable (`passwordEnv`, convention `TEST_<ROLE>_PASSWORD`); values live in `credentialsFile` — a gitignored `KEY=value` env file (default `<paths.qa>/test-env.env`) the generated environment script writes alongside the descriptor. Consumers load the file into the shell (`set -a; . "$CREDENTIALS_FILE"; set +a`) and write `"$TEST_ADMIN_PASSWORD"` literally in login/API commands; the shell expands the value, the agent never reads the file and never learns it. Affected skills: `om-prepare-test-env` (writer), `om-integration-tests` and `om-auto-qa-pr` (consumers), `om-setup-agent-pipeline` (gitignore line).
- **Legacy descriptors keep working.** An older `test-env.json` with inline `"password"` values is still consumed — values pass through the runner's environment, never quoted back — and the next `om-prepare-test-env` run or descriptor repair migrates it to references. New writers never emit inline passwords.
- **Migration:** regenerate the environment scripts by re-running `/om-prepare-test-env` (the old `test-env.json` is per-run state; it is rewritten on the next successful run), and add `<paths.qa>/test-env.env` to `.gitignore` — re-running `/om-setup-agent-pipeline` adds it, and the generated script re-adds the entry when missing.

## 2026-08-11 — Close-keyword matching is configurable: new `closeKeywords` config key

`om-close-fixed-issues` decided which issues a merged PR closes from two signals that are both English-only — the tracker's `closingIssuesReferences` parse, and a hard-coded `fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved` regex. A repository whose PR bodies are written in another language (`Zamyka #88.`, `Naprawia #62.`) matched neither, so every run reported a clean `closed 0` and the issues stayed open until somebody noticed by hand.

- **New optional config key `closeKeywords` (default `[]`).** A list of extra words that mark a PR as closing an issue. Configured words **extend** the built-in English list rather than replacing it, are matched case-insensitively and literally (each entry is regex-escaped), and only count immediately before a `#N` token — so `["zamyka", "naprawia"]` closes on `Zamyka #88` while leaving every existing English match untouched. Add the key to `.ai/agentic.config.json` by hand, or re-run `/om-setup-agent-pipeline`, which now writes it.
- **Unmatched mentions are reported instead of dropped.** When a PR in the window mentions `#N` but carries no recognized close signal, the run lists it in a new ⚠️ section of the final report, names how many `closeKeywords` were in effect, and shows the config snippet that would fix it. The counts line gains `unmatched-mentions U`. Nothing about that section mutates the tracker — it is diagnosis only.
- **Nothing to migrate on an English repository.** The key is additive and the built-in keywords are unchanged, so a config without it behaves exactly as before, minus the silence: a run that closes nothing now says whether the window was genuinely quiet or merely unparseable. No tracker operation, label, or parsed output format changed, and the "never close on a bare `#N` mention" rule still holds for every language.

## 2026-08-04 — Reporting no longer waits for CI: new `ci-monitoring` label and `ci.maxWaitMinutes`

Skills used to treat "required checks green" as a precondition for posting the review, applying the labels, or marking a PR ready. On a repository whose CI runs 20 minutes to several hours that cost twice: the agent idled instead of finishing, and a monitoring process that died mid-wait left the PR **stranded** — still a draft, no labels, no review, no comment recording that any work had happened. All three pieces below fix that, and none of them relaxes a merge gate.

- **Labels, reviews, and comments are posted the moment the work is done.** A review submitted while checks are still running carries a disclosure paragraph saying so — branch protection plus the QA-approval gate hold the actual merge, and the verdict covers the code, not a green run. The CI outcome arrives afterwards as a follow-up comment, which also corrects the pipeline label when the result changes the verdict. Affected skills: `om-auto-review-pr`, `om-auto-fix-pr`, `om-pr-autopilot`, `om-auto-fix-issue`, plus the `om-auto-create-pr` / `om-auto-continue-pr` families.
- **New meta label `ci-monitoring` — create it, or re-run `/om-setup-agent-pipeline`.** It means work complete and fully reported, agent watching CI: **not** a claim, so another agent or a human may act on the PR freely. `in-progress` now means *actively working* only. Claim detection must never read `ci-monitoring` as a lock — a PR carrying it (and no `in-progress`, no foreign assignee, no fresh claim comment) is free to claim. Create it by hand with

  ```bash
  gh label create ci-monitoring --color d4c5f9 --description "Work complete and reported; agent is watching CI results"
  ```

  and add `"ci-monitoring"` to `labels.meta` in `.ai/agentic.config.json`. Skipping this is safe but lossy: every application degrades to a logged skip through the `apply_label` guard, so the watch phase simply goes unlabeled. Re-sync `.ai/trackers/<tracker>.md` to pick up the descriptor's claim-signal note and the label in **ensure-label-taxonomy**.
- **New config key `ci.maxWaitMinutes` (default 40).** Every CI wait is now bounded. When the budget expires with checks still running, the skill stops waiting, runs your `validation.commands` gate locally as its own completion evidence, posts that together with the still-pending check names and an explicit statement that no further follow-up is coming, drops `ci-monitoring`, and exits cleanly instead of hanging. Configs without the key behave as `40`; set `0` to skip CI follow-up entirely. **That local gate is the agent's own evidence, never a substitute for branch protection** — `om-approve-merge-pr` and `om-merge-buddy` still require genuinely green required checks, and the QA-approval gate is untouched.
- **Autofix work order is now explicit: conflicts, then findings, then CI.** `om-auto-review-pr --autofix` resolves merge conflicts against the latest base *first* rather than deferring them to a second pass, because a conflicted branch makes every downstream signal unreliable — the diff under review is not the diff that will merge. `om-auto-fix-pr` and `om-auto-fix-issue` delegate both stages to that one engine and reach CI stabilization only once neither conflicts nor actionable findings remain.
- **A red signal no longer short-circuits the review.** `om-auto-review-pr` used to stop before the review when a required check was already failing, or (on a pure review pass) when the head was conflicted, and post a verdict that said only that. It now collects both as **blocker findings** and runs the full review anyway, so a single cycle hands the author the failing check, the conflict, *and* everything the code review found — instead of the cheapest red flag first and another whole cycle to discover the rest. Where the local `validation.commands` gate reproduces a failing check, the review reports the actual cause (`file:line`, the failing test) rather than repeating the check name; where the local gate is green while CI is red, it says so, which is a different message to the author. The verdict itself is unchanged: red CI and unresolved conflicts each still force `changes-requested` on their own, and a pure review pass still never touches another author's branch. The one remaining pre-review stop is duplicate/already-merged work, where none of the author's changes are left to review.
- **Nothing else to migrate.** No tracker operation, parsed output format, or pipeline-label rule changed. `ci-monitoring` is additive and meta, so pipeline-label exclusivity, the one-priority/one-risk rule, and the "skills never set `qa` and never apply `qa-approved` from a diff" rules are all unchanged.

## 2026-08-01 — New skill: om-pipeline-retro, and four fields added to the tracker contract

**New skill.** `om-pipeline-retro` classifies finished pipeline runs from the tracker and ranks what second passes cost in wall-clock hours. Read-only. Install it with:

```bash
npx skills add open-mercato/skills --skill om-pipeline-retro
```

**Tracker descriptor re-sync required.** The `get-pr` field set now documents `createdAt`, `closedAt`, `additions`, and `changedFiles`, and the merged and closed `list-prs` queries return `createdAt`. Custom descriptors under `.ai/trackers/` must add the same fields, or `om-pipeline-retro` reports every hour figure as null and says so in its coverage note. `om-apply-upgrade-notes` re-syncs the shipped GitHub descriptor; a hand-written provider needs the fields added by hand.

## 2026-07-28 — New skill: om-pr-autopilot (the "just finish this PR" entry point)

- **New skill:** `om-pr-autopilot` — hand it one open PR number and it diagnoses the PR's actual state (plan progress, diff scope, review decision, unresolved conversations, CI against the required checks, mergeability, labels, QA evidence, claim state), maps that onto an ordered chain of the skills you already have, and runs the chain, re-diagnosing between steps. It dispatches only: every fix, review, CI repair, QA capture, and merge stays with the delegated skill.
- **Nothing to migrate.** It adds no tracker operation, no label, and no new parsed output — it reports the existing `PR:` / `Issue:` chaining lines. It never merges without `--allow-merge`, and `--dry-run` diagnoses while mutating nothing, which is the recommended first call on an unfamiliar PR.
- Install via `npx skills add open-mercato/skills --skill om-pr-autopilot` (or `--skill '*'`).

## 2026-08-03 — `om-auto-continue-pr` finishes PRs that were never planned

- **A PR with no execution plan is no longer a dead end.** `om-auto-continue-pr` used to stop when it could not resolve a `Tracking plan:` line (and again when a plan's `## Progress` section would not parse), which put every human-authored PR, every PR from another tool, and every run that crashed before committing its plan out of reach. It now **adopts** such a PR: it reconstructs the goal from the PR description and its task lists, the conversation and unresolved review feedback, failing checks, linked issues, matching specs, and the code already landed; writes a real execution plan with the canonical Progress checklist under `paths.runs`; commits it on the PR branch; adds the `Tracking plan:` / `Status:` lines to the PR body (the author's own description is left untouched); and posts a `📋 adoption plan` comment stating the inferred goal, the evidence, and the assumptions it invites you to correct. Every later resume then finds the plan through the ordinary path. This is what makes the chains that hand over an arbitrary PR (`om-auto-fix-issue`, `om-auto-implement-spec`) able to finish it.
- **Two new optional arguments.** `--adopt <ask|auto|off>` decides whether the reconstructed plan is confirmed before implementation — `ask` (default when a user is in the loop) lands the plan and stops for confirmation, `auto` (default for chain steps, schedules, and CI) documents it on the PR and executes it, `off` restores the previous hard stop for anyone who depends on it. `--goal "<text>"` states the goal for a PR whose description does not.
- **`om-auto-continue-pr-loop` no longer errors on a PR with no run folder** either — it keeps the lock, posts the chained hand-off comment, and delegates to `om-auto-continue-pr`; an adopted plan longer than `engine.loopStepThreshold` Steps comes straight back to the loop engine, which migrates the flat plan into a run folder through its existing legacy path.
- **Nothing to migrate.** No config key, tracker operation, label, or file format changed — the `## Progress` format is *produced* by adoption, not extended. Adoption reads through operations your descriptor already has; when your `.ai/trackers/<tracker>.md` copy predates **list-review-comments**, it falls back to review bodies plus conversation comments and says so in the adoption comment (re-sync via `/om-apply-upgrade-notes` to include inline review feedback in reconstructed plans).
- **Behavior to be aware of:** an adopted PR is driven under the same rules as a pipeline PR — commits are pushed to its head branch, missing labels are inferred (stated as inferred in the label-rationale comment), and a PR that its author opened ready for review is never demoted to draft. A cross-repository PR whose author did not enable maintainer edits cannot be pushed to; the plan is then delivered as a PR comment and the blocker reported.

## 2026-07-27 — reviews now pick up the feedback already posted on the PR
## 2026-07-30 — GitHub descriptor: label, assignee, and body edits move to REST

Labels stopped landing on PRs in some installations, with the run reporting a Projects (classic) deprecation error. The cause is the `gh` client, not your repository: GitHub retired the Projects (classic) GraphQL fields, and `gh pr edit` / `gh issue edit` on clients older than **2.82.1** request `projectCards` unconditionally, so `gh` aborts the whole edit *before* applying the label and exits non-zero printing only the deprecation notice.

- The shipped `github.md` descriptor now performs every label, assignee, and title/body mutation through the REST API (`gh api`), which never touches those fields — so labels apply on any client version. The guard names and argument order (`apply_label "<label>" <n>`, `apply_issue_label`, `remove_issue_label`, `set_pipeline_label <n> "<label>"`) are unchanged, so no skill changes; a new additive `remove_label "<label>" <n>` helper replaces the inline `gh pr edit --remove-label` that `label-pr` used to document, and `tracker_repo` resolves cross-repo targets inside the guards.
- **auth-check** additionally warns when `gh` is older than 2.82.1, and Prerequisites now carry the recognition rule (this error always means a stale client), the upgrade commands, and the upstream references.
- `label_exists` / **list-labels** now page through the REST labels endpoint instead of `gh label list --limit 200`, so repos with more than 200 labels stop silently missing some.
- **Re-sync `.ai/trackers/github.md`** to pick this up — see *Notable upgrades* below for the symptom and the merge instructions. Custom providers: `TEMPLATE.md` gained the general rule (mutate through the narrowest API surface; never depend on fields you do not change) and the widened **auth-check** contract.
- Independently of the descriptor, **upgrade `gh` to ≥ 2.82.1**. Read paths keep the coupling — `gh issue view` / `gh pr view` without `--json` still render the classic project column. Distro packages lag badly (Debian bookworm 2.23, Ubuntu 2.45, Alpine stable 2.72, all affected); install from GitHub's own package repositories or Homebrew.

## 2026-07-25 — New skill: om-brainstorm (the conversation before the pipeline)

- **New skill:** `om-brainstorm` — interactive, read-only divergent conversation for a vague idea or plain question, converging on a user-confirmed routing decision into the pipeline (park as issue, autonomous spec, interactive spec, direct PR, or an existing issue) plus a handoff brief under `${SPECS_DIR}/briefs/`.
- **New additive marker lines** at the end of its final report: `Next: none` | `Next: om-<skill> <args>` and `Brief: <repo-relative path>` — parsed by session orchestrators to route the follow-up run. No existing consumer changes; nothing to migrate.
- Install via `npx skills add open-mercato/skills --skill om-brainstorm` (or `--skill '*'`).

## 2026-07-24 — configurable review granularity in the loop engines (`engine.stepReview`)

- New optional config key `engine.stepReview`: `final` (default — only the authoritative end-of-run review, today's behavior), `checkpoint` (review the diff landed since the previous checkpoint at every checkpoint pass), `per-step` (review each Step's commit range as it lands). Mid-run blocker/major findings are fixed immediately as `X.Y-review-fix` Steps in a bounded loop; minors defer to the final review, which runs in every mode and remains the only review posted to the PR.
- Additive — existing configs keep `final` and their exact current behavior and cost. `per-step` multiplies review cost by the Step count; `checkpoint` is the middle ground.

## 2026-07-24 — Tasks table gains an `Exec` column (executor placement + model tier)

- `om-auto-create-pr-loop` now writes a sixth Tasks-table column: `| Phase | Step | Title | Exec | Status | Commit |`. `Exec` fixes, per Step and at planning time, whether it runs inline, is dispatched to an executor subagent, or is grouped with adjacent coupled Steps — optionally suffixed with an abstract model tier (`:cheap` / `:standard` / `:capable`).
- **Committed old plans keep working.** `om-auto-continue-pr-loop` parses five-column tables exactly as before, applies the legacy dispatch heuristic, and never rewrites a committed table to add the column.
- **Old installed skills against new plans:** resume-point parsing keys on the `Status`/`Step` columns and still resolves; a pre-upgrade skill copy simply ignores the placement data. Re-run `npx skills add open-mercato/skills --skill '*'` to get plan-driven dispatch.
- New optional config key `engine.executorTier` (default `standard`) sets the tier when a dispatched Step's cell names none. Additive — existing `.ai/agentic.config.json` files need no change; tiers are ignored entirely on harnesses without subagent model selection.
- A problematic executor result now gets **one rescue attempt** — a fresh executor one tier above, carrying the failure report — before the safety stops halt the run. Runs that previously parked on a single failed executor may now finish; the halt behavior is unchanged when the rescue also fails, the Step already ran at `capable`, or two consecutive Steps needed rescuing.

## 2026-07-24 — plain create-PR runs self-escalate to the loop engine

`om-auto-create-pr` now routes itself: with `--loop`, or when its drafted plan exceeds `engine.loopStepThreshold` Steps (new optional config key, default 20 — the previously hard-coded rule), it hands the run to `om-auto-create-pr-loop`. Briefs that used to run plain past 20 Steps now produce a run folder with per-step commits; raise `engine.loopStepThreshold` in `.ai/agentic.config.json` to keep more runs plain. Existing configs need no migration — the missing key defaults to the old threshold.

## 2026-07-23 — review autofix opt-in, atomic spec PRs, templated reporting

- **`om-auto-review-pr` no longer autofixes other authors' PRs by default.** The autofix loop runs only when the PR author is the automation identity or `--autofix` was passed; otherwise the run ends with the review, labels, and author handoff. Chains that exist to fix (`om-auto-fix-pr`, `om-auto-fix-issue`) now pass `--autofix` explicitly; `om-review-prs` sweeps review-only. If your flow relied on the old always-autofix behavior, add `--autofix`.
- **Spec PRs stay design-only.** The spec→feature "reframe" is gone: implementing a spec that lives on a spec PR now opens a **separate implementation PR** carrying `Refs #{specPr}` + `Source doc:` (`om-auto-implement-spec`; the continue skills refuse to grow implementation on a spec-only branch and hand off instead).
- **New tracker operation `update-comment`** (edit a conversation comment in place) powers marker-idempotent comments — re-sync your tracker descriptor; without it, skills degrade to posting superseding comments.
- **Label rationale is one idempotent comment** per skill per PR/issue: one label per line with its emoji and a full-sentence reason, rewritten in place on every label change — the per-change one-liner comments and the `·`-concatenated rationale are gone.
- **Reporting is template-based.** Every skill's user-facing report/comment shapes live in `references/report-templates.md` (or the template file its steps name), emoji-structured with full sentences — aligned so output quality no longer depends on the agent runtime (Claude vs Codex). `mark-pr-ready` is now also exercised by `om-auto-fix-pr` / `om-auto-review-pr` (draft promotion when a PR reaches merge-ready).

- **PRs open ready-for-review by default.** `om-open-pr` (and every skill delegating to it) no longer opens drafts; draft is reserved for explicitly incomplete states (`--draft`: spec-only design PRs, interrupted hand-offs, `⚠ NEEDS HUMAN CONFIRMATION` autonomous defaults). If your process relied on agent PRs arriving as drafts, gate on the `review` pipeline label / QA gate instead.
- **`om-open-pr` now applies the full SDLC label set** (pipeline `review` + category + QA meta + one priority + one risk) with rationale comments — previously it applied only a subset, so chains like issue → PR could end up missing the pipeline label.
- **New skills:** `om-auto-write-spec` (brief/issue → autonomous spec PR with mockups/screenshots) and `om-auto-implement-spec` (spec → implemented, reviewed, UI-verified PR). `om-auto-implement-issue` is now a router over `om-auto-fix-issue` / these two.
- **`om-spec-writing` gains `--autonomous`**; the Open Questions gate stays a hard stop in interactive runs.
- Re-sync your tracker descriptor if it predates the `mark-pr-ready` / `attach-image-evidence` operations — several skills now depend on them.

## 2026-07-18 — `om-gap-analysis` and `om-app-spec-writing` moved out

These two skills were engagement/project-oriented rather than pipeline-agnostic and now live in
[open-mercato/open-mercato](https://github.com/open-mercato/open-mercato) under `.ai/skills/`
(opt-in `analysis` tier; see open-mercato/open-mercato#4276). Re-running
`npx skills add open-mercato/skills --skill '*'` no longer installs them — remove stale copies
from your agents' skill directories if you had them, and install them from that repository instead.

**The `om-apply-upgrade-notes` skill automates this document**: run `/om-apply-upgrade-notes` in the consuming repository and it re-syncs the tracker descriptor (preserving local edits), checks the config, and walks the notable-upgrades log below. The rest of this file is the manual path and the reference for what the skill does.

**After every skills upgrade, re-sync your tracker and browser descriptors.** A stale descriptor fails
gracefully but silently: a skill that names a tracker operation your installed descriptor does not
define will degrade (or skip the step) instead of erroring, so you may not notice you are missing
new behavior.

## Re-syncing the tracker descriptor

The shipped descriptors live in `skills/om-setup-agent-pipeline/references/trackers/`
(`github.md`, plus `TEMPLATE.md` for custom providers). Your installed copy is
`.ai/trackers/<tracker>.md` in the consuming repository.

```bash
# 1. See what changed (installed vs shipped)
diff .ai/trackers/github.md <path-to-skills>/om-setup-agent-pipeline/references/trackers/github.md

# 2a. No local edits (the diff shows only additions from the template): just copy
cp <path-to-skills>/om-setup-agent-pipeline/references/trackers/github.md .ai/trackers/github.md

# 2b. Local edits present: merge the new operation sections into your copy,
#     keeping your customized commands — the operation headings (#### <name>)
#     are the merge units.
```

`<path-to-skills>` is wherever the skills are installed for your agent, e.g.
`~/.claude/skills`, `~/.codex/skills`, or a vendored checkout inside your repo.
Re-running `/om-setup-agent-pipeline` also refreshes the descriptor, but plain-copies it —
prefer the diff-and-merge route when you have customized operations.

For a **custom tracker** (`.ai/trackers/<name>.md` written from `TEMPLATE.md`): diff the new
`TEMPLATE.md` against the version you built from, and implement any newly added operations for
your tracker.

Browser descriptors use the same process. Shipped copies live under
`skills/om-setup-agent-pipeline/references/browsers/`; installed copies live at
`.ai/browsers/<provider>.md`. Diff and merge by `### <operation>` section, or
re-run `/om-setup-agent-pipeline` to choose and install a provider while
preserving the rest of the config.

## Notable upgrades

Newest first. Each entry lists the symptom you will see with a stale installation and the fix.

### 2026-07 — GitHub descriptor: REST-based label/assignee/body mutations + a `gh` version floor

The shipped `github.md` moved every label, assignee, and title/body mutation off `gh pr edit` / `gh issue edit` and onto the REST API (`gh api`), because GitHub's Projects (classic) sunset makes those two commands abort on clients older than `gh` 2.82.1. **auth-check** now also warns about a stale client, and the guards resolve cross-repo targets themselves via `tracker_repo`.

- **Symptom of a stale descriptor:** a run reports it applied the pipeline labels, but the PR stays unlabeled (or keeps the previous pipeline label), and the log carries `GraphQL: Projects (classic) is being deprecated … (repository.pullRequest.projectCards)`. Depending on how the run handles the non-zero exit, it either stops mid-way through the label set — leaving a PR with, say, a category label but no pipeline label — or continues and reports success it did not achieve. The same error on `assign-pr` breaks the claim protocol, so concurrent automation no longer backs off; on **update-pr** / **update-issue** it silently leaves the old body in place.
- **Fix:** re-sync `.ai/trackers/github.md` as described above. The merge units are the `## Label guards` block (take the new REST guards wholesale — the guard names and argument order are unchanged, so local callers keep working) and the `#### auth-check`, `#### update-issue`, `#### assign-issue / unassign-issue`, `#### update-pr`, `#### assign-pr / unassign-pr`, `#### label-pr / unlabel-pr`, and `#### list-labels` sections. If your copy has local edits inside the guards, port them onto the REST bodies rather than keeping the `gh pr edit` forms. Custom providers: apply the new `TEMPLATE.md` rule — mutate through the narrowest API surface the tracker offers, and treat **auth-check** as covering client-version compatibility, not just credentials.
- **Also upgrade `gh` itself to ≥ 2.82.1** on every machine and CI runner that runs these skills. The descriptor change keeps mutations working on old clients, but read paths (`gh issue view` / `gh pr view` without `--json`) still fail, and `projectCards` must never appear in a `--json` field list on any version.

### 2026-07 — `update-pr` tracker operation + spec→feature PR reframe (PR #46)

`om-auto-continue-pr` and `om-auto-continue-pr-loop` now reframe a doc-originated
spec PR (opened by `om-auto-write-spec`, continued by `om-auto-implement-spec`)
into a feature PR once a resume lands implementation code: title, body, and
`documentation`/`skip-qa`/`risk-low` labels are rewritten to describe the shipped
work, with the original spec description preserved verbatim in a collapsed
`Original spec-PR description (for the record)` section. The rewrite goes through
a new tracker operation **update-pr** (for GitHub: `gh pr edit --title --body-file`,
with a `gh api` PATCH fallback), which the descriptor now defines.

- **Symptom of a stale descriptor:** a spec PR that grew an implementation keeps
  shipping under its `docs(specs):` title with a `Breaking Changes: None — design
  only` body — the reframe step degrades or is skipped because the installed
  descriptor has no `#### update-pr` section.
- **Fix:** re-sync `.ai/trackers/github.md` as above (the new `#### update-pr`
  section is the relevant addition). Custom providers: implement **update-pr**
  per the updated `TEMPLATE.md` contract (rewrite the PR's own title/body in
  place — not a comment; labels and assignees have their own operations).

### 2026-07 — skill consolidation and renames

The collection consolidated to thirty skills. Two skills were renamed and two were absorbed into the driver that already invoked them:

- `om-auto-verify-pr-ui` → `om-auto-qa-pr` (and it now runs `om-auto-review-pr` first when the PR is still unreviewed, then the browser UI QA).
- `om-sync-merged-pr-issues` → `om-close-fixed-issues` (rename only; same behavior).
- `om-stabilize-ci` → **absorbed into `om-auto-fix-pr`**; its standalone use is now `om-auto-fix-pr --ci-only [--branch <name>]`.
- `om-auto-implement-issue` → **absorbed into `om-auto-fix-issue`**, now the single issue-to-PR entry point (it classifies, then routes bugs to the fix chain and features to spec-then-build).

- **Symptom of a stale installation:** the old skill directories (`om-auto-verify-pr-ui`, `om-sync-merged-pr-issues`, `om-stabilize-ci`, `om-auto-implement-issue`) linger in your agents' skill directories, so `/om-…` still resolves to a removed skill; and any repo-local override kept under an old name (`.ai/skills/<old-name>/SKILL.md`) is silently ignored, because the installed skill it shadowed no longer exists.
- **Fix:** reinstall the collection (`npx skills add open-mercato/skills --skill '*'`), then delete the four old skill directories from each agent's skill directory — they are not removed automatically. Rename any repo-local overrides to the new names: `.ai/skills/om-auto-verify-pr-ui/` → `.ai/skills/om-auto-qa-pr/`, and `.ai/skills/om-sync-merged-pr-issues/` → `.ai/skills/om-close-fixed-issues/`. For the two absorbed skills, fold the override into the absorbing skill's override: `.ai/skills/om-stabilize-ci/` into `.ai/skills/om-auto-fix-pr/`, and `.ai/skills/om-auto-implement-issue/` into `.ai/skills/om-auto-fix-issue/`.

### 2026-07 — Cross-skill coverage check in `om-setup-agent-pipeline`

Skills delegate to each other, so a cherry-picked `npx skills add … --skill <name>` install can
leave dangling references (e.g. `om-auto-fix-issue` installed without `om-root-cause`). Setup now
verifies coverage: it scans every installed skill for references to collection skills — by name and
via `om-<skill>/references/<file>` pointers — and prints a paste-ready
`npx skills add open-mercato/skills --skill <missing-1> --skill <missing-2> …` command for anything
missing (roster + detection script: `skills/om-setup-agent-pipeline/references/skill-coverage.md`).

- **Symptom of a stale installation:** a partial install only fails mid-pipeline, when a skill
  names a next step that is not installed — nothing warns at setup time.
- **Fix:** refresh the `om-setup-agent-pipeline` skill and re-run `/om-setup-agent-pipeline`
  (step "Verify cross-skill coverage") — it lists what is missing and the exact install command.

### 2026-07 — `update-issue` tracker operation + new `om-auto-manage-issues`

`om-prepare-issue` kept its name and create role, and gained a sibling —
`om-auto-manage-issues` — for existing issues: apply missing SDLC labels, clarify a
laconic issue's wording from its screenshot + terse text, and post an understanding
comment. The enrichment rewrites the issue body through a new tracker operation
**update-issue** (for GitHub: `gh issue edit --title --body-file`), which the
descriptor now defines.

- **Symptom of a stale descriptor:** `om-auto-manage-issues` can apply labels and
  post comments but cannot rewrite a laconic issue's body — the wording-clarify
  step degrades or is skipped because the installed descriptor has no
  `#### update-issue` section.
- **Fix:** re-sync `.ai/trackers/github.md` as above (the new `#### update-issue`
  section is the relevant addition). Custom providers: implement **update-issue**
  per the updated `TEMPLATE.md` contract (edit the issue's own title/body; do not
  touch labels or assignees — those have their own operations).

### 2026-07 — Browser providers and first-class agent-browser

Browser-capable skills now read `browser.provider` from
`.ai/agentic.config.json` and execute named operations from
`.ai/browsers/<provider>.md`. Fresh setups choose `agent-browser`, whose shipped
descriptor installs its native CLI, Chrome for Testing, and available OS
libraries autonomously on macOS, Linux, WSL2, Git Bash, and native Windows.
Playwright remains available as a provider and as the implicit fallback for
older configs.

- **Symptom of a stale installation:** QA skills continue using their embedded
  Playwright flow, or an explicit `browser.provider` cannot be resolved because
  `.ai/browsers/<provider>.md` is missing.
- **Fix:** run `/om-apply-upgrade-notes --yes` to add
  `browser.provider: "playwright"` (behavior-preserving for an existing repo)
  and install `.ai/browsers/playwright.md`; then change the provider to
  `agent-browser` and install its descriptor when the team wants the new
  default. A fresh `/om-setup-agent-pipeline` run may select agent-browser
  directly. Custom providers must implement the operations in
  `references/browsers/TEMPLATE.md`.

### 2026-07 — `attach-image-evidence` tracker operation (PR #14)

QA skills no longer embed host-specific screenshot-upload logic. `om-auto-verify-pr-ui` now hands
its screenshots to the tracker operation **attach-image-evidence**, which the descriptor
implements (for GitHub: upload to a slash-free `qa-evidence-<slug>` branch via the Contents API
and embed `raw.githubusercontent.com` URLs that render inline on public repos).

- **Symptom of a stale descriptor:** UI QA evidence comments list screenshot filenames and local
  artifact paths instead of rendering the images inline, with a note that inline rendering is
  unavailable.
- **Fix:** re-sync `.ai/trackers/github.md` as above (the new `#### attach-image-evidence`
  section is the relevant addition). Custom providers: implement **attach-image-evidence** per
  the updated `TEMPLATE.md` contract — never store evidence on the change's own branch, and
  degrade to posting links when the tracker cannot render uploaded images.

### 2026-07 — `om-prepare-test-env` + environment descriptor (PR #13, #15)

QA and integration-test skills now boot the app only through `om-prepare-test-env`, which writes
a shared environment descriptor at `<paths.qa>/test-env.json` (default `.ai/qa/test-env.json`)
that other skills attach to.

- **Symptom of a stale installation:** `om-auto-verify-pr-ui` or `om-integration-tests` cannot
  find a running instance, or boots a second app instead of reusing the one already started.
- **Fix:** install/refresh the `om-prepare-test-env` skill; no descriptor change required. If your
  repo ships its own ephemeral-env tooling, the skill discovers and reuses it — document specifics
  in a repo-local `.ai/skills/om-prepare-test-env/SKILL.md` override.
