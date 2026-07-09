# Upgrade notes

Upgrading the skills themselves is easy — re-run `npx skills add open-mercato/skills --skill '*'`
(or `git pull` in a symlinked local checkout) and the new skill instructions are live on the next
invocation. What does **not** auto-update is everything a skill previously **installed into your
repository**. Those files are yours, they may carry your local edits, and the skills execute
against them — not against the copies shipped in this repo:

| Installed artifact | Installed by | Updated how |
|--------------------|--------------|-------------|
| `.ai/trackers/<tracker>.md` (tracker descriptor — the file every tracker operation executes from) | `om-setup-agent-pipeline` | Manual re-sync (see below) |
| `.ai/agentic.config.json` | `om-setup-agent-pipeline` | Re-run `/om-setup-agent-pipeline`; it preserves answers where it can |
| `SDLC.md`, `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`, `AGENTS.md` starter | `om-setup-agent-pipeline` | Regenerated only when missing — edit or regenerate deliberately |
| `.ai/skills/<name>/SKILL.md` repo-local overrides | you | Never touched by upgrades; review them against new skill behavior |

**After every skills upgrade, re-sync your tracker descriptor.** A stale descriptor fails
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

## Notable upgrades

Newest first. Each entry lists the symptom you will see with a stale installation and the fix.

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
