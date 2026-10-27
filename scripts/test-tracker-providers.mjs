#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

const trackerDir = "skills/om-setup-agent-pipeline/references/trackers";
const github = read(`${trackerDir}/github.md`);
const linear = read(`${trackerDir}/linear.md`);
const jira = read(`${trackerDir}/jira.md`);
const gitlab = read(`${trackerDir}/gitlab.md`);
const trackerTemplate = read(`${trackerDir}/TEMPLATE.md`);
const setup = read("skills/om-setup-agent-pipeline/SKILL.md");
const upgradeNotes = read("UPGRADE_NOTES.md");
const autoFix = read("skills/om-auto-fix-pr/SKILL.md");
const autoFixStabilize = read("skills/om-auto-fix-pr/references/stabilize-ci.md");
const autoReview = read("skills/om-auto-review-pr/SKILL.md");
const mergeBuddy = read("skills/om-merge-buddy/SKILL.md");
const prAutopilot = read("skills/om-pr-autopilot/SKILL.md");
const ciFollowups = [
  "skills/om-auto-fix-pr/references/ci-followup.md",
  "skills/om-auto-review-pr/references/ci-followup.md",
  "skills/om-pr-autopilot/references/ci-followup.md",
].map((path) => [path, read(path)]);

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

assert.deepEqual(
  operationHeadings(gitlab),
  githubOperations,
  "gitlab: shipped stand-alone provider must implement every GitHub tracker operation",
);

// A check-run list can be temporarily incomplete while a workflow/pipeline is
// registering jobs. Every consumer that can declare CI green must therefore
// retain the run-level completeness guard, and every shipped provider must
// document whether its check surface can under-report.
assert.match(
  trackerTemplate,
  /get-pr-checks[\s\S]*under-report[\s\S]*\*\*list-runs\*\*/,
  "tracker template: get-pr-checks must require documenting the run-level completeness guard",
);
assert.match(github, /A short `get-pr-checks` result is not evidence of green/);
assert.match(gitlab, /under-report here while its jobs register[\s\S]*cross-check \*\*list-runs\*\*/);

