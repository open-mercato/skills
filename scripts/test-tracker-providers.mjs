#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

const trackerDir = "skills/om-setup-agent-pipeline/references/trackers";
const github = read(`${trackerDir}/github.md`);
const linear = read(`${trackerDir}/linear.md`);
const jira = read(`${trackerDir}/jira.md`);
const setup = read("skills/om-setup-agent-pipeline/SKILL.md");
const upgradeNotes = read("UPGRADE_NOTES.md");

const operationHeadings = (descriptor) =>
  [...descriptor.matchAll(/^#### (.+)$/gm)].map((match) => match[1]).sort();

const githubOperations = operationHeadings(github);
for (const [name, descriptor] of [["linear", linear], ["jira", jira]]) {
  assert.deepEqual(
    operationHeadings(descriptor),
    githubOperations,
    `${name}: shipped split provider must implement or delegate every GitHub tracker operation`,
  );
  assert.match(
    descriptor,
    /companion `?\.ai\/trackers\/github\.md`?/,
    `${name}: split provider must name its GitHub companion`,
  );
}

assert.match(setup, /`github`, `linear`, `jira`, or custom/);
assert.match(setup, /`linear` and `jira` require `\.ai\/trackers\/github\.md`/);

assert.match(linear, /requires `linear` 2\.4\.0 or newer/);
for (const requiredSurface of [
  "--no-interactive",
  "--add-label",
  "--remove-label",
  "--unassign",
  "--body-file",
  "--paginate",
]) {
  assert.match(
    linear,
    new RegExp(`grep -Fq -- '${requiredSurface}'`),
    `linear: auth-check must probe ${requiredSurface}`,
  );
}
assert.match(linear, /LINEAR_TEAM_ID/);
assert.doesNotMatch(linear, /\bLINEAR_TEAM\b/);
assert.doesNotMatch(upgradeNotes, /\bLINEAR_TEAM\b/);
assert.match(linear, /sed -n 's\/\^User:\[\[:space:\]\]\*\/\/p'/);
assert.doesNotMatch(linear, /Email:\[\[:space:\]\]/);
assert.match(linear, /Could not resolve the Linear automation user" >&2; exit 1/);

assert.match(jira, /requires Atlassian CLI 1\.3\.5-stable or newer/);
assert.match(jira, /workitem edit --help \| grep -Fq -- '--remove-labels'/);
assert.match(jira, /workitem comment list --help \| grep -Fq -- '--paginate'/);
assert.match(jira, /workitem comment update --help \| grep -Fq -- '--body-file'/);

console.log(`Tracker provider contract OK (${githubOperations.length} operations, 2 split providers).`);
