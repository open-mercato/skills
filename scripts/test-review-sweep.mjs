#!/usr/bin/env node

// Execute the shipped isolation snippets against temporary files and local Git
// worktrees. No tracker calls, network fetches, live reviewers, or new commits.
// These regressions cover filesystem/configuration behavior, not agent fidelity.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");
const dispatcher = read("skills/om-review-prs/references/subagent-dispatch.md");
const isolation = read("skills/om-review-prs/references/subagent-isolation.md");
const skill = read("skills/om-review-prs/SKILL.md");
const sweepSetup = read("skills/om-review-prs/references/agentic-setup.md");
const setup = read("skills/om-setup-agent-pipeline/SKILL.md");
const loader = read("skills/om-setup-agent-pipeline/references/agentic-setup.md");
const docs = read("docs/skills/om-review-prs.md");
const readme = read("README.md");

function block(text, heading = "") {
  const offset = heading ? text.indexOf(heading) : 0;
  assert.ok(offset >= 0, `Missing snippet section: ${heading}`);
  const match = text.slice(offset).match(/```bash\n([\s\S]*?)\n\s*```/);
  assert.ok(match, `Missing Bash snippet: ${heading}`);
  return match[1];
}

const parallel = block(dispatcher);
const resolve = block(isolation, "### Resolve the coordination directory");
const acquire = block(isolation, "### Acquire the lease");
const release = block(isolation, "### Release the lease");
const bind = block(isolation, "### Bind the nested loader");
const checkout = block(isolation, "## Bind a unique branch to each worker");
const standard = block(loader, "### The standard config-loading snippet");
const env = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
  GIT_TERMINAL_PROMPT: "0",
};

function shell(script, cwd, variables = {}) {
  const result = spawnSync("bash", ["-eu"], {
    cwd, env: { ...env, ...variables }, input: script, encoding: "utf8",
  });
  assert.ifError(result.error);
  return result;
}

