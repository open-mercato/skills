# 1.2.0 (2026-11-05)

## Highlights

Expand discovery and design with synthetic-user panels, neutral prototypes and detailed UX screens. Add GitLab, Forgejo, Linear and Jira tracker support, plus an opt-in staged delivery harness with multi-model review. Improve release delivery with an evidence-driven merge queue, human-confirmed triage, complex QA and verified AI-context archives.

## ✨ Features
- ✨ Add Linear and Jira tracker descriptors. (#88) *(@pkarw)*
- ✨ Add `om-discover` for product discovery and a Definition of Ready. (#109) *(@matgren)*
- ✨ Add discovery setup, synthetic-user panels, neutral prototypes and backlog preparation. (#107) *(@zielivia)*
- ✨ Add `om-qa-buddy` for guided manual QA. (#115) *(@droalina)*
- ✨ Add a standalone GitLab tracker provider (supersedes #119). (#122) *(@roszekF, via @pkarw)*
- ✨ Generate data-model graphs during specification design. (#96) *(@adeptofvoltron)*
- ✨ Add 16 skills for framework context, specifications, testing, security, session tools and customization (supersedes #131). (#138) *(@adeptofvoltron, via @pkarw)*
- ✨ Configure PR titles with issue numbers and tracker keys (fixes #143) (supersedes #144). (#146) *(@lchrusciel, via @pkarw)*
- ✨ Verify and correct PR category labels during review. (#141) *(@patzick)*
- ✨ Add `om-ux-design` for detailed screens, reusable components and connected, reviewable prototypes. (#106) *(@matgren)*
- ✨ Add multi-ecosystem dependency auditing with verified upgrade candidates and deduplicated issues (supersedes #142). (#148) *(@Exsilium122, via @pkarw)*
- ✨ Add a standalone Forgejo tracker provider. (#134) *(@kzmijak)*
- ✨ Add isolated subagent and parallel modes to `om-review-prs`. (#151) *(@haxiorz)*
- ✨ Add guarded staged-only delivery, isolated worktrees and multi-model review councils. (#152) *(@haxiorz)*
- ✨ Add an evidence-driven merge queue, local dashboard and human-confirmed issue triage. (#158) *(@pkarw)*
- ✨ Rank automerge candidates and queue only human-confirmed selections. (#162) *(@pkarw)*
- ✨ Support per-PR merge policies and visible pre-merge evidence summaries. (#165) *(@pkarw)*
- ✨ Route protected and policy-defined work to human QA before queueing. (#167) *(@droalina)*
- ✨ Make complex QA the default; report incomplete applicable checks as PARTIAL. (#166) *(@droalina)*
- ✨ Rotate older AI run context into verified archives through reviewable maintenance PRs. (#168) *(@pkarw)*

## 🐛 Fixes
- 🐛 Repair stale cross-skill references and reject them in lint. (#108) *(@adeptofvoltron)*
- 🐛 Load `SDLC.md` during issue-preparation preflight. (#105) *(@matgren)*
- 🐛 Require repository-local skill override preflight. (#114) *(@pkarw)*
- 🐛 Keep the installed browser descriptor synchronized with the shipped provider. (#124) *(@adeptofvoltron)*
- 🐛 Require workflow-run completeness before declaring CI green (supersedes #89). (#123) *(@jtomaszewski, via @pkarw)*
- 🐛 Split pipeline labels portably, including under zsh (supersedes #116). (#129) *(@rafalwolak, via @pkarw)*
- 🐛 Keep synthetic-user subject briefs outside the specs directory separate from the project brief. (#139) *(@zielivia)*
- 🐛 Remove dangling references to an uncommitted skill-authoring document. (#155) *(@adeptofvoltron)*
- 🐛 Enforce human vetoes and protected-risk approval in the merge queue. (#163) *(@pkarw)*
- 🐛 Approve eligible held CI runs before parking queued PRs. (#169) *(@pkarw)*
- 🐛 Combine rotated AI runs into one verified batch archive while preserving recovery safeguards. (#170) *(@pkarw)*
- 🐛 Limit protected-area escalation to changes that widen access or risk. (#172) *(@droalina)*
- 🐛 Allow verified bot claims when self-assignment is blocked, preserving ownership and collision guards. (#173)

## 🛠️ Improvements
- 🛠️ Refresh this repository’s pipeline configuration to match the shipped contracts. (#98) *(@matgren)*
- 🛠️ Update the pinned agent-browser to v0.35.2. (#97)
- 🛠️ Update the pinned agent-browser to v0.38.2. (#130)
- 🛠️ Update the pinned agent-browser to v0.41.1. (#164)

## 📝 Specs & Documentation
- 📝 Specify a portable interactive prototype workflow independent of a particular design system. (#91) *(@matgren)*
- 📝 Document the QA and design skills used throughout the delivery lifecycle. (#112) *(@matgren)*
- 📝 Make PR and issue output decision-oriented, with concise findings and evidence. (#110) *(@pat-lewczuk)*
- 📝 Specify linked spec trees, stable identifiers and a validating resolver. (#103) *(@matgren-challengeen)*
- 📝 Document the Forgejo tracker-provider specification. (#133) *(@kzmijak)*

## 👥 Contributors

- @pkarw
- @matgren
- @zielivia
- @droalina
- @roszekF
- @adeptofvoltron
- @lchrusciel
- @patzick
- @Exsilium122
- @kzmijak
- @haxiorz
- @jtomaszewski
- @rafalwolak
- @pat-lewczuk
- @matgren-challengeen

---

# 1.1.0 (2026-08-13)

## Highlights
<!-- TODO: Highlights — auto-update-changelog leaves this blank for the human author to fill in. -->

## ✨ Features
- ✨ Reframe doc-originated spec PRs into feature PRs. (#46) *(@pkarw)*
- ✨ Default to plain engine, gate loop behind >20 steps or `--loop`. (#47) *(@pkarw)*
- ✨ Templated reporting, autofix opt-in, atomic spec PRs, idempotent label rationale. (#49) *(@pkarw)*
- ✨ Self-route plain vs loop — engine selection moves into the engine, threshold configurable. (#54) *(@matgren)*
- ✨ Plan-time executor dispatch — `Exec` column in the Tasks table + abstract model tiers. (#55) *(@matgren)*
- ✨ `om-brainstorm` — the divergent conversation that routes into the pipeline. (#58) *(@matgren)*
- ✨ Address reviewer comments already posted on the PR. (#66) *(@pkarw)*
- ✨ `om-ux-shape`, `om-ux-setup`, `om-ux-review-pr` — the UX judgment layer. (#57) *(@zielivia)*
- ✨ Add `om-pr-autopilot` PR dispatcher skill. (#65) *(@wojciechszyjka)*
- ✨ Adopt PRs that were never planned instead of giving up on them. (#69) *(@pkarw)*
- ✨ `om-pipeline-retro`: classify finished runs and rank what second passes cost. (#68) *(@matgren)*
- ✨ Test-env credentials become references — password values never enter the agent's context. (#81) *(@matgren)*

## 🐛 Fixes
- 🐛 Consolidate label rationale into one comment, strengthen PR body placeholders (fixes #44). (#45) *(@pkarw)*
- 🐛 Deduplicate chained review passes. (#48) *(@pkarw)*
- 🔧 Mutate GitHub labels, assignees, and bodies through REST. (#67) *(@pkarw)*
- 🔧 Report before CI, label the watch phase with `ci-monitoring`, bound the wait. (#73) *(@pkarw)*
- 🔧 Clear the Critical/High skills.sh audit findings without changing skill behavior. (#76) *(@matgren)*
- 🐛 Make close-keyword matching configurable (fixes #75). (#79) *(@pkarw)*

## 🛠️ Improvements
- 🛠️ Simplify algorithms — remove redundant reads and a dead branch (behavior-preserving). (#51) *(@pkarw)*
- 🛠️ Chore/simplify algorithms. (#53) *(@pkarw)*
- 🛠️ Keep the pinned agent-browser at the latest stable release. (#78) *(@matgren)*

## 📝 Specs & Documentation
- 📝 Explain how to update installed skills. (#42) *(@pkarw)*
- 📝 Codify skill authoring standards in AGENTS.md & CODE_REVIEW.md. (#61) *(@pkarw)*
- 📝 Credit the author, not the merger. (#74) *(@patzick)*
- 📝 Canonical Security boundaries section for every skill with a non-clean audit rating. (#77) *(@matgren)*
- 📝 Split safe no-op review detection from comment budgeting. (#80) *(@wojciechszyjka)*

## 👥 Contributors

- @pkarw
- @matgren
- @zielivia
- @wojciechszyjka
- @patzick

---

# 1.0.0 (2026-07-21)

## Highlights
<!-- TODO: Highlights — auto-update-changelog leaves this blank for the human author to fill in. -->

## ✨ Features
- ✨ V1 seed — 15-skill PR pipeline. (#1) *(@matgren)*
- ✨ Maintainer feedback round — AGENTS.md drop-in, tracker seam, SDLC.md, per-skill overrides. (#2) *(@matgren)*
- ✨ Local dev installer + README polish with logo and emojis. (#3) *(@pkarw)*
- ✨ `om-*` naming, `om-auto-fix-github` orchestrator, repo-local skill overrides, tracker provider layer. (#4) *(@pkarw)*
- ✨ Tracker provider layer + `om-spec-writing` & `om-integration-tests`. (#5) *(@pkarw)*
- ✨ `om-auto-update-changelog` release-notes skill (supersedes #6). (#8) *(@pkarw)*
- ✨ `om-stabilize-ci` — drive a PR or branch to green CI, with CI-run tracker ops. (#9) *(@pkarw)*
- ✨ `om-prepare-issue`, loop skills, specs config, generated project docs (supersedes #10, #11). (#12) *(@pkarw)*
- ✨ `om-prepare-test-env` + agnostic, tracker-optional `om-auto-verify-pr-ui`. (#13) *(@pkarw)*
- ✨ Tracker-agnostic screenshot evidence (attach-image-evidence). (#14) *(@pkarw)*
- ✨ Self-configure pipeline on first use instead of stopping. (#15) *(@pkarw)*
- ✨ UPGRADE_NOTES.md and `om-apply-upgrade-notes` — migrate repo-installed artifacts after skill upgrades. (#16) *(@pkarw)*
- ✨ Compile-once test env + audit hardening across all skills. (#17) *(@pkarw)*
- ✨ `om-create-skill` — meta-skill for authoring and splitting OM skills. (#20) *(@adeptofvoltron)*
- ✨ Agent-browser provider support. (#23) *(@pkarw)*
- ✨ `om-app-spec-writing` — business-level App Spec skill, one level above `om-spec-writing`. (#24) *(@matgren)*
- ✨ `om-gap-analysis` — grounded platform gap analysis with executable gates. (#25) *(@matgren)*
- ✨ Issue/PR pipeline suite — implement-issue, manage-issues, fix-pr, prepare-issue enrichments. (#27) *(@pkarw)*
- ✨ Autonomous-by-default Open Questions + PR-management alignment + issue implementation-prep. (#28) *(@pkarw)*
- ✨ Verify UI + attach screenshots at the end of `om-auto-implement-issue` runs. (#29) *(@pkarw)*
- ✨ Skills consolidation, standard step files, per-model optimization groundwork. (#34) *(@pkarw)*
- ✨ Skill cards and loop-engine selection. (#35) *(@pkarw)*
- ✨ Always-a-PR progress visibility + verification comments with evidence. (#37) *(@pkarw)*

## 🐛 Fixes
- 🐛 Make `om-prepare-test-env` examples and paths cross-platform (WSL2/PowerShell). (#18) *(@pkarw)*
- 🐛 Communication rules — backticked skill names, always-a-PR progress visibility, verification comments with evidence. (#36) *(@pkarw)*
- 🔧 Hand off chain locks between skills; run UI QA on bug-route fixes (fixes #39). (#40) *(@pkarw)*

## 🛠️ Improvements
- 🛠️ Split large SKILL.md files into references/ (layered loading). (#19) *(@adeptofvoltron)*
- 🛠️ Move `om-gap-analysis` + `om-app-spec-writing` to open-mercato/open-mercato. (#30) *(@pkarw)*

## 📝 Specs & Documentation
- 📝 Add YouTube video link above the Local development section. (#21) *(@pkarw)*
- 📝 Add "See how it works!" section title above the video. (#22) *(@pkarw)*
- 📝 Human-friendly chaining markers — `PR:`/`Issue:`/`Spec:` report lines. (#38) *(@pkarw)*

## 👥 Contributors

- @matgren
- @pkarw
- @adeptofvoltron
