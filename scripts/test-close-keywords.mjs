#!/usr/bin/env node

// Contract test for the configurable close-keyword vocabulary (issue #75).
//
// `om-close-fixed-issues` used to decide "does this PR close an issue?" from two
// signals that are both English-only: the tracker's `closingIssuesReferences`
// parse and a hard-coded regex. A repository writing `Zamyka #88.` matched
// neither, and the run reported a clean `closed 0` with no warning — the fix is
// the optional `closeKeywords` config key plus a report section for mentions no
// keyword matched. Both halves are cross-file contracts (config schema in
// om-setup-agent-pipeline, consumption in om-close-fixed-issues, the documented
// schema in README), so they are asserted together the way the browser-provider
// contract is.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

const setup = read("skills/om-setup-agent-pipeline/SKILL.md");
const skill = read("skills/om-close-fixed-issues/SKILL.md");
const setupSkill = read("skills/om-close-fixed-issues/references/agentic-setup.md");
const templates = read("skills/om-close-fixed-issues/references/report-templates.md");
const readme = read("README.md");

// --- the config schema declares the key, and it is a list ------------------
// The schema block is what om-setup-agent-pipeline writes into a repository, so
// it must stay valid JSON with closeKeywords present as an array.
const schemaBlock = setup.match(/```json\n([\s\S]*?)```/);
assert.ok(schemaBlock, "om-setup-agent-pipeline: config schema JSON block not found");
const schema = JSON.parse(schemaBlock[1]);
assert.ok(
  Array.isArray(schema.closeKeywords),
  "om-setup-agent-pipeline: config schema must declare closeKeywords as an array",
);
assert.deepEqual(
  schema.closeKeywords,
  [],
  "om-setup-agent-pipeline: closeKeywords must default to empty — English repos keep today's behavior",
);
assert.match(
  setup,
  /^- `closeKeywords` — /m,
  "om-setup-agent-pipeline: closeKeywords needs a field-reference bullet",
);
assert.match(
  readme,
  /"closeKeywords"/,
  "README: the documented config snippet must stay in sync with the schema",
);

// --- the consuming skill actually reads it ---------------------------------
assert.match(
  setupSkill,
  /jq -r '\.closeKeywords/,
  "om-close-fixed-issues: agentic-setup must load closeKeywords from the config",
);
assert.match(
  setupSkill,
  /^- `CLOSE_KEYWORDS`/m,
  "om-close-fixed-issues: CLOSE_KEYWORDS must be a documented run variable",
);
assert.match(
  skill,
  /Fill the run variables \([^)]*`CLOSE_KEYWORDS`[^)]*\)/,
  "om-close-fixed-issues: step 0 must list CLOSE_KEYWORDS among the run variables to fill",
);
assert.match(
  skill,
  /\$CLOSE_KEYWORDS/,
  "om-close-fixed-issues: the extraction step must build its pattern from CLOSE_KEYWORDS",
);

// --- built-ins survive, configured words only extend them ------------------
// The regression the config key must not introduce: a repo that sets
// closeKeywords losing the English matches it already relied on.
for (const keyword of [
  "fix",
  "fixes",
  "fixed",
  "close",
  "closes",
  "closed",
  "resolve",
  "resolves",
  "resolved",
]) {
  assert.ok(
    new RegExp(`\`${keyword}\``).test(skill) || new RegExp(`\\b${keyword}\\b`).test(skill),
    `om-close-fixed-issues: built-in keyword '${keyword}' must remain documented`,
  );
}
assert.match(
  skill,
  /extend\*{0,2} the built-ins; they never replace them/,
  "om-close-fixed-issues: configured keywords must be stated as additive, not a replacement",
);
assert.match(
  setupSkill,
  /never replaces them/,
  "om-close-fixed-issues: agentic-setup must state that closeKeywords extends the built-ins",
);

// --- the hard-coded English-only regex is gone -----------------------------
// This is the assertion that fails on the pre-fix skill: the literal alternation
// was the only vocabulary the fallback had.
assert.doesNotMatch(
  skill,
  /\\b\(fix\|fixes\|fixed\|close\|closes\|closed\|resolve\|resolves\|resolved\)/,
  "om-close-fixed-issues: the hard-coded keyword alternation must not be the sole vocabulary",
);

// --- injection and matching safety -----------------------------------------
// A configured keyword is user input that lands in a regex, so it must be
// escaped, and it must keep the adjacency rule that stops substring matches.
assert.match(
  skill,
  /regex-escaped/,
  "om-close-fixed-issues: configured keywords must be regex-escaped before use",
);
assert.match(
  skill,
  /Do \*\*not\*\* wrap the keyword in `\\b`/,
  "om-close-fixed-issues: must warn that \\b is ASCII-only and breaks non-ASCII keywords",
);
assert.match(
  skill,
  /- Configured `closeKeywords` extend the built-in English list and are matched literally/,
  "om-close-fixed-issues: the escaping and adjacency rule belongs in the Rules section too",
);
// A malformed entry is a config typo, not a reason to abandon the housekeeping run.
assert.match(
  skill,
  /is skipped with a logged warning naming it, rather than failing the run/,
  "om-close-fixed-issues: malformed closeKeywords entries must degrade to a warning",
);
assert.match(
  setupSkill,
  /test\("\\\\s"\) \| not/,
  "om-close-fixed-issues: the loader must drop entries the adjacency rule could never match",
);

// --- the silent-drop diagnostic --------------------------------------------
// Configurability alone still fails the repo that has not configured anything
// yet, which is every repo the day it hits this. The run must say so.
assert.match(
  skill,
  /unmatched mention/i,
  "om-close-fixed-issues: step 3 must record mentions no close keyword matched",
);
assert.match(
  skill,
  /unmatched-mentions U/,
  "om-close-fixed-issues: step 7 counts must include the unmatched-mention total",
);
assert.match(
  templates,
  /^### ⚠️ Issue mentions without a recognized closing keyword$/m,
  "om-close-fixed-issues: report templates need the unmatched-mentions section",
);
assert.match(
  templates,
  /closeKeywords/,
  "om-close-fixed-issues: the unmatched-mentions section must point at the config fix",
);
assert.match(
  skill,
  /Never close or comment on an unmatched mention/,
  "om-close-fixed-issues: unmatched mentions are diagnosis only — never a mutation",
);
// #N is one namespace for issues and PRs. Without resolving each candidate, the
// skill's own `Supersedes #{prNumber}` convention would be reported as a missed
// close link on every run — noise that trains readers to ignore the section.
assert.match(
  skill,
  /keeping only the numbers that resolve to an \*\*open issue\*\*/,
  "om-close-fixed-issues: unmatched mentions must be resolved to open issues before reporting",
);
assert.match(
  skill,
  /Drop every number that resolves to a pull request/,
  "om-close-fixed-issues: PR cross-references must not be reported as missed close links",
);
assert.match(
  templates,
  /Only numbers step 3 resolved to \*\*open issues\*\* appear here/,
  "om-close-fixed-issues: the report template must state the open-issue filter",
);
// Diagnosis is not a mutation, so --dry-run must not suppress it.
assert.match(
  skill,
  /The unmatched-mentions section from step 3 is diagnosis rather than a mutation/,
  "om-close-fixed-issues: --dry-run must still print the unmatched-mentions section",
);

console.log("close-keyword contract OK");
