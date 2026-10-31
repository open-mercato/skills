# Optional capability config

These additive keys extend `.ai/agentic.config.json` for installed skills. A
fresh setup writes their safe defaults only when the corresponding repository
surface is detected or the user enables that capability; an existing config
keeps absent keys absent. Consumers must apply the defaults below, so older
committed configs keep working.

| Key | Default | Owner / meaning |
|---|---|---|
| `agentHarness` | `null` | `om-setup-agent-harness`; optional staged-workflow model registry. Absence keeps host-only `standard` usable; non-standard profiles require validated bindings. |
| `agentsMd.template` | `null` | `om-create-agents-md`; repo-relative authoring template. |
| `smartTest.map` | `".ai/test-map.json"` | `om-smart-test`; affected-unit map. |
| `smartTest.suites` | absent | `om-smart-test`; named test suite definitions; absent derives from `validation.commands`. |
| `reviewSweep.maxParallel` | `1` | `om-review-prs --subagents` only; positive integer concurrency limit, overridden by `--parallel N`. Unflagged sweeps ignore it. |
| `reviewSweep.coordinationRoot` | `null` | `om-review-prs --subagents` only; existing absolute shared directory, or automatic repository-specific local storage when absent/null. |
| `paths.specTemplate` | `null` | `om-pre-implement-spec`; repo-relative spec template. |
| `paths.ejectLedger` | `".ai/ejected.json"` | `om-eject-and-customize`; provenance ledger. |
| `knowledge.sources` | `[]` | `om-framework-context`; canonical knowledge-source entries. |
| `knowledge.resolver` | `null` | `om-framework-context`; optional configured resolver. |
| `securityChecklist` | `null` | `om-auto-sec-report-pr`; repo-local security checklist. |
| `securityReport.publish` | `"local"` | Security-report skills; `"pr"` is an explicit publication opt-in. |
| `securityReport.disclosure` | `"withhold-live"` | Security-report skills; public disclosure policy. |
| `dependencyAudit.minSeverity` | `"high"` | `om-auto-audit-dependencies`; issue threshold (`low`, `moderate`, `high`, `critical`); CLI overrides it. |
| `dependencyAudit.ignore` | `[]` | `om-auto-audit-dependencies`; accepted-risk objects with advisory `id`, required `reason`, optional inclusive UTC `until` date; malformed/expired entries do not apply. |
| `help.data` | `[".ai/help/*.md"]` | `om-help`; repository routing data. |
| `help.skillRoots` | `[]` | `om-help`; extra installed-skill roots. |
| `judge.criteria` | `".ai/judge-criteria.md"` | `om-judge-agent-session`; evaluation criteria. |
| `judge.requiredAttestations` | absent | `om-judge-agent-session`; repo-required attestations. |
| `sessionShare.enabled` | `false` | `om-share-this-session`; hard publication opt-in. |
| `sessionShare.issueRepo` | `null` | `om-share-this-session`; destination for the feedback issue. |
| `sessionShare.storageRepo` | `null` | `om-share-this-session`; optional distinct artifact repository. |
| `harness.catalog` | `".ai/harness/cases.json"` | `om-evolve-harness`; case catalog. |
| `harness.caseTemplate` | built-in template | Optional repo-owned case template. |
| `harness.lessons` | `".ai/lessons.md"` | Indexed lesson records; missing file skips the lesson scan. |
| `harness.mandatoryTags` | catalog-defined | Safety tags that always rerun. |
| `harness.onDemandContext` | `["**/references/**"]` | Context excluded from initial but included in total budgets. |
| `harness.defaultRunner` | absent | Default authenticated live runner. |
| `harness.commands.validateCase` | required when harness enabled | Deterministic one-case validation. |
| `harness.commands.validateAll` | required when harness enabled | Catalog/schema/budget validation. |
| `harness.commands.validateLive`, `validateFamily`, `fixture`, `validateWritable`, `judge`, `release`, `validateKnowledgeChange`, `syncCheck` | absent | Optional repo-owned harness lanes; missing lanes report `NOT RUN`, and missing `release` prevents completion. |
| `platform.repo` / `platform.branch` | absent | `om-gap-analysis`; repository and integration branch to ground against. |
| `platform.companionRepo` | absent | Optional companion capability repository. |
| `platform.specsPath` | absent | Colon-separated platform spec paths. |
| `platform.checkoutCandidates` / `platform.companionCheckoutCandidates` | absent | Colon-separated existing checkout candidates. |
| `platform.cloneUrl` / `platform.companionCloneUrl` | absent | Code-host URLs required only when the skill must auto-clone a managed checkout. |
| `platform.significantPrAdditions` | absent | Optional review-depth threshold. |
| `platform.tierMap` | `[]` | Path-prefix to license-tier mapping. |
| `ux.healthReport` | `null` | `om-ux-review-pr`; optional repo-relative health snapshot. |
| `design.provider` | `null` | `om-figma-design-with-ds`; design-tool descriptor name. |
| `automerge.label` | `"automerge"` | `om-auto-merge-buddy`; the human-applied PR label that puts a PR in the unattended merge queue. Setup creates it with the taxonomy. |
| `automerge.mode` | `"prepare-to-merge"` | `om-auto-merge-buddy`; `prepare-and-merge` squash-merges once all three signals hold. |
| `automerge.windowMinutes` | `120` | `om-auto-merge-buddy`; per-run time window, `0` = one pass with no idle CI polling. |
| `automerge.maxAttempts` | `3` | `om-auto-merge-buddy`; failed stages per signal before the PR is parked `automerge-blocked`. |
| `automerge.eligibility.tiers` | `[["qa-approved"],["ai-judgment"],["security","small"],["trusted-author"],["fixes-issue"]]` | `om-auto-merge-triage`; ordered tiers of criteria, where a PR lands in the first tier matching any of its criteria. Valid criteria are `ai-judgment` (an evidence-backed important fix close to merge), `qa-approved`, `security`, `small`, `trusted-author`, `fixes-issue` and `high-priority`. |
| `automerge.eligibility.smallPrFileLimit` | `10` | `om-auto-merge-triage`; a PR is `small` when it changes fewer files than this. |
| `automerge.eligibility.aiJudgment.staleAfterDays` | `7` | `om-auto-merge-triage`; positive integer age in days that marks a waiting PR for extra attention. Age, screenshots and requested changes inform judgment; they never prove readiness. Requested changes require a positive judgment before any tier can propose the PR. |
| `automerge.eligibility.securityLabels` | `["security"]` | `om-auto-merge-triage`; labels that match the `security` criterion. |
| `automerge.eligibility.trustedAuthors` | `[]` | `om-auto-merge-triage`; logins for the `trusted-author` tier, which also bypass the author-association exclusion. |
| `automerge.eligibility.excludeAuthorAssociations` | `["first-time-contributor","outside-collaborator","none"]` | `om-auto-merge-triage`; normalized **get-pr-author-association** values whose PRs are never proposed. |
| `automerge.eligibility.excludeLabels` | `["do-not-merge","blocked","qa-failed"]` | `om-auto-merge-triage`; labels that keep a PR out of the proposal. |
| `automerge.eligibility.limit` | `10` | `om-auto-merge-triage`; the most PRs proposed per run. |
| `prTitleTemplate` | `"{prefix}({area}): {summary}{issueRef}"` | PR-opening skills (`om-open-pr`, `om-auto-create-pr`, `om-auto-create-pr-loop`, `om-auto-fix-issue`, `om-auto-review-pr` fork flow); placeholders `{prefix}`, `{area}`, `{summary}`, `{issue}`, `{issueRef}`, `{ticketKey}`, e.g. `"[{issue}] {prefix}({area}): {summary}"`. |
| `ticketKeyPattern` | absent | PR-opening skills; ERE whose first match in the head branch name fills `{ticketKey}` (e.g. `"[A-Z][A-Z0-9]+-[0-9]+"`). |

