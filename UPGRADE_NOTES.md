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
| `.ai/agentic.config.json` | `om-setup-agent-pipeline`; optional `agentHarness` section by `om-setup-agent-harness` | Re-run the owning setup skill; both preserve unrelated values |
| `.claude/output-styles/om-harness-review.md` (optional) | `om-setup-agent-harness` | Re-run `/om-setup-agent-harness` and review the diff before replacing local edits |
| `.claude/hooks/om-harness/*.sh` + `PreToolUse` entries in `.claude/settings.json` (optional prevention hooks) | `om-setup-agent-harness` | Re-run `/om-setup-agent-harness` and review the diff before replacing local edits |
| `SDLC.md`, `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`, `AGENTS.md` starter | `om-setup-agent-pipeline` | Regenerated only when missing — edit or regenerate deliberately |
| `.ai/skills/<name>/SKILL.md` repo-local overrides | you | Never touched by upgrades; review them against new skill behavior |

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

### 2026-07 — Strict councils: reviewer retries + all-required policy + restructured reviewer prompt

Reviewer invocations that fail (timeout, provider 5xx/network error, invalid
JSON, ref-mutation rejection) are now retried automatically with exponential
backoff and per-attempt timeout escalation (`agentHarness.retry`, per-profile
override). The shipped `multi`, `multi-optimized`, and `high-assurance`
profiles switched from `quorum` to **`all-required`**: every selected reviewer
must complete, and a council still missing one after retries emits **no
verdict** (`verdict: null`, exit 2) instead of a partial result — the wrapper
re-runs the review, repairs the binding, or stops for the user. The reviewer
prompt was also restructured per the current prompt-engineering guidance
(long data first inside XML tags, instructions and a strict machine-readable
output contract with an example at the end, split-part context note).

**Symptom with a stale installed config:** your `.ai/agentic.config.json`
still carries `"mode": "quorum"` on the multi profiles, so failed reviewers
are silently tolerated. **Fix:** re-run `/om-setup-agent-harness` (it preserves
custom models) or hand-edit the profiles to
`{"mode": "all-required", "requiredReviewers": [<your reviewer ids>]}` and add
a top-level `"retry"` block (see `om-harness/references/configuration.md`).

### 2026-07 — Additive staged-only multi-model harness

The collection now ships a separate staged-only path: `om-fix-issue` and
`om-implement-feature` wrap existing lower-level skills, while `om-harness`
provides configurable command/HTTP adapters, review councils, deterministic
model matrices, and an unchanged-ref/reflog staging gate. The existing autonomous PR
skills are unchanged.

Fresh harness setup offers a bundled selectable jury: Codex (default
`gpt-5.6-sol` at `xhigh`), DeepSeek V4 Pro,
managed-subscription Kimi K3 (`kimi-code/k3`, thinking — `max` is its only
effort level today), OpenCode Zen GLM 5.2, and OpenCode Zen MiMo 2.5 Free.
Users may keep any subset or add custom command/OpenAI-compatible models. Setup
probes credentials without printing them and smoke-tests every selected model.
Setup also installs optional prevention hooks (`.claude/hooks/om-harness/`):
a PreToolUse guard that denies `git push`/PR creation during staged-only runs
and a test-freeze guard driven by the `.om-freeze-tests` sentinel. Profile
`concurrency` now accepts only the `reviewers` key — remove the old
`workers`/`fixers`/`heavyValidation` keys from any pre-release config before
re-running `validate-config`.

The same preset now includes an opt-in `high-assurance` profile with bounded
packet manifests, path leases, risk-scaled blind reviewers, fresh finding
verification, separate fixer invocations, model budgets, and deterministic
acceptance evidence bound to the exact reviewed diff. Existing `standard`,
`optimized`, `multi`, and `multi-optimized` configuration shapes remain
compatible.

Bound wrapper councils now prepare a version 1 `om-code-review` packet for the
exact diagnosis/spec/diff. Claude must review it in a new context without the
implementation transcript, and every configured advisor receives the same full
installed rubric in a fresh invocation. The runtime validates the Claude,
packet, subject, and rubric hashes before fan-out and renders all reviewers in
one matrix; provider quorum does not count the mandatory Claude pass.

A fresh repository needs no provider setup for the default path: `standard`
runs use only the Claude host (fresh `om-code-review` pass plus the
`capture`/`stage` runtime) and work without an `agentHarness` section. The
`-multi`/`-optimized` wrappers reroute to `/om-setup-agent-harness` when their
profile is missing or unready; that setup can bind any OpenAI-compatible
endpoint or local CLI as a reviewer, not just the bundled jury.

- **Symptom of a stale installation:** staged wrapper names are unavailable, or
  a wrapper reports that `agentHarness` is missing.
- **Fix:** reinstall the skill collection, run `/om-setup-agent-harness`, review
  and commit the staged config, then rerun the wrapper. Keep credentials in
  environment variables or user-local configuration; never add them to the
  repository config.

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
