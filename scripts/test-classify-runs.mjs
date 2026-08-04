#!/usr/bin/env node

// Contract test for the om-pipeline-retro classifier, the collection's first
// shipped executable. It is pure stdin -> stdout, so it can be tested directly:
// feed a JSON array of pull requests, assert the classification that comes back.
// Every case here is a rule from the script's own comment header, so the inline
// fallback an agent applies when it cannot spawn a shell stays honest too.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const script = join(root, "skills/om-pipeline-retro/references/classify-runs.sh");

const classify = (prs, args = []) => {
  const out = execFileSync("sh", [script, ...args], {
    input: JSON.stringify(prs),
    encoding: "utf8",
  });
  return JSON.parse(out);
};

const failsWith = (input, args = []) => {
  try {
    execFileSync("sh", [script, ...args], { input, encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    return error.status;
  }
  return 0;
};

const opener = (skill, at) => ({
  createdAt: at,
  body: `🤖 \`${skill}\` started by @bot at ${at}.`,
});

// The claim boilerplate names the skill twice on one line: once in the marker
// prefix the cross-skill contract mandates, once in "starting `<skill>` run".
const doubleNamingOpener = (skill, at) => ({
  createdAt: at,
  body: `🤖 \`${skill}\` — Claiming this PR — starting \`${skill}\` run. Started: ${at}.`,
});

const merged = (number, comments, extra = {}) => ({
  number,
  state: "MERGED",
  createdAt: "2026-08-01T10:00:00Z",
  mergedAt: "2026-08-01T12:00:00Z",
  additions: 50,
  labels: [],
  reviews: [],
  comments,
  ...extra,
});

// --- rule 1: one opener line opens one run per skill, however often it names it.
// Regression: counting occurrences reported a single clean run as a second pass,
// inflating the "unexplained second pass" figure the skill exists to measure.
{
  const once = classify([merged(1, [opener("om-auto-review-pr", "2026-08-01T10:05:00Z")])]);
  assert.equal(once.pullRequests[0].runs["om-auto-review-pr"], 1, "single naming counts one run");
  assert.equal(once.pullRequests[0].class, "clean");

  const twice = classify([merged(2, [doubleNamingOpener("om-auto-review-pr", "2026-08-01T10:05:00Z")])]);
  assert.equal(twice.pullRequests[0].runs["om-auto-review-pr"], 1, "double naming still counts one run");
  assert.deepEqual(twice.pullRequests[0].signals, [], "one run raises no second-pass signal");
  assert.equal(twice.pullRequests[0].class, "clean");
}

// Two genuine opener lines are still two runs — the dedup is per line, not global.
{
  const result = classify([
    merged(3, [
      opener("om-auto-review-pr", "2026-08-01T10:05:00Z"),
      opener("om-auto-review-pr", "2026-08-01T11:05:00Z"),
    ], { reviews: [{ state: "CHANGES_REQUESTED", body: "needs work" }] }),
  ]);
  assert.equal(result.pullRequests[0].runs["om-auto-review-pr"], 2);
  assert.deepEqual(result.pullRequests[0].signals, ["second review round"]);
  assert.equal(result.pullRequests[0].class, "hard recovery");
  assert.deepEqual(result.pullRequests[0].causes, ["change requested by a reviewer"]);
}

// --- rule 2: only agent-authored, unquoted text is evidence.
{
  const result = classify([
    merged(4, [{ createdAt: "2026-08-01T10:05:00Z", body: "> 🤖 `om-auto-review-pr` started by @bot" }]),
  ]);
  assert.equal(result.prsWithRunMarkers, 0, "a human quoting a bot starts no run");
}

// --- rule 3/4: a request closed without merging is a finished run, and a hard
// recovery, priced to closedAt rather than left at zero.
{
  const result = classify([
    {
      number: 5,
      state: "CLOSED",
      createdAt: "2026-08-01T10:00:00Z",
      closedAt: "2026-08-03T10:00:00Z",
      additions: 300,
      labels: [],
      reviews: [],
      comments: [opener("om-auto-review-pr", "2026-08-01T10:05:00Z")],
    },
  ]);
  assert.equal(result.pullRequests[0].class, "hard recovery");
  assert.deepEqual(result.pullRequests[0].signals, ["closed unmerged"]);
  assert.equal(result.pullRequests[0].hoursToMerge, 48);
}

// --- rule 5: the loop engines post checkpoints by design, which is not rework.
{
  const result = classify([
    merged(6, [opener("om-auto-continue-pr-loop", "2026-08-01T10:05:00Z")]),
  ]);
  assert.equal(result.pullRequests[0].class, "loop checkpoints");
}

// --- rule 6: a second pass with nothing on the record is unexplained, not guessed.
{
  const result = classify([
    merged(7, [opener("om-auto-fix-pr", "2026-08-01T10:05:00Z")]),
  ]);
  assert.equal(result.pullRequests[0].class, "unexplained");
  assert.deepEqual(result.pullRequests[0].causes, []);
  assert.equal(result.summary.declaredOutcomeCoverage.unexplainedSecondPasses, 1);
}

// --- rule 8: an in-progress request is another agent's live run; it is reported
// separately and takes part in no count.
{
  const result = classify([
    {
      number: 8,
      state: "OPEN",
      createdAt: "2026-08-01T10:00:00Z",
      additions: 10,
      labels: [{ name: "in-progress" }],
      reviews: [],
      comments: [opener("om-auto-fix-pr", "2026-08-01T10:05:00Z")],
    },
  ]);
  assert.equal(result.summary.inFlight.count, 1);
  assert.deepEqual(result.summary.inFlight.prs, [8]);
  assert.equal(result.summary.prsWithRunMarkers, 0, "in-flight requests are counted nowhere");
}

// A repo whose taxonomy renames the lock label must still be able to exclude it.
{
  const prs = [
    {
      number: 9,
      state: "OPEN",
      createdAt: "2026-08-01T10:00:00Z",
      labels: [{ name: "wip" }],
      reviews: [],
      comments: [opener("om-auto-fix-pr", "2026-08-01T10:05:00Z")],
    },
  ];
  assert.equal(classify(prs, ["--in-progress-label", "wip"]).summary.inFlight.count, 1);
  assert.equal(classify(prs).summary.inFlight.count, 0, "default label leaves it classified");
}

// --- malformed and missing input degrades rather than aborting.
{
  const result = classify([
    merged(10, [opener("om-auto-review-pr", "2026-08-01T10:05:00Z")], {
      additions: "not-a-number",
      labels: "not-an-array",
      reviews: "not-an-array",
    }),
  ]);
  assert.equal(result.pullRequests[0].additions, null, "a wrong-typed field reads as absent");
  assert.equal(result.pullRequests[0].class, "clean");
}

// No clean request in the window means no baseline: causes rank by count, and
// the hours column is null rather than invented.
{
  const result = classify([
    merged(11, [
      opener("om-auto-review-pr", "2026-08-01T10:05:00Z"),
      opener("om-auto-review-pr", "2026-08-01T11:05:00Z"),
    ]),
  ]);
  assert.equal(result.summary.cleanMedianHoursToMerge, null);
  for (const cause of result.summary.rankedCauses) {
    assert.equal(cause.excessHours, null, "no baseline means no hours figure");
  }
}

// Missing comment timestamps make run counts an upper bound, and the classifier
// has to say so rather than let the report read as exact.
{
  const result = classify([
    merged(12, [{ body: "🤖 `om-auto-review-pr` posted something without a timestamp" }]),
  ]);
  assert.equal(result.summary.timestampCoverage.reliable, false);
  assert.match(result.summary.timestampCoverage.note, /upper bound/);
}

// An empty window reports itself instead of pretending to be a clean result.
assert.equal(classify([]).prsWithRunMarkers, 0);

// --- input and argument validation.
assert.equal(failsWith("{}"), 2, "a non-array document is rejected");
assert.equal(failsWith(""), 2, "empty stdin is rejected");
assert.equal(failsWith("[]", ["--gap-minutes", "abc"]), 2, "gap minutes must be numeric");
assert.equal(failsWith("[]", ["--nope"]), 2, "unknown arguments are rejected");

// The jq program is a single-quoted shell string, so one apostrophe anywhere in
// it — including in a comment — closes the string and breaks the script.
{
  const { readFileSync } = await import("node:fs");
  const lines = readFileSync(script, "utf8").split("\n");
  const start = lines.findIndex((line) => line.includes("| jq --arg"));
  const body = lines.slice(start + 1, lines.length - 2);
  const offender = body.findIndex((line) => line.includes("'"));
  assert.equal(offender, -1, `apostrophe inside the jq program at line ${start + offender + 2}`);
}

console.log("Pipeline-retro classifier OK (8 classification rules, degradation, and arg validation).");
