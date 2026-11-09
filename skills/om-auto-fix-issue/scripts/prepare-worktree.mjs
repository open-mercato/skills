#!/usr/bin/env node
// Local preparation only. Tracker ownership remains the later om-fix gate.
import {execFileSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';

const options = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  if (!['--issue', '--slug', '--base', '--prefix', '--run-id', '--resume'].includes(key)
      || !process.argv[i + 1] || key in options) throw new Error('Invalid preparation arguments');
  options[key] = process.argv[i + 1];
}
const git = (cwd, ...args) => execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const validRun = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/.test(value);
const validIssue = value => typeof value === 'string' && /^[1-9][0-9]*$/.test(value);
const validSlug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 40;
const branchName = state => `${state.prefix}/issue-${state.issue}-${state.slug}-${state.runId}`;
let statePath;

try {
  const cwd = realpathSync(process.cwd());
  const commonDir = realpathSync(resolve(cwd, git(cwd, 'rev-parse', '--git-common-dir')));
  const primaryRoot = realpathSync(git(cwd, 'worktree', 'list', '--porcelain', '-z').split('\0')[0].slice('worktree '.length));
  const callerRoot = realpathSync(git(cwd, 'rev-parse', '--show-toplevel'));
  const stateRoot = join(commonDir, 'om-auto-fix-issue');
  const reservationRoot = join(stateRoot, 'worktrees');
  const reservationPath = worktree => join(reservationRoot, createHash('sha256').update(worktree).digest('hex') + '.json');
  let state;

  const verifyWorktree = () => {
    requireValue(validRun(state.runId) && validIssue(state.issue) && validSlug(state.slug), 'Invalid persisted identity');
    requireValue(state.version === 1 && ['fix', 'feat'].includes(state.prefix), 'Invalid preparation state');
    requireValue(state.commonDir === commonDir && state.primaryRoot === primaryRoot, 'State belongs to another repository');
    requireValue(state.issue === options['--issue'], 'State belongs to another issue');
    requireValue(state.branch === branchName(state), 'Persisted branch identity does not match the run');
    requireValue(resolve(statePath) === join(stateRoot, `${state.runId}.json`), 'Unexpected state location');
    requireValue(typeof state.worktree === 'string' && state.worktree !== primaryRoot, 'Primary worktree cannot be resumed');
    requireValue(typeof state.createdWorktree === 'boolean', 'Invalid cleanup ownership');
    if (state.createdWorktree) requireValue(state.worktree === join(primaryRoot, '.ai', 'tmp', 'om-auto-fix-issue', `issue-${state.issue}-${state.runId}`), 'Run-created worktree path does not match identity');
    requireValue(state.reservationPath === reservationPath(state.worktree), 'Unexpected worktree reservation');
    requireValue(lstatSync(state.reservationPath).isFile() && !lstatSync(state.reservationPath).isSymbolicLink(), 'Invalid worktree reservation');
    const reservation = JSON.parse(readFileSync(state.reservationPath, 'utf8'));
    requireValue(reservation.runId === state.runId && reservation.statePath === statePath && reservation.branch === state.branch && reservation.createdWorktree === state.createdWorktree, 'Worktree belongs to another run or cleanup owner');
    requireValue(realpathSync(state.worktree) === state.worktree, 'Worktree path changed');
    requireValue(realpathSync(resolve(state.worktree, git(state.worktree, 'rev-parse', '--git-common-dir'))) === commonDir, 'Worktree belongs to another repository');
    requireValue(realpathSync(git(state.worktree, 'rev-parse', '--show-toplevel')) === state.worktree, 'Worktree root changed');
    requireValue(git(state.worktree, 'symbolic-ref', '--quiet', '--short', 'HEAD') === state.branch, 'Persisted worktree is on another branch');
    requireValue(typeof state.baseSha === 'string' && /^[0-9a-f]{40,64}$/.test(state.baseSha), 'Invalid persisted base');
    git(state.worktree, 'merge-base', '--is-ancestor', state.baseSha, 'HEAD');
  };
  const markReady = () => {
    state.status = 'ready';
    const temporary = `${statePath}.${randomUUID()}.tmp`;
    writeFileSync(temporary, JSON.stringify(state, null, 2) + '\n', {flag: 'wx', mode: 0o600});
    renameSync(temporary, statePath);
  };

  requireValue(validIssue(options['--issue']), 'Supply a positive numeric --issue');
  if (options['--resume']) {
    requireValue(Object.keys(options).every(key => ['--issue', '--resume'].includes(key)), 'Resume accepts only issue and state path');
    statePath = resolve(options['--resume']);
    requireValue(lstatSync(statePath).isFile() && !lstatSync(statePath).isSymbolicLink(), 'State must be a regular file');
    requireValue(realpathSync(dirname(statePath)) === realpathSync(stateRoot), 'State directory is outside this repository');
    state = JSON.parse(readFileSync(statePath, 'utf8'));
    requireValue(['preparing', 'ready'].includes(state.status), 'Unsupported preparation state');
    verifyWorktree(); // No checkout, branch reset or replacement on resume.
    if (state.status !== 'ready') markReady();
  } else {
    const runId = options['--run-id'] || randomUUID();
    const prefix = options['--prefix'] || 'fix';
    const slug = options['--slug'];
    const base = options['--base'];
    requireValue(validRun(runId) && validSlug(slug) && ['fix', 'feat'].includes(prefix), 'Invalid run, slug or prefix');
    requireValue(typeof base === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(base), 'Invalid resolved base branch');
    git(cwd, 'check-ref-format', '--branch', base);
    const baseRef = `refs/remotes/origin/${base}`;
    const baseSha = git(cwd, 'rev-parse', '--verify', `${baseRef}^{commit}`);
    const reuseLinked = callerRoot !== primaryRoot;
    if (reuseLinked) requireValue(git(cwd, 'status', '--porcelain') === '', 'Fresh preparation requires a clean linked worktree');
    const worktree = reuseLinked ? callerRoot : join(primaryRoot, '.ai', 'tmp', 'om-auto-fix-issue', `issue-${options['--issue']}-${runId}`);
    state = {version: 1, status: 'preparing', runId, issue: options['--issue'], slug, prefix, commonDir, primaryRoot, baseSha, worktree, createdWorktree: !reuseLinked};
    state.branch = branchName(state);
    state.reservationPath = reservationPath(worktree);
    git(cwd, 'check-ref-format', '--branch', state.branch);
    mkdirSync(stateRoot, {recursive: true});
    statePath = join(stateRoot, `${runId}.json`);
    // Create-only state is durable before either the branch or worktree exists.
    writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', {flag: 'wx', mode: 0o600});
    mkdirSync(reservationRoot, {recursive: true});
    writeFileSync(state.reservationPath, JSON.stringify({runId, statePath, branch: state.branch, createdWorktree: state.createdWorktree}) + '\n', {flag: 'wx', mode: 0o600});
    // Upstream is set only by the later claim winner at publication. Avoid
    // concurrent branch creation contending on the shared Git config file.
    if (reuseLinked) git(cwd, 'checkout', '--no-track', '-b', state.branch, baseRef);
    else {
      mkdirSync(dirname(worktree), {recursive: true});
      git(cwd, 'worktree', 'add', '--no-track', '-b', state.branch, worktree, baseRef);
    }
    verifyWorktree();
    markReady();
  }
  process.stdout.write(JSON.stringify({...state, statePath}) + '\n');
} catch (error) {
  process.stderr.write(`Worktree preparation refused: ${error.message}\nRetain the persisted state and unpublished work; never reset an existing branch.\n`);
  if (statePath) process.stderr.write(`State: ${statePath}\n`);
  process.exitCode = 1;
}
