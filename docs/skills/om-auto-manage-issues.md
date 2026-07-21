# om-auto-manage-issues

> 🤖 Autonomous — runs end-to-end without supervision

Raises the quality of tracker issues that already exist — in bulk or one at a time — without touching repository source. For each issue in scope it applies the missing SDLC labels (one category, one priority, one risk), clarifies laconic issues by analyzing attached screenshots and terse text while preserving the reporter's original wording, posts a read-only implementation-prep analysis, and flags feature issues that lack a covering spec (optionally authoring one with `--write-missing-specs`). It is idempotent and claim-aware, skipping issues another actor is actively working. Use it for "triage the backlog" or "clean up issue 123".

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `{issueId}` | No | A single issue number or URL to manage; omit to select a batch. |
| `--limit <n>` | No | Batch size when no id is given. Default `25`. |
| `--state <open\|closed\|all>` | No | Batch state filter. Default `open`. |
| `--label <name>` | No (repeatable) | Restrict the batch to issues carrying (or, with `-<name>`, missing) a label. |
| `--author <login>` | No | Restrict the batch to one author. |
| `--relabel-only` | No | Apply missing SDLC labels but skip screenshot/wording enrichment and implementation-prep. |
| `--prep-impl` / `--no-prep` | No | Toggle the read-only implementation-prep analysis; defaults on for a single id, off for a batch. |
| `--write-missing-specs` | No | Default off. For a feature issue with no covering spec, author one via a design-only spec PR and link it. |
| `--dry-run` | No | Report what would change per issue and mutate nothing. |

## Works with

Works on tracker issues (not PRs), so it emits no `PR:` chaining reference lines except the spec-PR link when `--write-missing-specs` authors one, and routes a labelled, prepped issue onward to [om-auto-fix-issue](om-auto-fix-issue.md). It delegates implementation-prep to [om-root-cause](om-root-cause.md) when installed and, under `--write-missing-specs`, to [om-auto-write-spec](om-auto-write-spec.md); [om-prepare-issue](om-prepare-issue.md) and [om-spec-writing](om-spec-writing.md) cover the create-new and deep-design paths it deliberately does not.

---
*Source: [`skills/om-auto-manage-issues/SKILL.md`](../../skills/om-auto-manage-issues/SKILL.md)*
