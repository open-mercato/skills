#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const forgejo = read(`${trackerDir}/forgejo.md`);
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
assert.match(forgejo, /A short `get-pr-checks` result is not evidence of green/);
assert.match(forgejo, /under-report here while its jobs register[\s\S]*cross-check \*\*list-runs\*\*/);

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
assert.match(autoFixStabilize, /RERUN_UNAVAILABLE <link>[\s\S]*do not\s+treat that as "failed again"/, "om-auto-fix-pr: a report-only rerun is an unconfirmed flake, not a failure");

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

assert.match(setup, /`github`, `linear`, `jira`, `gitlab`, `forgejo`, or custom/);
assert.match(setup, /ships `github.md`, `gitlab.md`, `forgejo.md`, `linear.md`, and `jira.md`/);
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

// --- Forgejo: stand-alone provider contract ---------------------------------
assert.deepEqual(
  operationHeadings(forgejo),
  githubOperations,
  "forgejo: shipped stand-alone provider must implement every GitHub tracker operation",
);
assert.doesNotMatch(forgejo, /\bTODO\b/, "forgejo: no operation may ship as a TODO (parity compares headings only)");
assert.doesNotMatch(
  forgejo,
  /companion `?\.ai\/trackers\/github\.md`?/,
  "forgejo: stand-alone provider must not depend on the GitHub companion",
);
assert.doesNotMatch(forgejo, /(^|[`"\s])gh (api|pr|issue|label|repo|search|auth|run) /m, "forgejo: no gh CLI calls");
assert.doesNotMatch(forgejo, /(^|[`"\s])glab (api|auth|mr|issue|ci|label|repo) /m, "forgejo: no glab CLI calls");
assert.match(forgejo, /grep -Fq -- '--fail-with-body'/, "forgejo: auth-check must probe curl --fail-with-body");
assert.equal(
  [...forgejo.matchAll(/curl -K -/g)].length,
  1,
  "forgejo: fj_http must be the single curl call site, with the token on stdin",
);
assert.match(forgejo, /^FORGEJO_RERUN_MODE=report /m, "forgejo: rerun mode is a committed switch defaulting to report");
assert.doesNotMatch(forgejo, /empty commit|commit --allow-empty/i, "forgejo: no empty-commit rerun mode");
const forgejoCreateIssue = forgejo.match(/#### create-issue[\s\S]*?#### close-issue/)[0];
assert.doesNotMatch(forgejoCreateIssue, /labels:/, "forgejo: labels are applied through the guard, not the create call");
assert.doesNotMatch(forgejo, /^fj_num \{[^}\n]+\}$/gm, "forgejo: operation snippets must stop when a number fails validation");

const forgejoShell = [
  forgejo.match(/^FJ_JQ_DEFS='[\s\S]*?^'$/m)[0],
  ...[...forgejo.matchAll(/^[a-z_]+\(\) \{\n[\s\S]*?^\}$/gm)].map((match) => match[0]),
  ...[...forgejo.matchAll(/^[a-z_]+\(\) \{ .* \}$/gm)].map((match) => match[0]),
].join("\n\n");

const fjWork = mkdtempSync(join(tmpdir(), "forgejo-tracker-"));
const fjStub = join(fjWork, "fj-http-stub.cjs");
writeFileSync(
  fjStub,
  `const { appendFileSync, readFileSync, writeFileSync } = require("node:fs");
const [method, path, bodyFile, formFile] = process.argv.slice(2);
const body = bodyFile ? readFileSync(bodyFile, "utf8") : "";
appendFileSync(process.env.FJ_LOG, JSON.stringify({ method, path, body, form: formFile || "" }) + "\\n");
const fixtures = JSON.parse(readFileSync(process.env.FJ_FIXTURES, "utf8"));
const full = method + " " + path, bare = method + " " + path.split("?")[0];
let entry = full in fixtures ? fixtures[full] : bare in fixtures ? fixtures[bare] : undefined;
if (process.env.FJ_FAIL_KEY === bare) entry = { __status: 500, __body: { message: "forced" } };
if (entry === undefined) entry = method === "GET" ? { __status: 404, __body: { message: "not found" } } : {};
const wrapped = entry && typeof entry === "object" && !Array.isArray(entry) && ("__status" in entry || "__body" in entry || "__headers" in entry);
const status = wrapped ? (entry.__status || 200) : 200;
const out = wrapped ? entry.__body : entry;
if (process.env.FJ_HDR_OUT) writeFileSync(process.env.FJ_HDR_OUT, "HTTP/1.1 " + status + "\\r\\n" + ((wrapped && entry.__headers) || ""));
if (out !== undefined && !(wrapped && out === null)) process.stdout.write(typeof out === "string" ? out : JSON.stringify(out));
process.exit(status >= 400 ? 22 : 0);
`,
);
const fjStubShell = `fj_http() { FJ_HDR_OUT="\${FJ_HDR:-}" node "$FJ_STUB" "$@"; }`;

const RP = "repos/o/r";
const fjFixtures = {
  [`GET ${RP}/labels`]: [{ id: 11, name: "review" }, { id: 12, name: "changes-requested" }, { id: 13, name: "merge-queue" }],
  [`GET orgs/o/labels`]: [{ id: 21, name: "priority-high" }],
  [`GET orgs/o`]: { username: "o" },
  [`GET ${RP}/pulls/7`]: {
    number: 7, title: "feat: thing", html_url: "https://fj.example/o/r/pulls/7",
    body: "Closes #3\n`fixes #9`\n```\nresolves #10\n```\nfixes other/repo#11 and Fixes o/r#12",
    state: "open", merged: false, user: { login: "alice" }, draft: false, mergeable: true,
    base: { ref: "main", sha: "base1", repo: { full_name: "o/r" } },
    head: { ref: "feat/thing", sha: "abcdef1", repo: { full_name: "o/r", owner: { login: "o" } } },
    allow_maintainer_edit: false, labels: [{ name: "review" }], assignees: [{ login: "bot" }],
    created_at: "2026-09-01T12:00:00+02:00", updated_at: "2026-09-02T10:00:00Z", merged_at: null, closed_at: null,
    merge_commit_sha: null, additions: 3, changed_files: 2,
  },
  [`GET ${RP}/pulls/7/reviews`]: [
    { id: 1, state: "REQUEST_REVIEW", official: true, user: { login: "erin" }, submitted_at: "2026-09-01T10:00:00Z" },
    { id: 2, state: "APPROVED", official: true, stale: true, user: { login: "carol" }, submitted_at: "2026-09-01T11:00:00Z" },
    { id: 3, state: "REQUEST_CHANGES", official: true, user: { login: "dave" }, submitted_at: "2026-09-01T12:00:00Z", body: "fix" },
    { id: 4, state: "APPROVED", official: false, user: { login: "mallory" }, submitted_at: "2026-09-01T13:00:00Z" },
    { id: 5, state: "COMMENT", official: true, user: { login: "frank" }, submitted_at: "2026-09-01T14:00:00Z", comments_count: 1 },
  ],
  [`GET ${RP}/branches/main`]: { name: "main", enable_status_check: true, status_check_contexts: ["ci / test (pull_request)"], required_approvals: 1, user_can_merge: false, commit: { id: "c0ffee0000000000000000000000000000000000" } },
  [`GET ${RP}/commits/abcdef1/status`]: { state: "success" },
  [`GET ${RP}/pulls/7/commits`]: [{ sha: "abcdef1", commit: { message: "feat: thing\n\nbody", author: { date: "2026-09-01T09:00:00+02:00" } } }],
  [`GET ${RP}/pulls/7/files`]: [
    { filename: "a.md", additions: 2, deletions: 1, status: "modified" },
    { filename: "b.md", additions: 1, deletions: 0, status: "added" },
    { filename: "c.md", additions: 0, deletions: 4, status: "deleted" },
  ],
  [`GET ${RP}/issues/7/comments`]: [{ id: 71, user: { login: "bot" }, body: "🤖 claim", created_at: "2026-09-01T10:02:00Z", html_url: "https://fj.example/o/r/pulls/7#issuecomment-71" }],
  [`GET ${RP}/commits/abcdef1/statuses`]: [
    { id: 1, context: "ci / test (pull_request)", status: "pending", target_url: "/o/r/actions/runs/5/jobs/0" },
    { id: 4, context: "ci / test (pull_request)", status: "failure", target_url: "/o/r/actions/runs/5/jobs/0" },
    { id: 2, context: "ci / lint (pull_request)", status: "success", target_url: "/o/r/actions/runs/5/jobs/1" },
    { id: 3, context: "woodpecker", status: "warning", target_url: "https://ci.example/1" },
  ],
  [`GET ${RP}/issues/3`]: { number: 3, title: "bug", body: "", state: "open", user: { login: "h" }, html_url: "https://fj.example/o/r/issues/3", labels: [], assignees: [{ login: "human" }], pull_request: null, created_at: "2026-09-01T10:00:00Z", closed_at: null },
  [`GET ${RP}/issues/3/comments`]: [],
  [`GET ${RP}/issues/3/timeline`]: [
    { type: "comment", ref_issue: null },
    { type: "pull_ref", ref_action: "closes", ref_issue: { number: 7, title: "feat: thing", html_url: "https://fj.example/o/r/pulls/7", state: "open", pull_request: { merged: false } } },
    { type: "comment_ref", ref_action: "none", ref_issue: { number: 7, title: "feat: thing", html_url: "https://fj.example/o/r/pulls/7", state: "open", pull_request: { merged: false } } },
    { type: "comment_ref", ref_action: "none", ref_issue: { number: 5, title: "old", html_url: "https://fj.example/o/r/pulls/5", state: "closed", pull_request: { merged: true } } },
    { type: "comment_ref", ref_action: "none", ref_issue: { number: 4, title: "an issue", html_url: "https://fj.example/o/r/issues/4", state: "open", pull_request: null } },
  ],
  [`POST ${RP}/issues/7/comments`]: { id: 701, html_url: "https://fj.example/o/r/pulls/7#issuecomment-701" },
  [`GET ${RP}/issues/comments/701`]: { __status: 204, __body: "" },
  [`GET ${RP}/actions/runs`]: { total_count: 1, workflow_runs: [{ id: 900, workflow_id: "ci.yml", title: "feat: thing", event: "pull_request", status: "failure", commit_sha: "abcdef1", html_url: "https://fj.example/o/r/actions/runs/5", created: "2026-09-01T12:00:00+02:00", prettyref: "#7", event_payload: JSON.stringify({ pull_request: { head: { ref: "feat/thing" } } }) }] },
  [`GET ${RP}/actions/runs/900`]: { id: 900, workflow_id: "ci.yml", title: "feat: thing", event: "pull_request", status: "failure", commit_sha: "abcdef1", html_url: "https://fj.example/o/r/actions/runs/5", created: "2026-09-01T10:00:00Z", prettyref: "#7", event_payload: JSON.stringify({ pull_request: { head: { ref: "feat/thing" } } }) },
  [`GET ${RP}/actions/runs/900/jobs`]: [{ id: 1, name: "test", status: "failure", runs_on: ["codeberg-tiny"] }, { id: 2, name: "lint", status: "success", runs_on: ["codeberg-tiny"] }],
  [`POST ${RP}/actions/workflows/ci.yml/dispatches`]: { id: 901, run_number: 6, jobs: ["test"] },
  [`GET ${RP}/actions/runs/901`]: { id: 901, workflow_id: "ci.yml", title: "feat: thing", event: "workflow_dispatch", status: "running", commit_sha: "abcdef1", html_url: "https://fj.example/o/r/actions/runs/6", created: "2026-09-01T10:05:00Z" },
  [`GET ${RP}/actions/runs/901/jobs`]: [{ id: 3, name: "test", status: "running", runs_on: ["codeberg-tiny"] }],
};
const fjFixturesFile = join(fjWork, "fixtures.json");
writeFileSync(fjFixturesFile, JSON.stringify(fjFixtures));
const fjLog = join(fjWork, "calls.log");

const runForgejo = (script, env = {}, { stub = true } = {}) => {
  writeFileSync(fjLog, "");
  const result = spawnSync("bash", ["-c", `${forgejoShell}\n${stub ? fjStubShell : ""}\n${script}`], {
    encoding: "utf8",
    env: {
      ...process.env, FJ_STUB: fjStub, FJ_LOG: fjLog, FJ_FIXTURES: fjFixturesFile,
      FORGEJO_URL: "https://fj.example", REPO: "o/r", FORGEJO_TOKEN: "t0ken",
      LABELS_ENABLED: "true", PIPELINE_LABELS: "review changes-requested merge-queue",
      FJ_MERGEABLE_RECHECK_SECONDS: "0", ...env,
    },
  });
  const calls = readFileSync(fjLog, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  return { ...result, calls, writes: calls.filter((call) => call.method !== "GET") };
};
const withForgejo = (overrides, script, env) => {
  const merged = { ...fjFixtures, ...overrides };
  for (const [key, value] of Object.entries(overrides)) if (value === undefined) delete merged[key];
  writeFileSync(fjFixturesFile, JSON.stringify(merged));
  try {
    return runForgejo(script, env);
  } finally {
    writeFileSync(fjFixturesFile, JSON.stringify(fjFixtures));
  }
};

try {
  // --- host, repository, and token resolution --------------------------------
  const parse = (url) => runForgejo(`fj_parse_remote '${url}'`).stdout.trim();
  assert.equal(parse("https://codeberg.org/o/r.git"), "https://codeberg.org o/r");
  assert.equal(parse("https://git.example.com:3000/forgejo/o/r"), "https://git.example.com:3000/forgejo o/r");
  assert.equal(parse("git@codeberg.org:o/r.git"), "https://codeberg.org o/r");
  assert.equal(parse("ssh://git@git.example.com:2222/o/r.git"), "https://git.example.com o/r");
  assert.equal(parse("https://user:secret@codeberg.org/o/r.git"), "https://codeberg.org o/r", "credentials in a remote URL never reach the API base");
  assert.notEqual(runForgejo("fj_parse_remote http://git.example.com/o/r").status, 0, "plain http must be refused");
  assert.notEqual(runForgejo("fj_web", { FORGEJO_URL: "http://git.example.com" }).status, 0);
  assert.notEqual(runForgejo("fj_repo", { REPO: "o/r;rm -rf /" }).status, 0);
  assert.notEqual(runForgejo("fj_repo", { REPO: "o/../r" }).status, 0);
  assert.notEqual(runForgejo("fj_num 7x").status, 0);
  assert.notEqual(runForgejo("fj_sha 'abc;ls'").status, 0);

  // The token follows the contacted host, never another instance's variable.
  const tok = (env) => runForgejo("fj_token", { FORGEJO_TOKEN: "", ...env });
  assert.equal(tok({ FORGEJO_URL: "https://codeberg.org", FORGEJO_TOKEN_CODEBERG_ORG: "cb" }).stdout, "cb");
  assert.equal(tok({ FORGEJO_URL: "https://git.example.com:3000", FORGEJO_TOKEN_GIT_EXAMPLE_COM_3000: "self", FORGEJO_TOKEN_CODEBERG_ORG: "cb" }).stdout, "self");
  assert.equal(tok({ FORGEJO_URL: "https://codeberg.org", FORGEJO_TOKEN: "fallback" }).stdout, "fallback");
  const noTok = tok({ FORGEJO_URL: "https://codeberg.org" });
  assert.notEqual(noTok.status, 0);
  assert.match(noTok.stderr, /FORGEJO_TOKEN_CODEBERG_ORG/, "a missing token names the variable it looked for");

  // The real fj_http hands the token to curl on stdin, never on argv.
  const curlStub = join(fjWork, "curl");
  writeFileSync(curlStub, `#!/usr/bin/env bash\nprintf '%s\\n' "$*" > "${fjWork}/curl.argv"\ncat > "${fjWork}/curl.stdin"\nprintf '{}'\n`);
  chmodSync(curlStub, 0o755);
  const realHttp = runForgejo("fj_http GET user", { PATH: `${fjWork}:${process.env.PATH}`, FORGEJO_TOKEN: "s3cret" }, { stub: false });
  assert.equal(realHttp.status, 0, realHttp.stderr);
  assert.doesNotMatch(readFileSync(join(fjWork, "curl.argv"), "utf8"), /s3cret/, "the token must not appear on curl's argv");
  assert.match(readFileSync(join(fjWork, "curl.stdin"), "utf8"), /Authorization: token s3cret/);
  assert.match(readFileSync(join(fjWork, "curl.argv"), "utf8"), /--fail-with-body .*https:\/\/fj\.example\/api\/v1\/user/);

  // --- get-pr: the GitHub-shaped serialization skills parse -----------------
  const full = runForgejo("fj_pr_json 7");
  assert.equal(full.status, 0, full.stderr);
  const pr = JSON.parse(full.stdout);
  assert.equal(pr.number, 7);
  assert.equal(pr.state, "OPEN");
  assert.equal(pr.isDraft, false);
  assert.equal(pr.mergeable, "MERGEABLE");
  assert.equal(pr.mergeStateStatus, "BLOCKED", "user_can_merge false blocks the merge");
  assert.equal(pr.reviewDecision, "CHANGES_REQUESTED");
  assert.deepEqual(
    pr.reviews.map((review) => [review.author.login, review.state]),
    [["carol", "APPROVED"], ["dave", "CHANGES_REQUESTED"], ["mallory", "APPROVED"], ["frank", "COMMENTED"]],
    "review requests are dropped; every submitted review is reported",
  );
  assert.equal(pr.reviews.some((review) => "counted" in review), false);
  assert.deepEqual(pr.closingIssuesReferences.map((ref) => ref.number), [3, 12], "keywords in code spans and other repos do not close");
  assert.equal(pr.closingIssuesReferences[0].url, "https://fj.example/o/r/issues/3");
  assert.equal(pr.createdAt, "2026-09-01T10:00:00Z", "timestamps are normalized to UTC");
  assert.equal(pr.commits[0].authoredDate, "2026-09-01T07:00:00Z");
  assert.equal(pr.commits[0].messageHeadline, "feat: thing");
  assert.deepEqual(pr.files[0], { path: "a.md", additions: 2, deletions: 1 });
  assert.equal(pr.additions, 3);
  assert.equal(pr.changedFiles, 2);
  assert.deepEqual(pr.comments.map((comment) => comment.id), [71]);
  assert.deepEqual(pr.headRepository, { nameWithOwner: "o/r" });
  assert.equal(pr.isCrossRepository, false);

  const light = runForgejo("fj_pr_json 7", { FJ_PR_LIGHT: "1" });
  assert.equal(light.status, 0, light.stderr);
  assert.ok(!light.calls.some((call) => /\/(commits|files|comments)$/.test(call.path.split("?")[0])), "light mode must not page commits/files/comments");

  // Review decision: only official, fresh, undismissed verdicts count, against required_approvals (floor 1).
  const onlyStale = withForgejo({ [`GET ${RP}/pulls/7/reviews`]: [
    { id: 2, state: "APPROVED", official: true, stale: true, user: { login: "carol" }, submitted_at: "2026-09-01T11:00:00Z" },
    { id: 4, state: "APPROVED", official: false, user: { login: "mallory" }, submitted_at: "2026-09-01T13:00:00Z" },
  ] }, "fj_pr_json 7", { FJ_PR_LIGHT: "1" });
  assert.equal(JSON.parse(onlyStale.stdout).reviewDecision, "REVIEW_REQUIRED", "stale and unofficial approvals cannot approve");
  const oneApproval = { [`GET ${RP}/pulls/7/reviews`]: [{ id: 6, state: "APPROVED", official: true, user: { login: "carol" }, submitted_at: "2026-09-01T11:00:00Z" }] };
  assert.equal(JSON.parse(withForgejo(oneApproval, "fj_pr_json 7", { FJ_PR_LIGHT: "1" }).stdout).reviewDecision, "APPROVED");
  const needsTwo = withForgejo({ ...oneApproval, [`GET ${RP}/branches/main`]: { ...fjFixtures[`GET ${RP}/branches/main`], required_approvals: 2 } }, "fj_pr_json 7", { FJ_PR_LIGHT: "1" });
  assert.equal(JSON.parse(needsTwo.stdout).reviewDecision, "REVIEW_REQUIRED");
  const noBranch = withForgejo({ ...oneApproval, [`GET ${RP}/branches/main`]: { __status: 403, __body: { message: "forbidden" } } }, "fj_pr_json 7", { FJ_PR_LIGHT: "1" });
  assert.equal(JSON.parse(noBranch.stdout).reviewDecision, "APPROVED", "an unreadable branch keeps the floor of one approval");
  assert.equal(JSON.parse(noBranch.stdout).mergeStateStatus, "UNKNOWN");
  const labelVeto = withForgejo({ ...oneApproval, [`GET ${RP}/pulls/7`]: { ...fjFixtures[`GET ${RP}/pulls/7`], labels: [{ name: "changes-requested" }] } }, "fj_pr_json 7", { FJ_PR_LIGHT: "1" });
  assert.equal(JSON.parse(labelVeto.stdout).reviewDecision, "CHANGES_REQUESTED");

  // Merge state derivation.
  const pr7 = fjFixtures[`GET ${RP}/pulls/7`];
  const mergeState = (prOverride, more = {}) => {
    const res = withForgejo({ [`GET ${RP}/pulls/7`]: { ...pr7, ...prOverride }, ...more }, "fj_pr_json 7", { FJ_PR_LIGHT: "1" });
    assert.equal(res.status, 0, res.stderr);
    const out = JSON.parse(res.stdout);
    return [out.mergeable, out.mergeStateStatus, res.calls.filter((call) => call.path === `${RP}/pulls/7`).length];
  };
  assert.deepEqual(mergeState({ draft: true, title: "WIP: thing" }), ["MERGEABLE", "DRAFT", 1]);
  assert.deepEqual(mergeState({ mergeable: false }), ["CONFLICTING", "DIRTY", 2], "mergeable=false is re-read once before reporting a conflict");
  const clean = { [`GET ${RP}/branches/main`]: { ...fjFixtures[`GET ${RP}/branches/main`], user_can_merge: true } };
  assert.deepEqual(mergeState({}, clean), ["MERGEABLE", "CLEAN", 1]);
  const protectedTwo = { [`GET ${RP}/branches/main`]: { ...fjFixtures[`GET ${RP}/branches/main`], user_can_merge: true, protected: true, required_approvals: 2 } };
  assert.deepEqual(mergeState({}, protectedTwo), ["MERGEABLE", "BLOCKED", 1], "missing required approvals block the merge");
  assert.deepEqual(mergeState({}, { ...clean, [`GET ${RP}/commits/abcdef1/status`]: { state: "pending" } }), ["MERGEABLE", "BLOCKED", 1]);
  assert.equal(JSON.parse(withForgejo({ [`GET ${RP}/pulls/7`]: { ...pr7, state: "closed", merged: true, merged_at: "2026-09-03T12:00:00+02:00" } }, "fj_pr_json 7", { FJ_PR_LIGHT: "1" }).stdout).mergedAt, "2026-09-03T10:00:00Z");

  // --- unreadable reads are errors, never empty answers ---------------------
  assert.notEqual(withForgejo({ [`GET ${RP}/pulls/7/reviews`]: undefined }, "fj_pr_json 7").status, 0, "unreadable reviews must fail get-pr");
  assert.notEqual(withForgejo({ [`GET ${RP}/pulls/7/files`]: undefined }, "fj_pr_json 7").status, 0);
  const noStatuses = withForgejo({ [`GET ${RP}/commits/abcdef1/statuses`]: undefined }, "fj_pr_checks 7");
  assert.notEqual(noStatuses.status, 0, "unreadable statuses must not read as no CI");
  assert.equal(noStatuses.stdout, "");
  const noLabels = withForgejo({ [`GET ${RP}/labels`]: undefined }, "apply_label review 7");
  assert.notEqual(noLabels.status, 0, "an unreadable label list must not read as a missing label");
  assert.equal(noLabels.writes.length, 0);
  assert.notEqual(withForgejo({ [`GET ${RP}/issues/7/comments`]: undefined }, "fj_list_comments 7").status, 0);
  const emptyComment = runForgejo("fj_get_comment 701");
  assert.notEqual(emptyComment.status, 0, "a 204 comment read must not read as an empty comment");
  assert.match(emptyComment.stderr, /inline review comment[\s\S]*get-review-comment/, "a 204 points the caller at get-review-comment");
  assert.equal(emptyComment.stdout, "");
  const noSearch = withForgejo({}, 'fj_search_prs "docs/runs/plan.md" open');
  assert.notEqual(noSearch.status, 0, "a failed search must not read as no matching PR");
  assert.equal(noSearch.stdout, "");
  assert.notEqual(runForgejo("fj_list_prs open 10").status, 0, "a failed PR list must not read as no open PRs");

  // fj_list follows Link pagination and unwraps object envelopes.
  const paged = withForgejo({
    [`GET ${RP}/labels?limit=50&page=1`]: { __headers: 'Link: <https://fj.example/api/v1/repos/o/r/labels?page=2>; rel="next"\r\n', __body: [{ id: 1, name: "a" }] },
    [`GET ${RP}/labels?limit=50&page=2`]: [{ id: 2, name: "b" }],
  }, `fj_list "${RP}/labels"`);
  assert.equal(paged.status, 0, paged.stderr);
  assert.deepEqual(JSON.parse(paged.stdout).map((label) => label.name), ["a", "b"]);
  const nullList = withForgejo({ [`GET ${RP}/issues/3/timeline`]: null }, `fj_list "${RP}/issues/3/timeline"`);
  assert.equal(nullList.status, 0, "a 200 null list (Forgejo's empty timeline) is an empty list");
  assert.deepEqual(JSON.parse(nullList.stdout), []);
  assert.notEqual(runForgejo("fj_list_runs ''").status, 0, "list-runs refuses an empty branch or SHA");
  const envelope = runForgejo(`fj_list "${RP}/actions/runs?head_sha=abcdef1" workflow_runs`);
  assert.deepEqual(JSON.parse(envelope.stdout).map((run) => run.id), [900]);
  assert.notEqual(runForgejo(`fj_list "${RP}/actions/runs/900"`).status, 0, "an object where a list is expected is an error");

  // --- PR lists and search ----------------------------------------------------
  const listed = withForgejo({ [`GET ${RP}/pulls`]: [{ number: 7, updated_at: "2026-09-02T10:00:00Z", merged: false }] }, "fj_list_prs open 10");
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(JSON.parse(listed.stdout).map((item) => item.number), [7]);
  const mergedOnly = withForgejo({ [`GET ${RP}/pulls`]: [
    { number: 7, updated_at: "2026-09-02T10:00:00Z", merged: true },
    { number: 8, updated_at: "2026-09-02T09:00:00Z", merged: false },
  ] }, "fj_list_prs merged 10");
  assert.deepEqual(JSON.parse(mergedOnly.stdout).map((item) => item.number), [7], "merged keeps only merged PRs");

  const search = runForgejo('fj_search_prs "#3" open');
  assert.equal(search.status, 0, search.stderr);
  assert.deepEqual(JSON.parse(search.stdout), [{ number: 7, title: "feat: thing", url: "https://fj.example/o/r/pulls/7", state: "OPEN" }]);
  assert.deepEqual(JSON.parse(runForgejo('fj_search_prs "#3" merged').stdout).map((item) => item.number), [5]);
  assert.ok(!search.calls.some((call) => /[?&]q=/.test(call.path)), "an issue reference must not depend on the search indexer");

  // --- issues -----------------------------------------------------------------
  const issue = JSON.parse(runForgejo("fj_issue_json 3").stdout);
  assert.equal(issue.state, "OPEN");
  assert.equal(issue.isPullRequest, false);
  const prAsIssue = withForgejo({ [`GET ${RP}/issues/3`]: { ...fjFixtures[`GET ${RP}/issues/3`], pull_request: { merged: false } } }, "fj_issue_json 3");
  assert.equal(JSON.parse(prAsIssue.stdout).isPullRequest, true);

  // Claims append to the assignee list, never displacing the existing assignee.
  const assign = withForgejo({ [`GET ${RP}/issues/3`]: { ...fjFixtures[`GET ${RP}/issues/3`], assignees: [{ login: "human" }] } }, "fj_assign 3 add bot");
  assert.deepEqual(JSON.parse(assign.writes[0].body), { assignees: ["human", "bot"] });

  const commentScript = 'body=$(mktemp); printf %s hello > "$body"; fj_comment 7 "$body"; rc=$?; rm -f "$body"; exit "$rc"';
  const comment = runForgejo(commentScript);
  assert.equal(comment.status, 0, comment.stderr);
  assert.equal(comment.stdout.trim(), "701");
  const failedComment = runForgejo(commentScript, { FJ_FAIL_KEY: `POST ${RP}/issues/7/comments` });
  assert.notEqual(failedComment.status, 0, "a failed comment write must not report an id");
  assert.equal(failedComment.stdout, "");

  // --- label guards -------------------------------------------------------------
  const applied = runForgejo("apply_label review 7");
  assert.equal(applied.status, 0, applied.stderr);
  assert.deepEqual(applied.writes.map((call) => [call.method, call.path, JSON.parse(call.body)]), [
    ["POST", `${RP}/issues/7/labels`, { labels: [11] }],
  ]);
  const orgLabel = runForgejo("apply_label priority-high 7");
  assert.deepEqual(JSON.parse(orgLabel.writes[0].body), { labels: [21] }, "organization labels satisfy the guard");
  const missing = runForgejo("apply_label nope 7");
  assert.equal(missing.status, 0);
  assert.match(missing.stdout, /Skipping label 'nope'/);
  assert.equal(missing.writes.length, 0);
  assert.equal(runForgejo("apply_label review 7", { LABELS_ENABLED: "false" }).calls.length, 0, "labels.enabled false must skip every label call");
  const removedAbsent = withForgejo({ [`DELETE ${RP}/issues/7/labels/11`]: { __status: 404, __body: { message: "not found" } } }, "remove_label review 7");
  assert.equal(removedAbsent.status, 0, "removing a label that is not applied is a no-op");
  const failedRemoval = withForgejo({ [`DELETE ${RP}/issues/7/labels/11`]: { __status: 403, __body: { message: "forbidden" } } }, "remove_label review 7");
  assert.notEqual(failedRemoval.status, 0, "a failed label removal must block a pipeline-label transition");
  const blockedTransition = withForgejo({ [`DELETE ${RP}/issues/7/labels/11`]: { __status: 500, __body: {} } }, "set_pipeline_label 7 merge-queue");
  assert.notEqual(blockedTransition.status, 0);
  assert.ok(!blockedTransition.writes.some((call) => call.method === "POST"), "no pipeline label is added after a failed removal");
  const pipeline = runForgejo("set_pipeline_label 7 merge-queue");
  assert.deepEqual(pipeline.writes.map((call) => [call.method, call.path]), [
    ["DELETE", `${RP}/issues/7/labels/11`],
    ["DELETE", `${RP}/issues/7/labels/12`],
    ["POST", `${RP}/issues/7/labels`],
  ]);

  // --- CI ---------------------------------------------------------------------------
  const checks = runForgejo("fj_pr_checks 7");
  assert.equal(checks.status, 0, checks.stderr);
  assert.deepEqual(
    JSON.parse(checks.stdout).map((check) => [check.name, check.state, check.bucket, check.link]),
    [
      ["ci / lint (pull_request)", "SUCCESS", "pass", "https://fj.example/o/r/actions/runs/5/jobs/1"],
      ["ci / test (pull_request)", "FAILURE", "fail", "https://fj.example/o/r/actions/runs/5/jobs/0"],
      ["woodpecker", "NEUTRAL", "pass", "https://ci.example/1"],
    ],
    "the latest status per context wins; relative links become absolute",
  );

  assert.equal(runForgejo("fj_required_checks main").stdout, "ci / test (pull_request)\n");
  const unenforced = withForgejo({ [`GET ${RP}/branches/main`]: { name: "main", enable_status_check: false, status_check_contexts: [] } }, "fj_required_checks main");
  assert.equal(unenforced.status, 0);
  assert.equal(unenforced.stdout, "");
  const globbed = withForgejo({ [`GET ${RP}/branches/main`]: { name: "main", enable_status_check: true, status_check_contexts: ["ci / *"] } }, "fj_required_checks main");
  assert.equal(globbed.stdout, "", "pattern contexts degrade to 'every reported check is required'");
  const unreadableBranch = withForgejo({ [`GET ${RP}/branches/main`]: { __status: 403, __body: { message: "forbidden" } } }, "fj_required_checks main");
  assert.notEqual(unreadableBranch.status, 0, "an unreadable branch must not read as no required checks (#128)");

  const runs = runForgejo("fj_list_runs feat/thing", {}, {});
  assert.notEqual(runs.status, 0, "an unknown branch is an error");
  const runsBySha = runForgejo("fj_list_runs abcdef1abcdef1abcdef1abcdef1abcdef1abcde");
  assert.equal(runsBySha.status, 0, runsBySha.stderr);
  assert.deepEqual(JSON.parse(runsBySha.stdout).map((run) => run.databaseId), [900], "a full SHA is queried directly");
  const listedRuns = withForgejo({ [`GET ${RP}/branches/feat%2Fthing`]: { name: "feat/thing", commit: { id: "abcdef1abcdef1abcdef1abcdef1abcdef1abcde" } } }, "fj_list_runs feat/thing");
  assert.equal(listedRuns.status, 0, listedRuns.stderr);
  assert.deepEqual(JSON.parse(listedRuns.stdout).map((run) => [run.databaseId, run.status, run.conclusion, run.workflowName, run.createdAt]), [
    [900, "completed", "failure", "ci.yml", "2026-09-01T10:00:00Z"],
  ]);
  assert.ok(listedRuns.calls.some((call) => call.path.includes("head_sha=abcdef1abcdef1abcdef1abcdef1abcdef1abcde")), "runs are queried by head SHA, not by branch ref");
  const external = withForgejo({
    [`GET ${RP}/actions/runs`]: { total_count: 0, workflow_runs: [] },
    [`GET ${RP}/commits/abcdef1abcdef1abcdef1abcdef1abcdef1abcde/statuses`]: [{ id: 1, context: "woodpecker", status: "success", target_url: "https://ci.example/9" }],
  }, "fj_list_runs abcdef1abcdef1abcdef1abcdef1abcdef1abcde");
  assert.equal(external.status, 4, "statuses without runs mean an external CI");
  assert.equal(external.stdout.trim(), "RUNS_UNAVAILABLE https://ci.example/9");
  const runsUnreadable = withForgejo({
    [`GET ${RP}/actions/runs`]: { __status: 500, __body: { message: "boom" } },
    [`GET ${RP}/commits/abcdef1abcdef1abcdef1abcdef1abcdef1abcde/statuses`]: [{ id: 1, context: "ci", status: "success", target_url: "https://ci.example/9" }],
  }, "fj_list_runs abcdef1abcdef1abcdef1abcdef1abcdef1abcde");
  assert.equal(runsUnreadable.status, 1, "an unreadable runs list is an error, not an external CI");
  const actionsOff = withForgejo({
    [`GET ${RP}/actions/runs`]: { __status: 404, __body: { message: "not found" } },
    [`GET ${RP}/commits/abcdef1abcdef1abcdef1abcdef1abcdef1abcde/statuses`]: [{ id: 1, context: "ci", status: "success", target_url: "https://ci.example/9" }],
  }, "fj_list_runs abcdef1abcdef1abcdef1abcdef1abcdef1abcde");
  assert.equal(actionsOff.status, 4, "Actions disabled (404) with statuses present is an external CI");
  assert.equal(actionsOff.stdout.trim(), "RUNS_UNAVAILABLE https://ci.example/9");
  assert.doesNotMatch(runsUnreadable.stdout, /RUNS_UNAVAILABLE/);
  const notYet = withForgejo({
    [`GET ${RP}/actions/runs`]: { total_count: 0, workflow_runs: [] },
    [`GET ${RP}/commits/abcdef1abcdef1abcdef1abcdef1abcdef1abcde/statuses`]: [],
  }, "fj_list_runs abcdef1abcdef1abcdef1abcdef1abcdef1abcde");
  assert.equal(notYet.status, 0);
  assert.deepEqual(JSON.parse(notYet.stdout), []);

  const run = JSON.parse(runForgejo("fj_get_run 900").stdout);
  assert.equal(run.conclusion, "failure");
  assert.deepEqual(run.jobs.map((job) => [job.name, job.status, job.conclusion]), [["test", "completed", "failure"], ["lint", "completed", "success"]]);

  const report = runForgejo("fj_rerun 900");
  assert.equal(report.status, 3, "report mode exits 3");
  assert.equal(report.stdout.trim(), "RERUN_UNAVAILABLE https://fj.example/o/r/actions/runs/5");
  assert.equal(report.writes.length, 0);
  const dispatched = runForgejo("fj_rerun 900", { FORGEJO_RERUN_MODE: "dispatch" });
  assert.equal(dispatched.status, 0, dispatched.stderr);
  assert.deepEqual(dispatched.writes.map((call) => [call.path, JSON.parse(call.body)]), [
    [`${RP}/actions/workflows/ci.yml/dispatches`, { ref: "feat/thing", return_run_info: true }],
  ]);
  assert.equal(JSON.parse(dispatched.stdout).databaseId, 901);
  assert.notEqual(runForgejo("fj_rerun 900", { FORGEJO_RERUN_MODE: "push" }).status, 0, "unknown rerun modes are refused");
} finally {
  rmSync(fjWork, { recursive: true, force: true });
}

console.log(
  `Tracker provider contract OK (${githubOperations.length} operations, 2 split providers, 2 stand-alone providers: GitLab, Forgejo).`,
);
