#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

// set_pipeline_label must remove every competing pipeline label in each shell the
// descriptor may run under. zsh does not word-split an unquoted parameter expansion,
// so a `for label in $PIPELINE_LABELS` loop ran once there and removed nothing.
const setPipelineLabel = github.match(/^set_pipeline_label\(\) \{\n[\s\S]*?^\}$/m)?.[0];
assert.ok(setPipelineLabel, "github: set_pipeline_label definition not found");
const pipelineHarness = `
remove_label() { echo "remove $1"; }
apply_label() { echo "apply $1"; }
LABELS_ENABLED=true
PIPELINE_LABELS="review changes-requested qa qa-failed merge-queue blocked do-not-merge"
${setPipelineLabel}
set_pipeline_label 1 merge-queue
`;
const shells = ["/bin/sh", "/bin/bash", "/bin/zsh"].filter((shell) => existsSync(shell));
for (const shell of shells) {
  const lines = execFileSync(shell, ["-c", pipelineHarness], { encoding: "utf8" }).trim().split("\n");
  assert.deepEqual(
    lines,
    [
      "remove review",
      "remove changes-requested",
      "remove qa",
      "remove qa-failed",
      "remove blocked",
      "remove do-not-merge",
      "apply merge-queue",
    ],
    `github: set_pipeline_label under ${shell} must remove every competing pipeline label`,
  );
}

console.log(`Tracker provider contract OK (${githubOperations.length} operations, 2 split providers).`);
