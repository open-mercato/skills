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
