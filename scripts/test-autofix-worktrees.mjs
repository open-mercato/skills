#!/usr/bin/env node
import assert from 'node:assert/strict';
import {execFileSync, spawn} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const helper = join(root, 'skills/om-auto-fix-issue/scripts/prepare-worktree.mjs');
const temp = mkdtempSync(join(tmpdir(), 'autofix worktrees '));
const repo = join(temp, 'primary checkout');
const remote = join(temp, 'remote.git');
const env = {...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@test.invalid', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@test.invalid'};
const git = (cwd, ...args) => execFileSync('git', args, {cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const prepare = (args, cwd = repo) => JSON.parse(execFileSync(process.execPath, [helper, ...args], {cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim());
const concurrent = (command, args, cwd) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {cwd, env});
  let stdout = '', stderr = '';
  child.stdout.on('data', value => stdout += value);
  child.stderr.on('data', value => stderr += value);
  child.on('error', reject);
  const timeout = setTimeout(() => child.kill('SIGKILL'), 15000);
  child.on('exit', status => { clearTimeout(timeout); resolve({status, stdout, stderr}); });
});
const args = ['--issue', '7', '--slug', 'same-issue', '--base', 'fixture'];

try {
  git(temp, 'init', '--bare', remote);
  git(temp, '-c', 'init.defaultBranch=fixture', 'init', repo);
  writeFileSync(join(repo, 'original.txt'), 'base\n');
  git(repo, 'add', 'original.txt'); git(repo, 'commit', '-m', 'base');
  git(repo, 'remote', 'add', 'origin', remote); git(repo, 'push', '-u', 'origin', 'fixture');
  const base = git(repo, 'rev-parse', 'HEAD');
  const startingBranch = git(repo, 'symbolic-ref', '--short', 'HEAD');
  const results = await Promise.all([concurrent(process.execPath, [helper, ...args], repo), concurrent(process.execPath, [helper, ...args], repo)]);
  assert.ok(results.every(result => result.status === 0), JSON.stringify(results));
  const [first, second] = results.map(result => JSON.parse(result.stdout));
  for (const key of ['runId', 'branch', 'worktree', 'statePath']) assert.notEqual(first[key], second[key], `fresh concurrent runs have different ${key}`);
  for (const state of [first, second]) {
    assert.match(state.runId, /^[0-9a-f-]{36}$/);
    assert.ok(state.branch.endsWith(state.runId));
    assert.deepEqual(JSON.parse(readFileSync(state.statePath, 'utf8')), Object.fromEntries(Object.entries(state).filter(([key]) => key !== 'statePath')));
    assert.equal(git(state.worktree, 'rev-parse', 'HEAD'), base);
    assert.equal(git(state.worktree, 'symbolic-ref', '--short', 'HEAD'), state.branch);
    assert.equal(state.createdWorktree, true);
  }
  assert.equal(git(repo, 'symbolic-ref', '--short', 'HEAD'), startingBranch, 'primary checkout remains untouched');

  // Compose preparation with a real create-only lock: only its winner publishes.
  const lockRef = 'refs/om-locks/issue-7';
  const lockCommits = [first, second].map(state => execFileSync('git', ['commit-tree', `${base}^{tree}`, '-m', `owner:${state.runId}`], {cwd: state.worktree, env, encoding: 'utf8'}).trim());
  const locks = await Promise.all([first, second].map((state, index) => concurrent('git', ['push', '--porcelain', `--force-with-lease=${lockRef}:`, 'origin', `${lockCommits[index]}:${lockRef}`], state.worktree)));
  assert.equal(locks.filter(result => result.status === 0).length, 1, 'exactly one create-only lock owner');
  const winnerIndex = locks.findIndex(result => result.status === 0);
  const winner = [first, second][winnerIndex];
  const loser = [first, second][1 - winnerIndex];
  writeFileSync(join(temp, 'tracker-writes'), winner.runId + '\n', {flag: 'wx'});
  writeFileSync(join(winner.worktree, 'fix.txt'), winner.runId + '\n');
  git(winner.worktree, 'add', 'fix.txt'); git(winner.worktree, 'commit', '-m', 'winner fix');
  git(winner.worktree, 'push', 'origin', `HEAD:refs/heads/${winner.branch}`);
  assert.equal(readFileSync(join(temp, 'tracker-writes'), 'utf8').trim(), winner.runId);
  assert.equal(git(loser.worktree, 'rev-parse', 'HEAD'), base, 'loser branch was never reset or committed');
  assert.equal(git(repo, 'ls-remote', '--heads', 'origin', loser.branch), '', 'loser publishes no project branch');

  writeFileSync(join(winner.worktree, 'unpublished.txt'), 'retain me\n');
  const winnerHead = git(winner.worktree, 'rev-parse', 'HEAD');
  const resumed = prepare(['--issue', '7', '--resume', winner.statePath]);
  assert.equal(resumed.runId, winner.runId); assert.equal(resumed.branch, winner.branch);
  assert.equal(git(winner.worktree, 'rev-parse', 'HEAD'), winnerHead);
  assert.equal(readFileSync(join(winner.worktree, 'unpublished.txt'), 'utf8'), 'retain me\n');
  assert.throws(() => prepare([...args, '--run-id', winner.runId]), 'fresh invocation never overwrites an existing run');
  assert.throws(() => prepare(['--issue', '8', '--resume', winner.statePath]), 'resume binds the issue identity');
  assert.equal(git(winner.worktree, 'rev-parse', 'HEAD'), winnerHead);

  git(loser.worktree, 'checkout', '-b', 'unrelated');
  assert.throws(() => prepare(['--issue', '7', '--resume', loser.statePath]), 'wrong current branch blocks resume');
  assert.equal(git(loser.worktree, 'symbolic-ref', '--short', 'HEAD'), 'unrelated', 'refused resume never switches branches');
  git(loser.worktree, 'checkout', loser.branch);
  const snapshot = readFileSync(loser.statePath, 'utf8');
  writeFileSync(loser.statePath, JSON.stringify({...loser, branch: winner.branch}));
  assert.throws(() => prepare(['--issue', '7', '--resume', loser.statePath]), 'tampered branch ownership blocks resume');
  writeFileSync(loser.statePath, snapshot);

  const collisionRun = 'existing-run-0001';
  const collisionBranch = `fix/issue-7-same-issue-${collisionRun}`;
  git(repo, 'branch', collisionBranch, winnerHead);
  assert.throws(() => prepare([...args, '--run-id', collisionRun]), 'create-only Git refuses an existing branch');
  assert.equal(git(repo, 'rev-parse', collisionBranch), winnerHead, 'collision does not reset an existing branch');
  const collisionState = join(first.commonDir, 'om-auto-fix-issue', `${collisionRun}.json`);
  assert.equal(JSON.parse(readFileSync(collisionState, 'utf8')).status, 'preparing', 'identity was persisted before failed Git creation');

  // Reuse an existing clean linked worktree without nesting another worktree.
  assert.throws(() => prepare(['--issue', '9', '--slug', 'foreign', '--base', 'fixture'], loser.worktree), "a fresh run cannot switch another run's reserved linked worktree");
  assert.equal(git(loser.worktree, 'symbolic-ref', '--short', 'HEAD'), loser.branch);
  const external = join(temp, 'external linked checkout');
  git(repo, 'worktree', 'add', '--detach', external, 'refs/remotes/origin/fixture');
  const linkedArgs = ['--issue', '9', '--slug', 'reuse', '--base', 'fixture'];
  const linkedRaces = await Promise.all([concurrent(process.execPath, [helper, ...linkedArgs], external), concurrent(process.execPath, [helper, ...linkedArgs], external)]);
  assert.equal(linkedRaces.filter(result => result.status === 0).length, 1, 'one fresh run reserves a shared linked worktree');
  const linked = JSON.parse(linkedRaces.find(result => result.status === 0).stdout);
  assert.equal(linked.worktree, external); assert.equal(linked.createdWorktree, false);
  assert.equal(prepare(['--issue', '9', '--resume', linked.statePath]).branch, linked.branch);
  const linkedSnapshot = readFileSync(linked.statePath, 'utf8');
  for (const changedFlag of [true, 'false', null]) {
    writeFileSync(linked.statePath, JSON.stringify({...linked, createdWorktree: changedFlag}));
    assert.throws(() => prepare(['--issue', '9', '--resume', linked.statePath]), 'resume refuses altered cleanup ownership');
    assert.equal(git(linked.worktree, 'symbolic-ref', '--short', 'HEAD'), linked.branch);
  }
  writeFileSync(linked.statePath, linkedSnapshot);
  assert.equal(prepare(['--issue', '9', '--resume', linked.statePath]).createdWorktree, false);

  writeFileSync(join(linked.worktree, 'dirty.txt'), 'untouched');
  assert.throws(() => prepare(['--issue', '10', '--slug', 'dirty', '--base', 'fixture'], linked.worktree), 'fresh reuse refuses unrelated dirty work');
  assert.equal(readFileSync(join(linked.worktree, 'dirty.txt'), 'utf8'), 'untouched');
  assert.equal(git(linked.worktree, 'symbolic-ref', '--short', 'HEAD'), linked.branch);
  assert.throws(() => prepare(['--issue', '7', '--slug', '../unsafe', '--base', 'fixture']));
  assert.throws(() => prepare(['--issue', '7', '--slug', 'safe', '--base', '--unsafe']));
  assert.ok(existsSync(join(winner.worktree, 'unpublished.txt')), 'all refusals retain unpublished winner work');

  const body = readFileSync(join(root, 'skills/om-auto-fix-issue/SKILL.md'), 'utf8');
  const setup = readFileSync(join(root, 'skills/om-auto-fix-issue/references/worktree-setup.md'), 'utf8');
  assert.match(body, /fix\/issue-\{issueId\}-\{slug\}-\{runId\}/);
  assert.match(setup, /scripts\/prepare-worktree\.mjs/);
  assert.doesNotMatch(setup, /^git checkout -B/m);
  assert.match(setup, /only its winner may implement|Only `om-fix` acquires/);
  console.log('Autofix worktrees OK: concurrent same-issue isolation, persisted create-only state, one atomic publisher, dirty-work resume, collision/foreign-state refusal and linked-worktree reuse.');
} finally { rmSync(temp, {recursive: true, force: true}); }
