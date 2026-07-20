<p align="center">
  <a href="https://github.com/open-mercato/open-mercato">
    <img src="docs/open-mercato.svg" alt="Open Mercato logo" width="120" />
  </a>
</p>

<h1 align="center">Open Mercato Skills</h1>

<p align="center">
  <b>🧠 plan · 🔨 implement · 🔍 review · ✅ QA gate · 🚢 merge</b><br/>
  Thirty agent skills that run a full PR pipeline. Install them into any repo, with any coding agent.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT" /></a>
  <a href="https://skills.sh"><img src="https://img.shields.io/badge/install%20via-skills.sh-blue.svg" alt="Install via skills.sh" /></a>
  <a href="https://github.com/open-mercato/skills/pulls"><img src="https://img.shields.io/badge/PRs-welcome-ff69b4.svg" alt="PRs welcome" /></a>
</p>

<!-- PIOTR: rewrite in your voice -->
These skills wrote and shipped a real product. Inside the [Open Mercato](https://github.com/open-mercato/open-mercato) project, this workflow produced ~800k lines of code with zero hand-written lines, 1700+ merged PRs, 4000 unit tests, 730 integration tests, and weekly releases, with 100+ contributors working through it. This repository extracts the pipeline itself, stripped of everything product-specific, so any team with a GitHub repo can run it.

## ⚡ 30-second quickstart

```bash
npx skills add open-mercato/skills --skill '*'
```

Install all thirty — the pipeline composes, and every skill is small until invoked. Drop `--skill '*'` to cherry-pick interactively. Skills install for 22+ coding agents (Claude Code, Cursor, Codex, and others) via [skills.sh](https://skills.sh).

Then, once per repository:

```
/om-setup-agent-pipeline
```

It inspects your repo (default branch, validation scripts, GitHub labels), asks a few questions, writes `.ai/agentic.config.json`, and generates `SDLC.md` — your team's ticket-flow doc. Every other skill reads the config.

Then ship something:

```
/om-auto-create-pr "add rate limiting to the login endpoint"
```

The agent drafts an execution plan, implements it phase by phase in an isolated worktree, runs your validation commands, reviews its own diff, and opens a labeled, reviewed PR.

**Upgrading later?** Skills auto-update on reinstall, but repo-installed artifacts — including `.ai/trackers/<tracker>.md` and `.ai/browsers/<provider>.md` — do not. Run `/om-apply-upgrade-notes` in the repo, or follow [UPGRADE_NOTES.md](UPGRADE_NOTES.md) by hand.

## 🎬 See how it works!

[![Watch on YouTube](https://img.youtube.com/vi/zPNW-xtwNsE/maxresdefault.jpg)](https://www.youtube.com/watch?v=zPNW-xtwNsE)

## 🛠️ Local development

Working on the skills themselves? Skip the `npx skills add` round-trip and symlink this checkout straight into your agents' skill directories:

```bash
npm run install-skills
```

This links every skill in `skills/` into `~/.claude/skills` (Claude Code) and `~/.codex/skills` (Codex). Because they are symlinks, any edit you make in this repo is live on the next skill invocation — no reinstall needed.

Options:

```bash
npm run install-skills -- --agent claude   # only one agent (claude or codex)
npm run install-skills -- --force          # replace existing non-symlink installs
npm run uninstall-skills                   # remove only the links owned by this repo
```

The installer never touches skills it does not own: an existing real directory (e.g. installed earlier via `npx skills add`) is skipped with a warning unless you pass `--force`, and uninstall removes only symlinks that point into this checkout.

## 🧬 How to optimize skills

Running these skills on a big model at scale is expensive. `scripts/skill-optimizer.mjs` **lowers that cost** by making a skill direct enough that a cheaper model runs it correctly — its default target is **sonnet**. It runs the skill headless in a hermetic mock repo, measures cost/speed **and quality** (finding recall, step completion, rule violations, and — for code-modifying skills — whether the produced change still meets the goal), rewrites `SKILL.md` toward what the cheaper model got wrong, and re-measures — N passes. Nothing lands unless you ask.

```bash
# Hermetic default: optimize for sonnet against a built-in mock, 2 passes.
node scripts/skill-optimizer.mjs --skill om-code-review

# Downshift: hold an opus quality bar, target sonnet (or haiku), and A/B the result.
node scripts/skill-optimizer.mjs --skill om-code-review \
  --baseline-model opus --run-model sonnet --compare-models sonnet,opus --passes 3

# Blind run: optimize and just review a PR (fresh branch, never merges).
node scripts/skill-optimizer.mjs --skill om-code-review --open-pr
```

The report ends with a **downshift verdict** — parity reached (with the cost delta, e.g. *runs on sonnet at 34% of opus cost at equal quality*) or not (what still fails and the recommended minimum model). It never touches `skills/<name>` unless you pass `--apply-final` or `--open-pr`, and no run can commit, push, or reach a tracker. **Full guide, including every flag, the mock scenarios, quality scoring, and CI dispatch: [docs/skill-optimizer.md](docs/skill-optimizer.md).**

## 🔁 The pipeline

Two entry paths: hand the agent a task brief (`om-auto-create-pr`), or hand it a GitHub issue (`om-auto-fix-issue`). The issue path classifies first — a bug drives the autofix chain, a feature request is routed to `om-auto-implement-issue`, which writes a spec, lands it on a PR, then implements it. All paths converge on the same review loop and the same QA gate. Skills claim PRs and issues with an `in-progress` label, so concurrent agents back off instead of colliding.

```mermaid
flowchart LR
    subgraph brief ["From a task brief"]
        createPR["om-auto-create-pr"] --> reviewPR["om-auto-review-pr"]
        reviewPR -- "changes requested" --> continuePR["om-auto-continue-pr"]
        continuePR --> reviewPR
        reviewPR -- "approved" --> qaGate{"QA gate"}
        qaGate -- "skip-qa" --> mergePR["om-merge-buddy /<br/>om-approve-merge-pr"]
        qaGate -- "needs-qa" --> manualQA["manual QA"]
        manualQA -- "qa-approved" --> mergePR
    end
    subgraph issue ["From a GitHub issue: om-auto-fix-issue classifies, then routes"]
        classify{"bug or FR?"}
        classify -- "bug" --> verifyStep["om-verify-in-repo"]
        verifyStep --> rootCause["om-root-cause"]
        rootCause --> applyFix["om-fix"]
        applyFix --> openPR["om-open-pr"]
        classify -- "feature request" --> implementFR["om-auto-implement-issue<br/>(spec → PR → implement)"]
    end
    openPR --> reviewPR
    implementFR --> reviewPR
```

## 📦 Skill catalog

### 🤖 Autonomous skills

Hand these a brief, an issue, or nothing at all — they run end-to-end without supervision: they claim their work with the `in-progress` lock so concurrent agents back off, work in isolated worktrees so your checkout stays untouched, run the validation gate, self-review, and finish with a PR, a review verdict, or a reconciled tracker. Safe to run on a schedule or in CI.

| Skill | What it does autonomously |
|---|---|
| `om-auto-create-pr` | Takes a free-form task brief end-to-end: execution plan, isolated worktree, phase-by-phase commits, validation gate, self-review, labeled PR, then an autofix review loop until clean. Resumable. |
| `om-auto-create-pr-loop` | Advanced om-auto-create-pr for long spec implementations: run folder with PLAN/HANDOFF/NOTIFY, one commit per step, checkpoint verification every ~5 steps, executor-dispatch for many-step runs, full gate at completion. |
| `om-auto-fix-issue` | Fixes a tracker issue end-to-end by driving the autofix chain: classifies the issue first (routing feature requests to `om-auto-implement-issue`), then for a bug runs the triage gate, root-cause analysis, minimal fix with regression tests, labeled draft PR, autofix review loop. Stops cleanly when the issue is already solved or claimed. |
| `om-auto-implement-issue` | Implements a feature-request issue end-to-end by combining spec-writing and auto-create-pr: confirms the feature is unbuilt, writes (or reuses) a spec and lands it on a PR first, then implements it phase-by-phase with the validation gate, labels, and the autofix review loop. `--spec-only` stops after the spec PR. Resumable. |
| `om-auto-continue-pr` | Resumes an in-progress PR from the first unchecked step in its tracking plan and carries it to completion — implementation, validation, review loop, summary comment. |
| `om-auto-continue-pr-loop` | Resumes runs started by `om-auto-create-pr-loop`: orients from HANDOFF.md, picks up at the first non-done Tasks-table row, keeps the per-step commit and checkpoint discipline to completion. |
| `om-auto-review-pr` | Reviews a PR by number in an isolated worktree, approves or requests changes, manages labels. On changes-requested, its autofix loop iterates fixes and re-review until merge-ready. |
| `om-auto-fix-pr` | Drives one PR to merge-ready: merges the latest base in first, then loops review-autofix (`om-auto-review-pr`), CI stabilization (`om-stabilize-ci`), and UI verification (`om-auto-verify-pr-ui`), re-merging base whenever it advances. Files follow-up issues for non-blocking nits via `om-followup-issue-from-pr`, keeps the fork carry-forward supersede/credit rules, normalizes labels, and hands off to `om-approve-merge-pr` — it never merges itself. |
| `om-review-prs` | Sweeps all unreviewed open PRs, newest first, through `om-auto-review-pr`, respecting claim locks. |
| `om-sync-merged-pr-issues` | Post-merge housekeeping sweep: closes issues that merged PRs fix, comments on issues whose PRs were closed without merging. |
| `om-stabilize-ci` | Drives a PR or branch to green CI: reads failing checks and their logs through tracker operations, classifies each failure (real bug / test bug / flake / infra), fixes with tests in an isolated worktree, pushes, and re-checks until every required check passes. Never fakes green. |

### 🧑‍💻 You invoke

Interactive helpers: they act once, report, and hand control back to you.

| Skill | What it does |
|---|---|
| `om-setup-agent-pipeline` | One-per-repo configurator. Inspects the repository, asks a few questions, writes `.ai/agentic.config.json`, installs tracker and browser-provider descriptors, generates `SDLC.md` and an `AGENTS.md` starter when missing. |
| `om-apply-upgrade-notes` | Post-upgrade migrator. Applies `UPGRADE_NOTES.md` to the repo: re-syncs installed tracker/browser descriptors while preserving local edits, reports custom-provider gaps, and checks the config against notable upgrades. |
| `om-merge-buddy` | Scans open PRs and reports which can merge now and which are close but blocked, based on labels, reviews, CI, and mergeability. |
| `om-approve-merge-pr` | Approves and squash-merges a PR given only its number. Can file a follow-up issue at the same time. |
| `om-check-and-commit` | Runs the configured validation gate on the current branch, fixes obvious drift, then commits and pushes when green. |
| `om-followup-issue-from-pr` | Turns a PR or a PR comment into a tracked follow-up issue, assigned to the right person. |
| `om-spec-writing` | Writes and reviews feature specs to staff-engineer standards: skeleton-first with a hard Open Questions gate, phased implementation breakdown that feeds `om-auto-create-pr`, severity-ranked architectural reviews. |
| `om-prepare-issue` | Files a single well-formed tracker issue for deferred work: dedupes against existing issues and PRs first, links a covering spec when one exists in the repo or an open PR, otherwise embeds a step-by-step implementation analysis, and applies the SDLC labels (category + inferred priority + risk) on creation — and for a feature that needs a spec but has none, authors one via `om-spec-writing` and lands it on a design-only spec PR, then links it. |
| `om-auto-manage-issues` | Brings existing issues up to standard, single or in bulk: applies missing SDLC labels, and for a laconic issue (one line + a screenshot) analyzes the screenshot with the terse text, clarifies the wording non-destructively, and posts the agent's understanding as a comment. Batch defaults to the last ~25 open, worst-described first, narrowable by state/label/author/limit. Idempotent and claim-aware. |
| `om-integration-tests` | Creates and runs integration/E2E tests by exploring the running app first — real locators, runtime fixtures, no hardcoded IDs — and reports failures with artifact-based per-test diagnosis. Reuses the shared `om-prepare-test-env` instance so QA and tests hit the same booted app. |
| `om-auto-verify-pr-ui` | Runs the app locally and QAs a change's UI in a real browser without merging: boots via `om-prepare-test-env`, derives a scenario from the diff, drives the configured browser provider with screenshots, and produces a pass/fail report. Posts evidence as a PR comment when a tracker is configured; otherwise saves screenshots + JSON/Markdown reports. |
| `om-auto-update-changelog` | Drafts a CHANGELOG.md release entry for every PR merged since the last release — emoji categories, contributor credits with the Supersede Credit Rule for carried-forward fork PRs — then delegates to `om-auto-create-pr` to ship it as a docs PR. |

### 🤝 Skills invoke each other

The building blocks behind the autofix chain and the review loop. You can call them directly, but they mainly exist for the other skills to compose.

| Skill | What it does |
|---|---|
| `om-verify-in-repo` | Read-only triage gate: decides whether a GitHub issue is a real, still-unfixed defect, and stops the chain cleanly when there is nothing to do. |
| `om-root-cause` | Read-only analysis: locates the bug and the minimal change surface so the fix step never re-explores the repo. |
| `om-fix` | Implements the minimal change, adds regression tests, runs the validation gate. Does not commit or push. |
| `om-open-pr` | Commits the worktree, pushes the branch, opens the PR, normalizes labels, releases the claim lock. |
| `om-code-review` | The review checklist behind `om-auto-review-pr`: correctness, security, contract surfaces, plus your repo-local checklist when configured. |
| `om-prepare-test-env` | Boots the app for QA and tests, any stack: reuses the repo's own environment or generates portable bring-up scripts, then caches builds and validates warm reuse. It autonomously provisions the configured browser provider (agent-browser by default; Playwright supported), writes a shared environment descriptor, and works on macOS, Linux, WSL2, and Windows. |

## 🧰 Works with any stack

Nothing here assumes JavaScript, or any particular product. The base branch, the validation commands, the label taxonomy, and the working paths all come from one committed file, `.ai/agentic.config.json`, written by `om-setup-agent-pipeline`:

```json
{
  "version": 1,
  "baseBranch": "auto",
  "tracker": "github",
  "browser": { "provider": "agent-browser" },
  "validation": {
    "commands": ["pnpm typecheck", "pnpm test", "pnpm build"]
  },
  "labels": {
    "enabled": true,
    "pipeline": ["review", "changes-requested", "qa", "qa-failed", "merge-queue", "blocked", "do-not-merge"],
    "category": ["bug", "feature", "refactor", "security", "dependencies", "documentation"],
    "meta": ["needs-qa", "skip-qa", "qa-approved", "qa-self-verified", "in-progress"],
    "priority": ["priority-low", "priority-medium", "priority-high", "priority-extreme"],
    "risk": ["risk-low", "risk-medium", "risk-high"]
  },
  "qaGate": true,
  "paths": {
    "runs": ".ai/runs",
    "analysis": ".ai/analysis",
    "specs": ".ai/specs",
    "scripts": ".ai/scripts",
    "qa": ".ai/qa"
  },
  "reviewChecklist": null
}
```

A Rust repo puts `cargo test` and `cargo clippy` in `validation.commands`; a Go repo puts `go test ./...`. Skills run whatever you configure and treat any non-zero exit as a gate failure. A skill invoked in a repo without the config runs `om-setup-agent-pipeline` first — interactively when you're there to answer its questions, with `--defaults` when running unattended — then continues with the freshly written config.

GitHub is the default tracker, but nothing in the skills is hard-wired to it — see the tracker providers section below.

Agent-browser is the default browser automation provider for fresh setups. It
installs itself and Chrome for Testing when needed; existing repositories remain
on Playwright until their config makes a provider explicit.

## 🎨 Make it yours

Four layers of project fit, no forking:

- **Agent instructions** — skills read your `AGENTS.md` / `CLAUDE.md` before working, so project conventions apply from the first run. No such file? `om-setup-agent-pipeline` offers a starter.
- **Generated project docs** — `SDLC.md` (the process doc), `CODE_REVIEW.md` (review rules, auto-applied by `om-code-review`), `BACKWARD_COMPATIBILITY.md` (protected contract surfaces — reviews flag violations, implementations warn you), and an `AGENTS.md` starter with a task-routing table. `om-setup-agent-pipeline` derives each from your repository and only when the file is missing; existing docs are honored as-is.
- **Repo-local skills** — drop a skill with the same name into your repo at `.ai/skills/<skill-name>/SKILL.md` and it takes precedence over the installed one (details below).
- **Tracker descriptor** — every issue/PR/label command the skills run lives in one committed file, `.ai/trackers/<tracker>.md`, that you can edit or replace (details below).

## 🧩 Extending the skills

### Repo-local skill overrides

Every installed skill checks, right after loading the config, for a repo-local skill of the same name at `.ai/skills/<skill-name>/SKILL.md`. When present, the local skill wins — the installed one follows it instead of its own instructions. To *extend* rather than replace, the local skill just `@`-imports or references the installed skill and adds rules on top:

```markdown
<!-- .ai/skills/om-auto-review-pr/SKILL.md -->
Follow the installed `om-auto-review-pr` skill, plus:

- Also run `pnpm test:e2e` before approving PRs that touch `apps/web`.
- Our PR body template additionally requires a "Screenshots" section for UI changes.
```

Local rules win, but a local skill can never relax the installed skill's safety rules (no skipping tests, no `--no-verify`, no force-pushes). This convention is also what makes the collection a drop-in for repos that already keep specialized `om-*` skills under `.ai/skills/`: the installed skills defer to them automatically.

### Project management (tracker) providers

No skill calls `gh` — or any tracker CLI — directly. Skills name **tracker operations** (**get-issue**, **create-pr**, **comment-pr**, **merge-pr**, …) and one committed descriptor file, `.ai/trackers/<tracker>.md`, defines how each operation is executed. `om-setup-agent-pipeline` asks which tracker you use, sets the config's `tracker` field, and installs the matching descriptor into your repo.

That file is yours, which makes three things easy:

- **Extend or override GitHub behavior** — edit `.ai/trackers/github.md`: add flags, change the merge strategy, adjust comment conventions, extend the label taxonomy commands. Every skill picks it up on its next run.
- **Bring your own tracker (Linear, Jira, …)** — write `.ai/trackers/<name>.md` from the shipped `TEMPLATE.md` (in `om-setup-agent-pipeline/references/trackers/`), implementing each operation with your tracker's CLI, MCP tools, or API, and set `"tracker": "<name>"` in the config. No skill changes needed — the descriptor is the whole integration surface.
- **Split setups** — issues in Linear, PRs on GitHub: implement the issue operations against Linear and delegate the PR sections to the GitHub descriptor. The template documents this pattern, including how identifiers cross-link (a `ENG-123` ticket referenced from a GitHub PR).

The claim protocol (assignee + `in-progress` + 🤖 comment), the label guards (missing label ⇒ logged skip, `labels.enabled: false` ⇒ no label ops), and the QA gate semantics are part of the contract — a provider must express them, in whatever way its tracker allows.

### Browser automation providers

QA and integration-test skills select `browser.provider` from
`.ai/agentic.config.json` and execute the committed descriptor at
`.ai/browsers/<provider>.md`. Fresh setups use agent-browser; Playwright remains
available for existing repositories and teams that prefer it. The agent-browser
descriptor downloads its native release binary and Chrome for Testing itself,
then verifies a live headless launch — no Node runtime, project dependency, or
cloud-browser subscription is required.

Custom providers implement the operations in
`skills/om-setup-agent-pipeline/references/browsers/TEMPLATE.md`. Repository E2E
suites remain authoritative; the provider controls agent-driven exploration,
assertions, and screenshots.

## 🏷️ Labels and the QA gate

Every PR carries at most one pipeline label (`review`, `changes-requested`, `merge-queue`, ...) plus additive category, meta, priority, and risk labels; priority says how urgent the work is, risk says how dangerous the change is to ship. The full taxonomy, and whether to use labels at all, lives in the config; `om-setup-agent-pipeline` documents every group and creates missing labels for you.

The QA gate is the one hard rule: a PR labeled `needs-qa` cannot merge until a human adds `qa-approved`, no matter how green the checks are. Automated skills request QA; they never grant it.

## 🚀 Built with this workflow

<!-- PROOF: case studies land here before launch -->

Real production case studies are being added here.

---

<!-- PIOTR: rewrite in your voice -->
Built by the [Open Mercato](https://github.com/open-mercato/open-mercato) team, where these skills ship the product every week. We teach this way of working at [aitechleaders.pl](https://aitechleaders.pl) (an AI engineering course, in Polish).
