#!/usr/bin/env node

// Contract test for the spec Delta and living capability specs.
//
// `om-spec-writing` writes a `## 📝 Delta` section (ADDED / MODIFIED / REMOVED
// requirements with WHEN/THEN scenarios and `Frozen by:` characterization
// tests). `om-auto-implement-spec` archives it into
// `<paths.specs>/capabilities/<slug>.md` on the implementation PR. The two skills
// install standalone, so each carries its own copy of the capability file shape.
// This test freezes the cross-file contract: the formats, the copies staying
// identical, the heading shift between them, and the spec-resolution exclusion
// that keeps capability files from being picked up as change specs.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

const specSkill = read("skills/om-spec-writing/SKILL.md");
const deltaFormat = read("skills/om-spec-writing/references/delta-format.md");
const implSkill = read("skills/om-auto-implement-spec/SKILL.md");
const deltaArchive = read("skills/om-auto-implement-spec/references/delta-archive.md");
const compat = read("BACKWARD_COMPATIBILITY.md");

// A section runs from its heading to the next heading of the same or higher
// level outside a code fence (templates inside fences carry their own `##`).
const section = (text, heading) => {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith(heading));
  assert.ok(start >= 0, `section not found: ${heading}`);
  const depth = heading.match(/^#+/)[0].length;
  let inFence = false;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("```")) inFence = !inFence;
    const m = !inFence && lines[i].match(/^(#+) /);
    if (m && m[1].length <= depth) { end = i; break; }
  }
  return lines.slice(start, end).join("\n");
};
const fence = (text, label) => {
  const blocks = [...text.matchAll(/```markdown\n([\s\S]*?)```/g)].map((m) => m[1]);
  assert.ok(blocks.length > 0, `${label}: no markdown block`);
  return blocks;
};

// --- om-spec-writing: the template carries the Delta, routed to its reference --
const template = fence(section(specSkill, "### 1. New specification"), "spec template")[0];
const order = ["## 📝 Proposed Solution", "## 📝 Delta", "## 📝 Architecture"].map((h) => template.indexOf(h));
assert.ok(order.every((i) => i >= 0), "spec template: Proposed Solution, Delta, Architecture must all exist");
assert.ok(order[0] < order[1] && order[1] < order[2], "spec template: Delta sits between Proposed Solution and Architecture");
assert.match(specSkill, /callers locate \([^)]*`Delta`/, "om-spec-writing: Delta must be a preserved section name");
assert.match(specSkill, /references\/delta-format\.md/, "om-spec-writing: body must route to references/delta-format.md");
assert.match(specSkill, /\*\*Delta integrity\*\*/, "om-spec-writing: review heuristics must check Delta integrity");

// --- delta-format.md: the entry shapes and the freeze-before-change rule ------
const deltaBlock = fence(section(deltaFormat, "## Delta section shape"), "delta shape")[0];
for (const heading of [
  /^### Capability: \{capability-slug\}$/m,
  /^#### ADDED Requirement: /m,
  /^#### MODIFIED Requirement: /m,
  /^#### REMOVED Requirement: /m,
  /^##### Scenario: /m,
  /^- WHEN /m,
  /^- THEN /m,
]) assert.match(deltaBlock, heading, `delta shape: missing ${heading}`);
assert.equal(
  (deltaBlock.match(/^Frozen by: /gm) || []).length,
  2,
  "delta shape: MODIFIED and REMOVED each carry exactly one Frozen by: line",
);
const freeze = section(deltaFormat, "## Characterization test");
assert.match(freeze, /\*\*Characterize\*\*[^\n]*green\s+on\s+the unchanged code/, "characterization: test must run green before the change");
assert.match(freeze, /Frozen by: none — /, "characterization: the no-test escape hatch must be documented");

// --- the capability file shape is one contract held in two copies -------------
const shapeOf = (text, label) => fence(section(text, "## Capability file shape"), label)[0];
const writerShape = shapeOf(deltaFormat, "om-spec-writing capability shape");
const archiveShape = shapeOf(deltaArchive, "om-auto-implement-spec capability shape");
assert.equal(archiveShape, writerShape, "capability file shape: both skill copies must stay identical");
assert.match(writerShape, /^# Capability: /m);
assert.match(writerShape, /^Source: \{spec path\}$/m, "capability shape: sections end with Source:");

// The archive copies Delta entries into capability files by shifting headings up
// two levels; freeze that the shift lands exactly on the capability headings.
const level = (text, re) => {
  const m = text.match(re);
  assert.ok(m, `heading not found: ${re}`);
  return m[1].length;
};
assert.equal(level(deltaBlock, /^(#+) ADDED Requirement: /m) - 2, level(writerShape, /^(#+) Requirement: /m), "requirement heading shift");
assert.equal(level(deltaBlock, /^(#+) Scenario: /m) - 2, level(writerShape, /^(#+) Scenario: /m), "scenario heading shift");
assert.match(deltaArchive, /`#### … Requirement:` → `## Requirement:`/, "delta-archive: documents the heading shift");

// --- om-auto-implement-spec: brief addition, merge rules, finish check ---------
assert.equal(
  (implSkill.match(/references\/delta-archive\.md/g) || []).length,
  2,
  "om-auto-implement-spec: steps 2 and 4 both route to references/delta-archive.md",
);
const rules = section(deltaArchive, "## Merge rules");
for (const rule of ["**File missing**", "**ADDED**", "**MODIFIED**", "**REMOVED**", "Never edit the spec file"]) {
  assert.ok(rules.includes(rule), `delta-archive merge rules: missing ${rule}`);
}
assert.match(rules, /\*\*ADDED\*\*[^\n]*\n[^\n]*do not overwrite/, "ADDED over an existing requirement must not overwrite");
assert.match(section(deltaArchive, "## Engine brief addition"), /characterization test/, "brief addition must carry the freeze rule");
assert.match(deltaArchive, /🤖 `om-auto-implement-spec` — 📝 delta archive/, "finish check: stable comment marker");

// --- every spec-resolution copy keeps capability files out of name matching ----
for (const skill of ["om-auto-implement-spec", "om-auto-fix-issue", "om-pre-implement-spec"]) {
  const resolution = read(`skills/${skill}/references/spec-resolution.md`);
  assert.match(
    resolution,
    /Files under `\$SPECS_DIR\/capabilities\/` are living capability specs[^\n]*exclude them from this match\./,
    `${skill}: spec-resolution must exclude capability files`,
  );
}

// --- the format is a declared compatibility surface ---------------------------
assert.match(compat, /Spec `## 📝 Delta` section and capability specs/, "BACKWARD_COMPATIBILITY.md must list the Delta format");

console.log("PASS: spec Delta template, freeze-before-change rule, capability shape copies, heading shift, archive rules, resolution exclusion");
