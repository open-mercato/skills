#!/usr/bin/env node

// Cross-file contract tests for om-discover and the Definition of Ready.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
for (const [section, required] of [
  ["Business rules", ["Id", "Rule", "Applies to", "Source", "Owner", "Status", "Review by", "Required path to change"]],
  ["Non-goals", ["Id", "We are not building", "Why", "Owner", "Status", "Review by", "Required path to change"]],
  ["Decisions", ["Id", "Date", "Decision", "Why", "Owner", "Status", "Review by", "Required path to change"]],
]) {
  const body = briefTemplate.split(`## ${section}\n`)[1]?.split("\n## ")[0];
  assert.ok(body, `${section}: protected section exists`);
  const header = body.split("\n").find((line) => line.startsWith("| Id |"));
  assert.ok(header, `${section}: protected table exists`);
  const fields = header.split("|").slice(1, -1).map((field) => field.trim());
  assert.equal(new Set(fields).size, fields.length, `${section}: no duplicate fields`);
  for (const field of required) {
    assert.ok(fields.includes(field), `${section}: preserves ${field}`);
  }
}

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
for (const marker of ["Product brief:", "Coverage:", "Collection plan:", "Next:"]) {
  assert.ok(reportTemplates.split("\n").some((line) => line.startsWith(`${marker} `)),
    `discovery report preserves undecorated ${marker}`);
}
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
// Rows and bullets behind the flag carry the inline marker: a comment line inside
// a GFM table would break it.
assert.ok((sdlcTemplate.match(/<!-- discovery --> \|$/gm) ?? []).length >= 2, "discovery rows carry the inline marker");
assert.match(sdlcTemplate, /\*\*Product owner\*\* — .* <!-- discovery -->$/m);
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



// Exercise the documented conditional rendering contract. The independently
// merged Designer/QA rows must not duplicate or contradict discovery roles.
function renderSdlc(template, values) {
  const active = [{ enabled: true, wrapped: false }];
  const output = [];
  const lines = template.replace(/^<!--\n[\s\S]*?^-->\n/m, "").split("\n");
  for (const [index, line] of lines.entries()) {
    const condition = line.match(/^<!-- IF (NOT )?([a-zA-Z.]+) -->$/);
    if (condition) {
      const enabled = Boolean(values[condition[2]]);
      const keep = active.at(-1).enabled && (condition[1] ? !enabled : enabled);
      const firstContent = lines.slice(index + 1).find((next) => next.trim());
      const wrapped = keep && condition[2] === "discovery" && !condition[1]
        && !/^(\| |-[ ])/.test(firstContent);
      active.push({ enabled: keep, wrapped });
      if (wrapped) output.push("<!-- discovery:start -->");
    } else if (line === "<!-- END IF -->") {
      assert.ok(active.length > 1, "unexpected conditional end");
      if (active.pop().wrapped) output.push("<!-- discovery:end -->");
    } else if (active.at(-1).enabled) {
      output.push(line);
    }
  }
  assert.equal(active.length, 1, "unclosed conditional");
  return output.join("\n");
}