function succeeded(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function git(cwd, ...args) {
  const result = spawnSync("git", ["-c", "gc.auto=0", ...args], {
    cwd, env, encoding: "utf8",
  });
  assert.ifError(result.error);
  return succeeded(result);
}

function contend(cwd, variables) {
  return new Promise((resolveResult, reject) => {
    const child = spawn("bash", ["-eu"], { cwd, env: { ...env, ...variables } });
    let stderr = "";
    child.stderr.on("data", (data) => { stderr += data; });
    child.stdout.resume();
    child.on("error", reject);
    child.on("close", (status) => resolveResult({ status, stderr, variables }));
    child.stdin.end(acquire);
  });
}

const fixture = realpathSync(mkdtempSync(join(tmpdir(), "review sweep regressions ")));
function write(path, contents) {
  writeFileSync(path, typeof contents === "string" ? contents : JSON.stringify(contents));
}

try {
  const schema = JSON.parse(setup.match(/```json\n([\s\S]*?)```/)[1]);
  assert.deepEqual(schema.reviewSweep, { maxParallel: 1, coordinationRoot: null });
  for (const text of [setup, docs, readme]) {
    assert.match(text, /coordinationRoot/);
  }
  assert.match(skill, /Do not read or validate `reviewSweep` settings/);
  assert.match(sweepSetup, /om-setup-agent-pipeline --defaults/);
  assert.match(sweepSetup.split("## om-review-prs specifics")[1], /specialize preflight step 1/);
  assert.match(dispatcher, /Do not inspect this value when `--parallel N` overrides it/);
  assert.match(dispatcher, /including any bounded CI follow-up/);
  assert.match(dispatcher, /reserving the coordinator's slot/);
  assert.match(dispatcher, /Enforce this at agent creation/);
  assert.match(dispatcher, /On resume, preserve that origin/);
  assert.match(dispatcher, /do not shorten that report/);
  assert.doesNotMatch(standard, /reviewSweep/);

  for (const snippet of [parallel, resolve, acquire, release, bind, checkout]) {
    const syntax = spawnSync("bash", ["-n"], { input: snippet, encoding: "utf8" });
    assert.ifError(syntax.error);
    succeeded(syntax);
  }

  const configPath = join(fixture, "config with spaces.json");
  const stateRoot = join(fixture, "local state");
  const configVars = {
    CONFIG: configPath, TRACKER: "github", REPO: "example/repository",
    SWEEP_REPOSITORY_ID: "https://github.com/example/repository",
    XDG_STATE_HOME: stateRoot,
  };
  const cases = [
    [{}, "1"],
    [{ reviewSweep: null }, "1"],
    [{ reviewSweep: {} }, "1"],
    [{ reviewSweep: { maxParallel: null } }, "1"],
    [{ reviewSweep: { maxParallel: 3 } }, "3"],
    ...[0, -1, 1.5, true, "3", [], {}].map((maxParallel) => [
      { reviewSweep: { maxParallel } }, null,
    ]),
  ];
  for (const [config, expected] of cases) {
    write(configPath, config);
    const result = shell(`${parallel}\nprintf '%s' "$REVIEW_MAX_PARALLEL"`, fixture, configVars);
    if (expected === null) assert.notEqual(result.status, 0, JSON.stringify(config));
    else assert.equal(succeeded(result), expected);
  }

  const shared = join(fixture, "shared coordination");
  mkdirSync(shared);
  const defaultLock = join(stateRoot, "om-review-prs", "https%3A%2F%2Fgithub.com%2Fexample%2Frepository", "review-sweep.lock");
  for (const coordinationRoot of [undefined, null]) {
    write(configPath, { reviewSweep: { coordinationRoot } });
    assert.equal(
      succeeded(shell(`${resolve}\nprintf '%s' "$SWEEP_LOCK_DIR"`, fixture, configVars)),
      defaultLock,
    );
    assert.ok(existsSync(join(defaultLock, "..")));
  }
  write(configPath, {});
  assert.equal(
    succeeded(shell(`${resolve}\nprintf '%s' "$SWEEP_COORDINATION_SOURCE"`, fixture, configVars)),
    "local-default",
  );
  assert.equal(
    succeeded(shell(`${resolve}\nprintf '%s' "$SWEEP_LOCK_DIR"`, fixture, { ...configVars, TRACKER: "linear" })),
    defaultLock,
  );
  assert.equal(
    succeeded(shell(`${resolve}\nprintf '%s' "$SWEEP_LOCK_DIR"`, fixture, { ...configVars, SWEEP_REPOSITORY_ID: `${configVars.SWEEP_REPOSITORY_ID}/` })),
    defaultLock,
  );
  assert.notEqual(
    succeeded(shell(`${resolve}\nprintf '%s' "$SWEEP_LOCK_DIR"`, fixture, { ...configVars, SWEEP_REPOSITORY_ID: "https://github.com/example/another" })),
    defaultLock,
  );
  assert.notEqual(
    succeeded(shell(`${resolve}\nprintf '%s' "$SWEEP_LOCK_DIR"`, fixture, { ...configVars, SWEEP_REPOSITORY_ID: "https://code.example.com/example/repository" })),
    defaultLock,
  );
  for (const coordinationRoot of [false, 7, "", "relative/path", join(fixture, "unavailable configured storage")]) {
    write(configPath, { reviewSweep: { coordinationRoot } });
    assert.notEqual(shell(resolve, fixture, configVars).status, 0);
  }
  // The coordination loader must not consume an overridden invalid maxParallel.
  write(configPath, { reviewSweep: { maxParallel: "unused invalid value", coordinationRoot: shared } });
  assert.equal(
    succeeded(shell(`${resolve}\nprintf '%s' "$SWEEP_LOCK_DIR"`, fixture, configVars)),
    join(realpathSync(shared), "review-sweep.lock"),
  );

  // The existing unflagged loader still accepts arbitrary reviewSweep values.
  const unflagged = join(fixture, "unflagged");
  mkdirSync(join(unflagged, ".ai", "trackers"), { recursive: true });
  write(join(unflagged, ".ai", "trackers", "github.md"), "Fixture descriptor");
  for (const reviewSweep of [false, "invalid", { maxParallel: 0, coordinationRoot: false }]) {
    write(join(unflagged, ".ai", "agentic.config.json"), { reviewSweep });
    succeeded(shell(standard, unflagged));
  }
  console.log("PASS: mode-specific defaults, config errors, and unchanged standard loader");

  // Different checkout directories contend for one actual shared atomic lease.
  const clones = [join(fixture, "clone one"), join(fixture, "clone two")];
  for (const clone of clones) mkdirSync(clone);
  write(configPath, {});
  for (const clone of clones) {
    assert.equal(
      succeeded(shell(`${resolve}\nprintf '%s' "$SWEEP_LOCK_DIR"`, clone, configVars)),
      defaultLock,
    );
  }
  const lock = join(shared, "review-sweep.lock");
  const contenders = await Promise.all(clones.map((clone, index) => contend(clone, {
    SWEEP_LOCK_DIR: lock, SWEEP_OWNER_TOKEN: `run-${index}/coordinator-${index}`,
  })));
  assert.equal(contenders.filter(({ status }) => status === 0).length, 1);
  const winner = contenders.find(({ status }) => status === 0);
  const loser = contenders.find(({ status }) => status !== 0);
  assert.equal(readFileSync(join(lock, "owner"), "utf8").trim(), winner.variables.SWEEP_OWNER_TOKEN);
  // Same exclusion applies to a different PR using the same test resources.
  assert.notEqual(shell(acquire, clones[1], loser.variables).status, 0);
  assert.notEqual(shell(release, clones[1], loser.variables).status, 0);
  assert.ok(existsSync(lock));
  succeeded(shell(release, clones[0], winner.variables));
  succeeded(shell(acquire, clones[1], loser.variables));
  succeeded(shell(release, clones[1], loser.variables));
  mkdirSync(lock); // Crash between mkdir and owner write: fail closed.
  assert.notEqual(shell(acquire, clones[0], winner.variables).status, 0);
  assert.notEqual(shell(release, clones[0], winner.variables).status, 0);
  assert.ok(existsSync(lock));
  console.log("PASS: cross-checkout exclusion, shared-resource exclusion, and lease ownership");

  // A PR checkout may contain stale policy, or no setup at all. Both nested
  // invocations must still use the captured operator policy and override paths.
  const snapshot = join(fixture, "pinned context");
  const worker = join(fixture, "worker checkout");
  for (const dir of [snapshot, worker]) {
    mkdirSync(join(dir, ".ai", "trackers"), { recursive: true });
    mkdirSync(join(dir, ".ai", "skills", "om-auto-review-pr"), { recursive: true });
  }
  const approved = {
    tracker: "github", labels: { enabled: false }, qaGate: true,
    ci: { maxWaitMinutes: 0 }, validation: { commands: ["approved gate"] },
    reviewChecklist: "policy/review.md",
  };
  write(join(snapshot, ".ai", "agentic.config.json"), approved);
  write(join(snapshot, ".ai", "trackers", "github.md"), "approved descriptor");
  write(join(snapshot, ".ai", "skills", "om-auto-review-pr", "SKILL.md"), "approved override");
  write(join(snapshot, "review-checklist.md"), "approved checklist");
  write(join(worker, ".ai", "agentic.config.json"), { labels: { enabled: true }, validation: { commands: [] } });
  write(join(worker, ".ai", "skills", "om-auto-review-pr", "SKILL.md"), "PR override");
  const inspect = `${bind}
jq -c '{labels: .labels.enabled, qaGate, ci: .ci.maxWaitMinutes, commands: .validation.commands}' "$CONFIG"
cat "$TRACKER_FILE"
printf '\\n'
cat "$SWEEP_AUTO_REVIEW_OVERRIDE"
printf '\\n'
cat "$REVIEW_CHECKLIST"
`;
  const pinned = { SWEEP_CONTEXT_ROOT: snapshot, CONFIG: join(worker, ".ai", "agentic.config.json") };
  const before = succeeded(shell(inspect, worker, pinned));
  assert.match(before, /"labels":false,"qaGate":true,"ci":0,"commands":\["approved gate"\]/);
  assert.match(before, /approved descriptor\napproved override\napproved checklist/);
  rmSync(join(worker, ".ai"), { recursive: true });
  assert.equal(succeeded(shell(inspect, worker, pinned)), before);
  console.log("PASS: pinned configuration survives stale and absent PR setup");

  // Use existing repository objects to exercise real branch collisions without
  // committing, altering the source repository, or contacting a remote server.
  const local = join(fixture, "git repository");
  mkdirSync(local);
  git(local, "init", "-q");
  const head = git(root, "rev-parse", "HEAD");
  git(local, "fetch", "--quiet", root, head);
  const preserved = join(fixture, "preserved worktree");
  const next = join(fixture, "next worktree");
  git(local, "worktree", "add", "--quiet", "--detach", preserved, head);
  git(local, "worktree", "add", "--quiet", "--detach", next, head);
  git(preserved, "checkout", "--quiet", "-b", "review/pr-101", head);
  write(join(preserved, "unfinished.txt"), "unpublished worker data");
  const binding = { SWEEP_REVIEW_BRANCH: "review/sweep-next/pr-101", PR_HEAD_SHA: head };
  succeeded(shell(checkout, next, binding));
  assert.equal(git(next, "branch", "--show-current"), binding.SWEEP_REVIEW_BRANCH);
  assert.equal(git(next, "rev-parse", "HEAD"), head);
  assert.equal(git(preserved, "branch", "--show-current"), "review/pr-101");
  assert.equal(readFileSync(join(preserved, "unfinished.txt"), "utf8"), "unpublished worker data");
  write(join(next, "unfinished.txt"), "second worker data");
  assert.notEqual(shell(checkout, next, binding).status, 0, "Existing branch must never be reset");
  assert.equal(readFileSync(join(next, "unfinished.txt"), "utf8"), "second worker data");
  const third = join(fixture, "third worktree");
  git(local, "worktree", "add", "--quiet", "--detach", third, head);
  succeeded(shell(checkout, third, { ...binding, SWEEP_REVIEW_BRANCH: "review/sweep-third/pr-101" }));
  assert.equal(git(next, "branch", "--show-current"), binding.SWEEP_REVIEW_BRANCH);
  console.log("PASS: later sweeps preserve old branches and unfinished work");
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

console.log("Review-sweep isolation regressions OK (no live multi-agent behavior exercised)");
