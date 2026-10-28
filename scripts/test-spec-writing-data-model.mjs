#!/usr/bin/env node

// Cross-file contract tests for om-spec-writing data-model graph generation.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

const specWriting = read("skills/om-spec-writing/SKILL.md");
const specSetup = read("skills/om-spec-writing/references/agentic-setup.md");
const graph = read("skills/om-spec-writing/references/data-model-graph.md");
const pipelineSetup = read("skills/om-setup-agent-pipeline/SKILL.md");
const pipelineLoader = read("skills/om-setup-agent-pipeline/references/agentic-setup.md");
const readme = read("README.md");
const skillDoc = read("docs/skills/om-spec-writing.md");

assert.match(specWriting, /--data-model-graph` \/ `--no-data-model-graph/);
assert.match(specWriting, /references\/data-model-graph\.md/);
assert.match(specSetup, /paths\.dataModel` \(default `\.ai\/data-model`\)/);
assert.match(specSetup, /repository-relative path matching `\^\[A-Za-z0-9\._\/\-\]\+\$` with no `\.\.` segment/);

for (const [name, text] of [
  ["pipeline schema", pipelineSetup],
  ["README config example", readme],
]) {
  assert.match(text, /"dataModel": "\.ai\/data-model"/, `${name}: paths.dataModel default`);
}
assert.match(pipelineSetup, /`paths\.dataModel` — interactive data-model HTML views/);
assert.match(
  pipelineLoader,
  /DATA_MODEL_DIR=\$\(jq -r '\.paths\.dataModel \/\/ "\.ai\/data-model"' "\$CONFIG"\)/,
);

assert.match(graph, /safe node ids \(`entity_1`, `entity_2`, …\)/);
assert.match(graph, /DOM APIs and `textContent`/);
assert.match(graph, /never place source text in `innerHTML`/);
assert.match(graph, /escape `<` as `\\u003c`/);
assert.match(graph, /skip under `--autonomous`/);
assert.match(graph, /create the directory when needed/);

assert.match(skillDoc, /--data-model-graph` \/ `--no-data-model-graph/);
assert.match(skillDoc, /`paths\.dataModel` \(default `\.ai\/data-model`\)/);

console.log("Spec-writing data-model graph contract OK.");