for (const discovery of [false, true]) {
  for (const designer of [false, true]) {
    for (const qaGate of [false, true]) {
      const rendered = renderSdlc(sdlcTemplate, {
        discovery,
        "discovery.roles.designer": designer,
        "discovery.roles.domainExpert": true,
        "labels.enabled": true,
        qaGate,
      });
      assert.equal((rendered.match(/^- \*\*Designer\*\*/gm) ?? []).length, 1,
        `one Designer role: discovery=${discovery}, designer=${designer}`);
      const designerLine = rendered.split("\n").find((line) => line.startsWith("- **Designer**"));
      assert.doesNotMatch(designerLine, /discovery -->/, "delivery Designer stays outside discovery ownership");
      assert.equal((rendered.match(/^- \*\*Discovery design\*\*/gm) ?? []).length,
        Number(discovery && designer), "optional discovery responsibility");
      assert.equal((rendered.match(/^\| Discovery \|/gm) ?? []).length, 1);
      assert.equal((rendered.match(/^\| Intake \|/gm) ?? []).length, 1);
      assert.equal(rendered.includes("## Definition of Ready"), discovery);
      assert.equal(rendered.includes("## Product decisions as a protected contract"), discovery);
      assert.equal((rendered.match(/^\| QA \|/gm) ?? []).length, Number(qaGate));
      if (qaGate) {
        const qaRow = rendered.split("\n").find((line) => line.startsWith("| QA |"));
        assert.match(qaRow, /permitted self-QA exception/);
        assert.match(rendered, /No self-QA on `risk-high`/);
      }
      if (discovery) {
        const delivery = renderSdlc(sdlcTemplate, { qaGate, "labels.enabled": true });
        const restoredRows = delivery.split("\n").filter((line) =>
          /^\| (Discovery|Intake) \|/.test(line));
        const withoutLayer = rendered
          .replace(/<!-- discovery:start -->[\s\S]*?<!-- discovery:end -->/g, "")
          .split("\n").flatMap((line) => {
            if (/^\| Discovery \|/.test(line)) return restoredRows;
            return line.includes("<!-- discovery -->") ? [] : [line];
          }).join("\n");
        assert.equal((withoutLayer.match(/^\| Discovery \|/gm) ?? []).length, 1);
        assert.equal((withoutLayer.match(/^\| Intake \|/gm) ?? []).length, 1);
        assert.equal((withoutLayer.match(/^- \*\*Designer\*\*/gm) ?? []).length, 1);
        assert.doesNotMatch(withoutLayer, /\*\*Discovery design\*\*|## Definition of Ready/);
      }
    }
  }
}

const handoff = read("skills/om-discover/references/prototype-handoff.md");
const orderedStages = ["## 1. First synthetic panel", "## 2. Neutral clickable prototype",
  "## 3. Walk the prototype, optionally", "## 4. Refresh once", "## 5. Readiness and backlog"];
let previousStage = -1;
for (const stage of orderedStages) {
  const index = handoff.indexOf(stage);
  assert.ok(index > previousStage, `handoff order: ${stage}`);
  previousStage = index;
}
assert.match(discover, /references\/prototype-handoff\.md/);
assert.match(handoff, /On refusal/);
assert.match(handoff, /skip the prototype offer/);
assert.match(handoff, /never at the panel or prototype offer/);
assert.match(handoff, /does not satisfy the ticket-level Definition of Ready/);
assert.match(handoff, /No child `Next:` is executed or forwarded automatically/);
assert.match(handoff, /backlog dry run does not authorize issue filing/);

const prototypeRoot = "skills/om-mockup-prototype";
assert.equal(existsSync(join(root, "skills/om-ux-style")), false);
const prototype = read(`${prototypeRoot}/SKILL.md`);
const prototypeSetup = read(`${prototypeRoot}/references/agentic-setup.md`);
const prototypeReport = read(`${prototypeRoot}/references/report-templates.md`);
const setup = read("skills/om-setup-agent-pipeline/SKILL.md");
const setupLoader = read("skills/om-setup-agent-pipeline/references/agentic-setup.md");
const prototypeDocs = read("docs/skills/om-mockup-prototype.md");
// Static failures cannot be mislabeled as merely missing browser access.
for (const [name, content] of [
  ["skill", prototype],
  ["manifest", read(`${prototypeRoot}/references/prototype-format.md`)],
  ["quality gate", read(`${prototypeRoot}/references/quality-gate.md`)],
  ["report", prototypeReport],
]) {
  assert.match(content, /unresolved\s+static\s+failure/i, `${name}: static failure status`);
  assert.match(content, /static review passed|static review passes/, `${name}: not-run prerequisite`);
}

assert.match(prototype, /^name: om-mockup-prototype$/m);
assert.match(roster, /\bom-mockup-prototype\b/);
assert.doesNotMatch(roster, /\bom-ux-style\b/);
assert.match(readme, /docs\/skills\/om-mockup-prototype\.md/);
assert.match(skillDocs, /\[om-mockup-prototype\]\(om-mockup-prototype\.md\)/);
for (const marker of ["Prototype:", "Prototype context:", "Verification:", "Next:"]) {
  assert.ok(prototype.includes(marker), `skill publishes ${marker}`);
  assert.ok(prototypeReport.includes(marker), `report preserves ${marker}`);
  assert.ok(prototypeDocs.includes(marker), `card documents ${marker}`);
}
for (const [name, content] of [["setup schema", setup], ["setup loader", setupLoader],
  ["prototype setup", prototypeSetup]]) {
  assert.match(content, /\.ai\/prototypes/, `${name}: fallback path`);
}
assert.match(setup, /do not add a setup question/);
assert.doesNotMatch(read("skills/om-setup-agent-pipeline/references/interview-questions.md"),
  /paths\.prototypes|designTokens/, "prototype settings add no setup questions");
assert.doesNotMatch(read("skills/om-ux-setup/SKILL.md"), /\bom-ux-style\b/);
assert.doesNotMatch(read("skills/om-auto-qa-pr/SKILL.md"), /\bom-ux-style\b/);

// The four new skills must use the same #110 reporting rules as released skills.
const canonical = read("skills/om-auto-create-pr/references/rules.md");
const reportingNames = ["Reporting style", "One explanation, updates elsewhere", "Decision evidence",
  "Useful detail only", "Length follows the decision", "Template contract"];
const reportingRules = canonical.split("\n").filter((line) =>
  reportingNames.some((name) => line.startsWith(`- **${name}.**`)));
assert.equal(reportingRules.length, 6, "all six canonical reporting rules found");
for (const skill of ["om-backlog", "om-synthetic-users", "om-mockup-prototype", "om-setup-discovery-pipeline"]) {
  const rules = read(`skills/${skill}/references/rules.md`);
  for (const rule of reportingRules) {
    assert.ok(rules.includes(rule), `${skill}: current reporting contract`);
  }
}

const sessionArtifacts = read("skills/om-synthetic-users/references/session-artifacts.md");
const synthetic = read("skills/om-synthetic-users/SKILL.md");
const syntheticReport = read("skills/om-synthetic-users/references/report-templates.md");
assert.match(synthetic, /before any artifact or subagent work, reserve a new session directory/);
assert.match(sessionArtifacts, /session-\{NNN\}/);
assert.match(sessionArtifacts, /create the directory exclusively/);
assert.match(sessionArtifacts, /Never\s+reuse an existing session directory/);
assert.match(sessionArtifacts, /On the same day and flow they get different session numbers/);
assert.match(sessionArtifacts, /immutable snapshot of every panel used/);
assert.match(syntheticReport, /\$\{session\}\/report\.md/);
assert.match(read("skills/om-synthetic-users/references/interview-script.md"),
  /\$\{session\}\/transcripts\/run-/);
assert.match(read("skills/om-spec-writing/SKILL.md"), /nested session directories and older flat reports/);
assert.match(discoverySections, /Never adopt it into discovery markers or remove it/);
assert.match(discoverySections, /Restore their exact pre-install text/);
assert.match(discoverySections, /Otherwise render the `IF NOT discovery`/);
assert.match(read("skills/om-setup-discovery-pipeline/references/report-templates.md"),
  /first restore the\s+delivery-only Discovery and Intake rows, then remove/);

// An unbranded prototype can carry accepted behavior without a visual contract.
// Review guidance must not globally disable that product-evidence source.
const uxEvidence = read("skills/om-ux-review-pr/references/evidence-tiers.md");
const uxReport = read("skills/om-ux-review-pr/references/report-templates.md");
assert.match(uxEvidence, /Confirmed brief\/spec\/prototype decisions can still support/);
assert.match(uxEvidence, /does not establish visual fidelity requirements/);
assert.match(uxReport, /neutral styling and unconfirmed assumptions do not qualify/);
assert.doesNotMatch(uxEvidence, /Without a design contract, tier 1 is unavailable/);
assert.doesNotMatch(uxReport, /no \[PRODUCT\] claims|no `\[PRODUCT\]`\s+findings/);
assert.doesNotMatch(read("skills/om-ux-review-pr/references/agentic-setup.md"),
  /judge on tiers 2 to 6 only/);

console.log("Discovery contract OK (conditional SDLC matrix, protected tables, readiness, low-fi handoff, outputs and reporting).");
