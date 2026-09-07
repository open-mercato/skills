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

console.log("Discovery contract OK (SDLC rendering, protected tables, readiness comments, registration).");