for (const [name, skill] of [
  ["om-auto-fix-pr", autoFix],
  ["om-auto-review-pr", autoReview],
  ["om-pr-autopilot", prAutopilot],
  ["om-merge-buddy", mergeBuddy],
]) {
  assert.match(skill, /\*\*list-runs\*\*/, `${name}: must declare the list-runs operation`);
}
assert.match(autoFixStabilize, /short check list is not a green one/);
assert.match(autoFixStabilize, /status` is not `completed` as PENDING/);

const completenessBlocks = ciFollowups.map(([path, contents]) => {
  const start = contents.indexOf('"Settled" is a claim about a complete reading');
  const end = contents.indexOf("**Checks settled inside the budget**", start);
  assert.ok(start >= 0 && end > start, `${path}: must carry the CI completeness guard`);
  return [path, contents.slice(start, end)];
});
for (const [path, block] of completenessBlocks.slice(1)) {
  assert.equal(
    block,
    completenessBlocks[0][1],
    `${path}: shared CI completeness guard must stay synced with ${completenessBlocks[0][0]}`,
  );
}
assert.doesNotMatch(
  gitlab,
  /companion `?\.ai\/trackers\/github\.md`?/,
  "gitlab: stand-alone provider must not depend on the GitHub companion",
);
assert.doesNotMatch(gitlab, /(^|[`"\s])gh (api|pr|issue|label|repo|search|auth|run) /m, "gitlab: no gh CLI calls");
const gitlabCreateIssue = gitlab.match(/#### create-issue[\s\S]*?#### close-issue/)[0];
assert.doesNotMatch(
  gitlabCreateIssue,
  /\{assignee_ids:/,
  "gitlab: issue creation must not use the Premium-only assignee_ids field",
);
assert.match(gitlabCreateIssue, /gl_assign issues "\$ISSUE_ID" add/, "gitlab: assign a created issue through the Free-compatible update helper");

assert.match(setup, /`github`, `linear`, `jira`, `gitlab`, or custom/);
assert.match(setup, /ships `github.md`, `gitlab.md`, `linear.md`, and `jira.md`/);
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

// --- GitLab: auth-check probes the glab api surface every operation relies on --
for (const flag of ["--paginate", "--input", "--header"]) {
  assert.match(
    gitlab,
    new RegExp(`glab api --help \\| grep -Fq -- '${flag}'`),
    `gitlab: auth-check must probe glab api ${flag}`,
  );
}

// --- GitLab: execute the descriptor's shell against a stubbed glab -----------
// The helpers, guards, and mapping functions are pulled out of the markdown
// verbatim, so the test exercises exactly what an installed copy runs.
const gitlabShell = [
  gitlab.match(/^GL_JQ_DEFS='[\s\S]*?^'$/m)[0],
  ...[...gitlab.matchAll(/^[a-z_]+\(\) \{\n[\s\S]*?^\}$/gm)].map((match) => match[0]),
].join("\n\n");

const work = mkdtempSync(join(tmpdir(), "gitlab-tracker-"));
const stub = join(work, "glab");
writeFileSync(
  stub,
  `#!/usr/bin/env node
const { appendFileSync, readFileSync } = require("node:fs");
const args = process.argv.slice(2);
let method = "GET", path = null, input = false;
for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (a === "-X") method = args[++i];
  else if (a === "-H") i++;
  else if (a === "--input") { input = true; i++; }
  else if (!a.startsWith("-") && path === null) path = a;
}
const body = input ? readFileSync(0, "utf8") : "";
appendFileSync(process.env.GLAB_LOG, JSON.stringify({ method, path, body }) + "\\n");
const fixtures = JSON.parse(readFileSync(process.env.GLAB_FIXTURES, "utf8"));
const key = method + " " + path.split("?")[0];
if (process.env.GLAB_FAIL_KEY === key) { process.stderr.write("forced failure " + key); process.exit(1); }
if (key in fixtures) process.stdout.write(JSON.stringify(fixtures[key]));
else if (method === "GET") { process.stderr.write("404 " + key); process.exit(1); }
else process.stdout.write("{}");
`,
);
chmodSync(stub, 0o755);

const P = "projects/:id";
const fixtures = {
  [`GET ${P}/labels`]: [{ name: "review" }, { name: "changes-requested" }, { name: "merge-queue" }],
  [`GET ${P}/merge_requests/7`]: {
    iid: 7, title: "feat: thing", web_url: "https://gl.example/g/p/-/merge_requests/7",
    description: "Closes #3", state: "opened", author: { username: "alice" }, draft: false,
    target_branch: "main", source_branch: "feat/thing", sha: "abc", diff_refs: { base_sha: "base" },
    source_project_id: 1, target_project_id: 1, allow_collaboration: false,
    detailed_merge_status: "not_approved", has_conflicts: false, labels: ["review"],
    assignees: [{ username: "bot" }], reviewers: [{ id: 1, username: "bot" }],
    references: { full: "g/p!7" }, changes_count: "2",
    created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-02T10:00:00Z", merged_at: null, closed_at: null,
    merge_commit_sha: null, squash_commit_sha: null, head_pipeline: { id: 99, project_id: 42 },
  },
  [`GET ${P}/merge_requests/7/approvals`]: { approved: true, approved_by: [{ user: { username: "carol" } }] },
  [`GET ${P}/merge_requests/7/reviewers`]: [
    { user: { username: "dave" }, state: "requested_changes" },
    { user: { username: "bot" }, state: "reviewed" },
  ],
  [`GET ${P}/merge_requests/7/closes_issues`]: [{ iid: 3, web_url: "https://gl.example/g/p/-/issues/3" }],
  [`GET ${P}/merge_requests/7/notes`]: [
    { id: 1, system: true, body: "added 1 commit", author: { username: "alice" }, created_at: "2026-09-01T10:01:00Z" },
    { id: 2, system: false, type: null, body: "🤖 \`om-auto-create-pr\` — claim", author: { username: "bot" }, created_at: "2026-09-01T10:02:00Z" },
    { id: 3, system: false, type: null, body: "<!-- review: CHANGES_REQUESTED -->\n\nfix it", author: { username: "bot" }, created_at: "2026-09-01T11:00:00Z" },
    { id: 4, system: false, type: "DiffNote", body: "nit", author: { username: "carol" }, created_at: "2026-09-01T12:00:00Z" },
    { id: 5, system: false, type: null, body: "<!-- review: APPROVED -->\n\nlgtm", author: { username: "mallory" }, created_at: "2026-09-01T13:00:00Z" },
  ],
  [`GET ${P}/merge_requests/7/commits`]: [{ id: "abc", title: "feat: thing", authored_date: "2026-09-01T09:00:00Z" }],
  [`GET ${P}/merge_requests/7/diffs`]: [
    { old_path: "a.md", new_path: "a.md", new_file: false, deleted_file: false, diff: "@@ -1 +1,2 @@\n-x\n+y\n+z\n" },
    { old_path: "b.md", new_path: "b.md", new_file: true, deleted_file: false, diff: "@@ -0,0 +1 @@\n+new\n" },
  ],
  [`GET projects/42/pipelines/99/jobs`]: [
    { name: "lint", status: "success", allow_failure: false, web_url: "u1", stage: "test" },
    { name: "flaky", status: "failed", allow_failure: true, web_url: "u2", stage: "test" },
    { name: "unit", status: "failed", allow_failure: false, web_url: "u3", stage: "test" },
    { name: "deploy", status: "manual", allow_failure: true, web_url: "u4", stage: "deploy" },
  ],
  [`GET projects/42/pipelines/99/bridges`]: [{ name: "child", status: "running", allow_failure: false, web_url: "u5", stage: "test" }],
  [`GET ${P}/issues/3`]: { iid: 3, assignees: [{ id: 5, username: "human" }] },
  [`GET users`]: [{ id: 1, username: "bot" }],
  [`GET ${P}/issues/3/related_merge_requests`]: [
    { iid: 7, title: "feat: thing", web_url: "https://gl.example/g/p/-/merge_requests/7", state: "opened" },
    { iid: 5, title: "old", web_url: "https://gl.example/g/p/-/merge_requests/5", state: "closed" },
  ],
  [`POST ${P}/issues/3/notes`]: { id: 31 },
  [`POST ${P}/merge_requests/7/notes`]: { id: 71 },
};
const fixturesFile = join(work, "fixtures.json");
writeFileSync(fixturesFile, JSON.stringify(fixtures));
const log = join(work, "calls.log");

const runGitlab = (script, env = {}) => {
  writeFileSync(log, "");
  const result = spawnSync("bash", ["-c", `${gitlabShell}\n${script}`], {
    encoding: "utf8",
    env: {
      ...process.env, PATH: `${work}:${process.env.PATH}`, GLAB_LOG: log, GLAB_FIXTURES: fixturesFile,
      LABELS_ENABLED: "true", PIPELINE_LABELS: "review changes-requested merge-queue", REPO: "", ...env,
    },
  });
  const calls = readFileSync(log, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  return { ...result, calls, writes: calls.filter((call) => call.method !== "GET") };
};

try {
  // get-pr: the GitHub-shaped serialization skills parse.
  const full = runGitlab("gl_pr_json 7");
  assert.equal(full.status, 0, full.stderr);
  const pr = JSON.parse(full.stdout);
  assert.equal(pr.number, 7);
  assert.equal(pr.state, "OPEN");
  assert.equal(pr.isDraft, false);
  assert.equal(pr.mergeable, "MERGEABLE");
  assert.equal(pr.mergeStateStatus, "BLOCKED");
  assert.equal(pr.reviewDecision, "CHANGES_REQUESTED", "a reviewer in requested_changes state wins");
  assert.deepEqual(pr.labels, [{ name: "review" }]);
  assert.deepEqual(pr.headRepository, { nameWithOwner: "g/p" });
  assert.equal(pr.isCrossRepository, false);
  assert.deepEqual(pr.closingIssuesReferences, [{ number: 3, url: "https://gl.example/g/p/-/issues/3" }]);
  assert.deepEqual(pr.files, [
    { path: "a.md", additions: 2, deletions: 1 },
    { path: "b.md", additions: 1, deletions: 0 },
  ]);
  assert.equal(pr.additions, 3);
  assert.equal(pr.changedFiles, 2);
  assert.deepEqual(
    pr.comments.map((comment) => comment.id),
    ["merge_requests/7/2", "merge_requests/7/5"],
    "comments exclude system notes, diff notes, and trusted review-verdict notes",
  );
  assert.deepEqual(
    pr.reviews.map((review) => [review.author.login, review.state]).sort(),
    [["bot", "CHANGES_REQUESTED"], ["carol", "APPROVED"], ["dave", "CHANGES_REQUESTED"]],
  );
  assert.equal(pr.latestReviews.length, 3);

  // list-prs light mode skips the heavy calls and falls back to changes_count.
  const light = runGitlab("gl_pr_json 7", { GL_PR_LIGHT: "1" });
  assert.equal(light.status, 0, light.stderr);
  const lightPr = JSON.parse(light.stdout);
  assert.equal(lightPr.additions, null);
  assert.equal(lightPr.changedFiles, 2);
  assert.equal(pr.reviews.some((review) => review.author.login === "mallory"), false, "a commenter cannot forge a verdict");
  assert.ok(!light.calls.some((call) => /\/(notes|commits|diffs)/.test(call.path)), "light mode must not page notes/commits/diffs");

  const withFixtures = (overrides, script, env) => {
    writeFileSync(fixturesFile, JSON.stringify({ ...fixtures, ...overrides }));
    try {
      return runGitlab(script, env);
    } finally {
      writeFileSync(fixturesFile, JSON.stringify(fixtures));
    }
  };

  // Approval without a changes-requested signal reads as APPROVED.
  const approved = withFixtures({ [`GET ${P}/merge_requests/7/reviewers`]: [] }, "gl_pr_json 7", { GL_PR_LIGHT: "1" });
  assert.equal(JSON.parse(approved.stdout).reviewDecision, "APPROVED");

  // The descriptor's own request-changes marker is enough, with no label or reviewer state.
  const markerOnly = withFixtures(
    {
      [`GET ${P}/merge_requests/7/reviewers`]: [{ user: { username: "bot" }, state: "reviewed" }],
      [`GET ${P}/merge_requests/7/approvals`]: { approved: false, approved_by: [] },
    },
    "gl_pr_json 7",
  );
  assert.equal(JSON.parse(markerOnly.stdout).reviewDecision, "CHANGES_REQUESTED");

  // Older GitLab versions can omit the reviewer-state endpoint; the MR's
  // embedded reviewer list still authenticates the descriptor's verdict marker.
  const noReviewerEndpoint = { ...fixtures };
  delete noReviewerEndpoint[`GET ${P}/merge_requests/7/reviewers`];
  noReviewerEndpoint[`GET ${P}/merge_requests/7/approvals`] = { approved: false, approved_by: [] };
  writeFileSync(fixturesFile, JSON.stringify(noReviewerEndpoint));
  const fallbackReviewers = runGitlab("gl_pr_json 7");
  assert.equal(fallbackReviewers.status, 0, fallbackReviewers.stderr);
  assert.equal(JSON.parse(fallbackReviewers.stdout).reviewDecision, "CHANGES_REQUESTED");
  writeFileSync(fixturesFile, JSON.stringify(fixtures));

  // An APPROVED marker whose native approval was revoked no longer counts.
  const stale = withFixtures(
    {
      [`GET ${P}/merge_requests/7/reviewers`]: [{ user: { username: "carol" }, state: "reviewed" }],
      [`GET ${P}/merge_requests/7/approvals`]: { approved: false, approved_by: [] },
      [`GET ${P}/merge_requests/7/notes`]: [
        { id: 9, system: false, type: null, body: "<!-- review: APPROVED -->", author: { username: "carol" }, created_at: "2026-09-01T10:00:00Z" },
      ],
    },
    "gl_pr_json 7",
  );
  assert.deepEqual(JSON.parse(stale.stdout).reviews, []);
  assert.equal(JSON.parse(stale.stdout).reviewDecision, "REVIEW_REQUIRED");

  // An unreadable list is an error, never an empty result.
  const noNotes = { ...fixtures };
  delete noNotes[`GET ${P}/merge_requests/7/notes`];
  writeFileSync(fixturesFile, JSON.stringify(noNotes));
  assert.notEqual(runGitlab("gl_pr_json 7").status, 0, "gl_pr_json must fail when notes cannot be read");
  writeFileSync(fixturesFile, JSON.stringify(fixtures));
  const noJobs = { ...fixtures };
  delete noJobs["GET projects/42/pipelines/99/jobs"];
  writeFileSync(fixturesFile, JSON.stringify(noJobs));
  assert.notEqual(runGitlab("gl_pr_checks 7").status, 0, "unreadable CI jobs must not read as no CI");
  writeFileSync(fixturesFile, JSON.stringify(fixtures));
  const noLabels = { ...fixtures };
  delete noLabels[`GET ${P}/labels`];
  writeFileSync(fixturesFile, JSON.stringify(noLabels));
  const unreadable = runGitlab("apply_label review 7");
  assert.notEqual(unreadable.status, 0, "an unreadable label list must not read as a missing label");
  assert.equal(unreadable.writes.length, 0);
  writeFileSync(fixturesFile, JSON.stringify(fixtures));
  const noComments = { ...fixtures };
  delete noComments[`GET ${P}/merge_requests/7/notes`];
  writeFileSync(fixturesFile, JSON.stringify(noComments));
  assert.notEqual(
    runGitlab("gl_list_comments merge_requests 7").status,
    0,
    "an unreadable comment list must not read as no comments",
  );
  writeFileSync(fixturesFile, JSON.stringify(fixtures));

  // Reads that answer "none found" must fail when the request fails, not look empty.
  const noSearch = withFixtures({}, 'gl_search_prs "docs/runs/plan.md" opened');
  assert.notEqual(noSearch.status, 0, "a failed search must not read as no matching PR");
  assert.equal(noSearch.stdout, "");
  const noMr = { ...fixtures };
  delete noMr[`GET ${P}/merge_requests/7`];
  writeFileSync(fixturesFile, JSON.stringify(noMr));
  const checksWithoutMr = runGitlab("gl_pr_checks 7");
  assert.notEqual(checksWithoutMr.status, 0, "an unreadable MR must not read as no CI");
  assert.equal(checksWithoutMr.stdout, "");
  writeFileSync(fixturesFile, JSON.stringify(fixtures));
  const listed = withFixtures({ [`GET ${P}/merge_requests`]: [{ iid: 7 }] }, "gl_list_prs opened 10");
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(JSON.parse(listed.stdout).map((item) => item.number), [7]);
  assert.notEqual(runGitlab("gl_list_prs opened 10").status, 0, "a failed MR list must not read as no open PRs");

  // Claims append to the assignee list in order, never displacing the existing assignee.
  const assign = runGitlab("gl_assign issues 3 add bot");
  assert.deepEqual(JSON.parse(assign.writes[0].body), { assignee_ids: [5, 1] });

  // Label guards: existing label → one add_labels PUT; missing → logged skip, no write.
  const applied = runGitlab('apply_label review 7');
  assert.equal(applied.status, 0, applied.stderr);
  assert.deepEqual(applied.writes.map((call) => [call.method, call.path, JSON.parse(call.body)]), [
    ["PUT", `${P}/merge_requests/7`, { add_labels: "review" }],
  ]);
  const issueLabel = runGitlab('apply_issue_label review 3');
  assert.deepEqual(issueLabel.writes.map((call) => call.path), [`${P}/issues/3`]);
  const missing = runGitlab('apply_label nope 7');
  assert.equal(missing.status, 0);
  assert.match(missing.stdout, /Skipping label 'nope'/);
  assert.equal(missing.writes.length, 0);
  const disabled = runGitlab('apply_label review 7', { LABELS_ENABLED: "false" });
  assert.equal(disabled.calls.length, 0, "labels.enabled false must skip every label call");
  const comma = runGitlab('apply_label "a,b" 7');
  assert.equal(comma.writes.length, 0);
  const failedRemoval = runGitlab('remove_label review 7', { GLAB_FAIL_KEY: `PUT ${P}/merge_requests/7` });
  assert.notEqual(failedRemoval.status, 0, "a failed label removal must block a pipeline-label transition");

  // set_pipeline_label removes every other pipeline label, then adds the target.
  const pipeline = runGitlab('set_pipeline_label 7 merge-queue');
  assert.deepEqual(pipeline.writes.map((call) => JSON.parse(call.body)), [
    { remove_labels: "review" },
    { remove_labels: "changes-requested" },
    { add_labels: "merge-queue" },
  ]);

  // Input validation: cross-project paths are URL-encoded; hostile values are refused.
  assert.equal(runGitlab("printf %s \"$(gl_project)\"", { REPO: "group/sub/proj" }).stdout, "group%2Fsub%2Fproj");
  assert.notEqual(runGitlab("gl_project", { REPO: "g/p;rm -rf /" }).status, 0);
  assert.notEqual(runGitlab("gl_iid 7x").status, 0);
  assert.equal(runGitlab("gl_handle merge_requests/7/42").status, 0);
  for (const bad of ["merge_requests/7", "issues/x/1", "merge_requests/7/42x", "merge_requests/7/42/../1", "projects/1/2"]) {
    assert.notEqual(runGitlab(`gl_handle '${bad}'`).status, 0, `gl_handle must reject ${bad}`);
  }
  assert.doesNotMatch(
    gitlab,
    /^gl_iid \{[^}\n]+\}$/gm,
    "operation snippets must stop when an iid fails validation",
  );

  // Note writes return a validated handle and propagate API failures instead of
  // letting a trailing jq invocation turn an empty response into success.
  const noteScript = 'body=$(mktemp); printf %s hello > "$body"; gl_note merge_requests 7 "$body"; rc=$?; rm -f "$body"; exit "$rc"';
  const note = runGitlab(noteScript);
  assert.equal(note.status, 0, note.stderr);
  assert.equal(note.stdout.trim(), "merge_requests/7/71");
  const failedNote = runGitlab(noteScript, { GLAB_FAIL_KEY: `POST ${P}/merge_requests/7/notes` });
  assert.notEqual(failedNote.status, 0, "a failed note write must not report a synthetic handle");
  assert.equal(failedNote.stdout, "");

  // get-pr-checks: allow_failure failures are NEUTRAL, blocking failures FAILURE.
  const checks = runGitlab("gl_pr_checks 7");
  assert.equal(checks.status, 0, checks.stderr);
  assert.deepEqual(
    JSON.parse(checks.stdout).map((check) => [check.name, check.state, check.bucket]),
    [
      ["lint", "SUCCESS", "pass"],
      ["flaky", "NEUTRAL", "pass"],
      ["unit", "FAILURE", "fail"],
      ["deploy", "SKIPPED", "skipping"],
      ["child", "IN_PROGRESS", "pending"],
    ],
  );

  // search-prs: an issue reference goes through related MRs, filtered by state.
  const search = runGitlab('gl_search_prs "#3" opened');
  assert.equal(search.status, 0, search.stderr);
  assert.deepEqual(JSON.parse(search.stdout), [
    { number: 7, title: "feat: thing", url: "https://gl.example/g/p/-/merge_requests/7", state: "OPEN" },
  ]);
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(
  `Tracker provider contract OK (${githubOperations.length} operations, 2 split providers, 1 stand-alone GitLab provider).`,
);
