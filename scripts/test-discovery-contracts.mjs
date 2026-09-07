#!/usr/bin/env node

// Cross-file contract tests for om-discover and the Definition of Ready.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

const discover = read("skills/om-discover/SKILL.md");
const briefTemplate = read("skills/om-discover/references/brief-template.md");
const reportTemplates = read("skills/om-discover/references/report-templates.md");
const sdlcTemplate = read("skills/om-setup-agent-pipeline/references/sdlc-template.md");
const autoFix = read("skills/om-auto-fix-issue/SKILL.md");
const autoFixTriage = read("skills/om-auto-fix-issue/references/fr-triage.md");
const manageIssues = read("skills/om-auto-manage-issues/SKILL.md");
const manageEnrichment = read("skills/om-auto-manage-issues/references/enrich-existing-issue.md");
const roster = read("skills/om-setup-agent-pipeline/references/skill-coverage.md");
const readme = read("README.md");
const skillDocs = read("docs/skills/README.md");
const discoverySetup = read("skills/om-setup-discovery-pipeline/SKILL.md");
const discoverySections = read("skills/om-setup-discovery-pipeline/references/sdlc-sections.md");
const backlog = read("skills/om-backlog/SKILL.md");
const upgradeNotes = read("skills/om-apply-upgrade-notes/SKILL.md");

// The SDLC generator must resolve the configured specs directory just like its
// other config-backed placeholders; a shell variable in rendered prose is a leak.
assert.match(
  sdlcTemplate,
  /Replace \{\{baseBranch\}\}, \{\{tracker\}\}, \{\{specsDir\}\}, and\s+\{\{validationCommands\}\}/,
);
assert.doesNotMatch(sdlcTemplate, /\$\{SPECS_DIR\}/);
assert.equal((sdlcTemplate.match(/\{\{specsDir\}\}/g) ?? []).length, 3);

// Every protected N/R/D entry needs the fields the review gate later enforces.
assert.match(
  briefTemplate,
  /\| Id \| Rule \| Applies to \| Source \| Owner \| Status \| Review by \| Required path to change \|/,
);
assert.match(
  briefTemplate,
  /\| Id \| We are not building \| Why \| Owner \| Status \| Review by \| Required path to change \|/,
);

// Idempotent not-ready comments require both marker lookup and in-place update.
for (const [name, text] of [
  ["om-auto-fix-issue", autoFix],
  ["om-auto-manage-issues", manageIssues],
]) {
  assert.match(text, /\*\*list-issue-comments\*\*/, `${name}: list-issue-comments operation`);
  assert.match(text, /\*\*update-comment\*\*/, `${name}: update-comment operation`);
}
assert.match(autoFixTriage, /\*\*update-comment\*\*/);
assert.match(manageEnrichment, /\*\*update-comment\*\*/);

// Registration and public documentation must move with the new skill.
assert.match(roster, /\bom-discover\b/);
assert.match(readme, /docs\/skills\/om-discover\.md/);
assert.match(skillDocs, /\[om-discover\]\(om-discover\.md\)/);
assert.match(readme, /discover\["om-discover/);
assert.match(readme, /discover.*--> brainstorm/);

// The report uses only the collection's shared glossary, and the write-surface
// description must not contradict the decision-record/template side files.
assert.match(reportTemplates, /🔁 \*\*Next step\.\*\*/);
assert.doesNotMatch(reportTemplates, /🧭/);
assert.doesNotMatch(discover, /leaves exactly one artifact/);

// The product layer is opt-in: its SDLC blocks sit behind `IF discovery`, the
// delivery-only variant of the Intake row exists, and the rendered blocks carry
// the markers om-setup-discovery-pipeline refreshes.
assert.match(sdlcTemplate, /<!-- IF discovery -->/);
assert.match(sdlcTemplate, /<!-- IF NOT discovery -->/);
assert.match(sdlcTemplate, /<!-- IF discovery\.roles\.domainExpert -->/);
assert.match(sdlcTemplate, /<!-- IF discovery\.roles\.designer -->/);
assert.match(sdlcTemplate, /discovery:start/);
assert.equal(
  (sdlcTemplate.match(/<!-- IF /g) ?? []).length,
  (sdlcTemplate.match(/<!-- END IF -->/g) ?? []).length,
  "every IF block is closed",
);
const ifDiscovery = sdlcTemplate.indexOf("<!-- IF discovery -->\n## Definition of Ready");
assert.ok(ifDiscovery > 0, "Definition of Ready is behind IF discovery");
assert.ok(sdlcTemplate.indexOf("## Product decisions as a protected contract") > ifDiscovery);

// No intake skill falls back to a built-in Definition of Ready: without the
// section in SDLC.md there is no readiness check.
for (const [name, text] of [
  ["om-auto-fix-issue triage", autoFixTriage],
  ["om-auto-manage-issues enrichment", manageEnrichment],
  ["om-backlog", backlog],
]) {
  assert.doesNotMatch(text, /two-tier list/, `${name}: no built-in DoR fallback`);
}
assert.match(manageEnrichment, /`READY_STATUS` =\s*`ready` \| `not-ready`[^\n]*`n\/a`/);
assert.match(autoFixTriage, /skip this step, treat the ticket as ready/);

// om-setup-discovery-pipeline: registration, the single template source, markers, and
// the rule that only it pulls in the delivery setup.
assert.match(roster, /\bom-setup-discovery-pipeline\b/);
assert.match(readme, /docs\/skills\/om-setup-discovery-pipeline\.md/);
assert.match(skillDocs, /\[om-setup-discovery-pipeline\]\(om-setup-discovery-pipeline\.md\)/);
assert.match(discoverySetup, /om-setup-agent-pipeline\/references\/sdlc-template\.md/);
assert.match(discoverySetup, /discovery:start/);
assert.match(discoverySetup, /run `om-setup-agent-pipeline` now/);
assert.doesNotMatch(discoverySetup, /\bnpx uxproof\b/);
assert.match(discoverySections, /## Adopting unmarked sections/);
assert.match(upgradeNotes, /om-setup-discovery-pipeline --refresh/);
assert.doesNotMatch(discover, /om-setup-discovery-pipeline/, "om-discover never invokes the setup from its workflow");

console.log("Discovery contract OK (SDLC rendering, protected tables, readiness comments, registration).");