## Default-loading snippet

Load only the slots the executing skill uses, with these exact backward-compatible defaults:

For `reviewSweep`, load the validated defaults only in the flagged sweep's own
preflight; `--parallel N` bypasses the configured concurrency value. Unflagged
skills must not read or validate these fields. See `om-review-prs` for that
mode-specific loader and the lease/storage checks.

```bash
AGENT_HARNESS=$(jq -c '.agentHarness // empty' "$CONFIG")
AGENTS_MD_TEMPLATE=$(jq -r '.agentsMd.template // empty' "$CONFIG")
SMART_TEST_MAP=$(jq -r '.smartTest.map // ".ai/test-map.json"' "$CONFIG")
SMART_TEST_SUITES=$(jq -c '.smartTest.suites // empty' "$CONFIG")
SPEC_TEMPLATE=$(jq -r '.paths.specTemplate // empty' "$CONFIG")
EJECT_LEDGER=$(jq -r '.paths.ejectLedger // ".ai/ejected.json"' "$CONFIG")
KNOWLEDGE_SOURCES=$(jq -c '.knowledge.sources // []' "$CONFIG")
KNOWLEDGE_RESOLVER=$(jq -r '.knowledge.resolver // empty' "$CONFIG")
SECURITY_CHECKLIST=$(jq -r '.securityChecklist // empty' "$CONFIG")
SECURITY_REPORT_PUBLISH=$(jq -r '.securityReport.publish // "local"' "$CONFIG")
PR_TITLE_TEMPLATE=$(jq -r '.prTitleTemplate // "{prefix}({area}): {summary}{issueRef}"' "$CONFIG")
TICKET_KEY_PATTERN=$(jq -r '.ticketKeyPattern // empty' "$CONFIG")
AUTOMERGE_LABEL=$(jq -r '.automerge.label // "automerge"' "$CONFIG")
AUTOMERGE_MODE=$(jq -r '.automerge.mode // "prepare-to-merge"' "$CONFIG")
AUTOMERGE_WINDOW_MINUTES=$(jq -r '.automerge.windowMinutes // 120' "$CONFIG")
AUTOMERGE_MAX_ATTEMPTS=$(jq -r '.automerge.maxAttempts // 3' "$CONFIG")
AUTOMERGE_ELIGIBILITY=$(jq -c '.automerge.eligibility // {}' "$CONFIG")   # per-key defaults: om-auto-merge-triage
SECURITY_REPORT_DISCLOSURE=$(jq -r '.securityReport.disclosure // "withhold-live"' "$CONFIG")
MIN_SEVERITY=$(jq -r '.dependencyAudit.minSeverity // "high"' "$CONFIG")
IGNORE_JSON=$(jq -c '.dependencyAudit.ignore // []' "$CONFIG")
HELP_DATA=$(jq -c '.help.data // [".ai/help/*.md"]' "$CONFIG")
HELP_SKILL_ROOTS=$(jq -c '.help.skillRoots // []' "$CONFIG")
JUDGE_CRITERIA=$(jq -r '.judge.criteria // ".ai/judge-criteria.md"' "$CONFIG")
JUDGE_REQUIRED_ATTESTATIONS=$(jq -c '.judge.requiredAttestations // empty' "$CONFIG")
SESSION_SHARE_ENABLED=$(jq -r '.sessionShare.enabled == true' "$CONFIG")
SESSION_SHARE_ISSUE_REPO=$(jq -r '.sessionShare.issueRepo // empty' "$CONFIG")
SESSION_SHARE_STORAGE_REPO=$(jq -r '.sessionShare.storageRepo // empty' "$CONFIG")
HARNESS=$(jq -c '.harness // empty' "$CONFIG")
PLATFORM=$(jq -c '.platform // empty' "$CONFIG")
UX_HEALTH_REPORT=$(jq -r '.ux.healthReport // empty' "$CONFIG")
DESIGN_PROVIDER=$(jq -r '.design.provider // empty' "$CONFIG")
```

