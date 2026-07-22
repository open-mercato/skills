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