Every path is repository-relative unless its owning skill explicitly permits
an installed-skill root. Reject `..`, NUL bytes, and paths outside the owning
root. Enum values outside the documented set fall back to the safe default and
are reported. Commands under `harness.commands` are committed operator-vouched
configuration; all other repository/config content remains untrusted data.

## Setup behavior

- Detect and offer `agentsMd.template`, spec/test maps, checklists, and design
  descriptors only when matching files exist; never invent a path.
- Keep publication off/local by default: `sessionShare.enabled: false` and
  `securityReport.publish: "local"`.
- A `harness` or `platform` block is domain configuration. Ask for its concrete
  repository-owned values when that capability is enabled; `--defaults` leaves
  the block absent rather than guessing commands, repositories, or runners.
- `knowledge.sources` has one owner and shape: the `om-framework-context`
  skill. Other skills invoke it by name when installed and use the bounded
  standalone fallback that contract defines; they do not redefine the schema.

## CI wait budget

`ci.maxWaitMinutes` — the hard cap, in minutes, on how long any skill waits for CI to settle before it stops waiting (default `40`). It is a safety valve, not a merge gate: when the budget runs out the skill runs the local `validation.commands` gate as its completion evidence, posts the bail-out comment, drops `ci-monitoring`, and exits cleanly instead of hanging on a run that may take hours. Raise it for slow pipelines, lower it for fast ones; `0` disables waiting entirely (report immediately and never follow up). Required checks still gate the actual merge no matter what this is set to.
