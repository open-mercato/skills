#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, chmodSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), 'git-provider-locks-'));
const realGit = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim();
const remote = join(scratch, 'remote with spaces.git');
const canonical = 'https://fixture.invalid/group/repository';
const env = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: `url.${remote}.insteadOf`, GIT_CONFIG_VALUE_0: `${canonical}.git`,
  GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@invalid',
  GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@invalid',
  REAL_GIT: realGit, LOCK_REMOTE: remote,
};
const git = (...args) => execFileSync(realGit, args, { env, encoding: 'utf8', timeout: 15000 }).trim();
const names = ['git_lock_target', 'git_get_lock', 'git_acquire_lock', 'git_release_lock'];
const blocks = [];
try {
  git('init', '--bare', '-q', remote);
  const tree = execFileSync(realGit, ['--git-dir', remote, 'mktree'], { env, input: '', encoding: 'utf8' }).trim();
  const projectBlob = execFileSync(realGit, ['--git-dir', remote, 'hash-object', '-w', '--stdin'], { env, input: 'project content that lock reads must not fetch', encoding: 'utf8' }).trim();
  const projectTree = execFileSync(realGit, ['--git-dir', remote, 'mktree'], { env, input: `100644 blob ${projectBlob}\tproject.txt\n`, encoding: 'utf8' }).trim();
  const base = git('--git-dir', remote, 'commit-tree', projectTree, '-m', 'fixture base');
  git('--git-dir', remote, 'update-ref', 'refs/heads/base', base);
  writeFileSync(join(scratch, 'git'), `#!/usr/bin/env python3
import os,sys,subprocess,time
from pathlib import Path
args=sys.argv[1:]; real=os.environ['REAL_GIT']
if 'ls-remote' in args and os.environ.get('LOCK_READ_FAIL'): sys.exit(1)
if 'push' in args:
 if os.environ.get('LOCK_DENIED'): sys.exit(1)
 deleting=args[-1].startswith(':')
 if not deleting and os.environ.get('LOCK_BARRIER'):
  barrier=Path(os.environ['LOCK_BARRIER']); (barrier/os.environ['LOCK_WORKER']).touch(); deadline=time.time()+15
  while len(list(barrier.iterdir()))<2:
   if time.time()>deadline: raise RuntimeError('barrier timed out')
   time.sleep(.005)
 if deleting and os.environ.get('LOCK_SUCCESSOR'):
  subprocess.run([real,'--git-dir',os.environ['LOCK_REMOTE'],'update-ref',args[-1][1:],os.environ['LOCK_SUCCESSOR']],check=True)
 result=subprocess.run([real,*args])
 if result.returncode==0 and os.environ.get('LOCK_PUSH_LOST'): sys.exit(1)
 sys.exit(result.returncode)
os.execv(real,[real,*args])
`);
  chmodSync(join(scratch, 'git'), 0o755);
  const testEnv = { ...env, PATH: `${scratch}:${process.env.PATH}` };
  for (const provider of ['gitlab', 'forgejo']) {
    const descriptor = readFileSync(join(root, `skills/om-setup-agent-pipeline/references/trackers/${provider}.md`), 'utf8');
    const functions = names.map(name => {
      const match = descriptor.match(new RegExp(`^${name}\\(\\) [({]\\n[\\s\\S]*?^[)}]$`, 'm'));
      assert.ok(match, `${provider} ships ${name}`);
      return match[0];
    }).join('\n');
    blocks.push(functions.replaceAll('refs/heads/om-locks', 'refs/om-locks'));
    const resolver = descriptor.match(/^git_lock_repository\(\) \{\n[\s\S]*?^\}/m)?.[0];
    assert.ok(resolver, `${provider} target resolver`);
    const validator = descriptor.match(/^git_lock_validate_base\(\) \{\n[\s\S]*?^\}/m)?.[0];
    assert.ok(validator, `${provider} verifies base through API`);
    const script = join(scratch, `${provider}.sh`);
    const response = JSON.stringify({ id: base, sha: base, web_url: canonical, http_url_to_repo: `${canonical}.git`, html_url: canonical, clone_url: `${canonical}.git` });
    writeFileSync(script, `gl_project() { echo group/repository; }
fj_repo() { echo group/repository; }
gl_get() { case "$1" in projects/group/repository|projects/group/repository/repository/commits/${base}) ;; *) return 1 ;; esac; shift; printf '%s' '${response}' | jq "$@"; }
fj_get() { case "$1" in repos/group/repository|repos/group/repository/git/commits/${base}) ;; *) return 1 ;; esac; shift; printf '%s' '${response}' | jq "$@"; }
${resolver}
${validator}
${functions}
"$@"
`);
    const invoke = (args, extra = {}) => execFileSync('bash', [script, ...args], {
      env: { ...testEnv, ...extra }, encoding: 'utf8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    const read = (kind = 'issue', item = '7') => JSON.parse(invoke(['git_get_lock', kind, item]));
    const acquire = (run, extra = {}) => JSON.parse(invoke(['git_acquire_lock', 'issue', '7', run, 'shared-bot', base], extra));
    const release = (lock, extra = {}) => invoke(['git_release_lock', 'issue', '7', lock.sha, lock.runId, lock.actor], extra);
    assert.equal(read(), null);
    for (let round = 0; round < 4; round++) {
      const barrier = join(scratch, `${provider}-${round}`); mkdirSync(barrier);
      const contender = run => new Promise((resolve, reject) => {
        const child = spawn('bash', [script, 'git_acquire_lock', 'issue', '7', run, 'shared-bot', base], {
          env: { ...testEnv, LOCK_BARRIER: barrier, LOCK_WORKER: run },
        });
        let output = '', errors = '';
        child.stdout.on('data', data => output += data); child.stderr.on('data', data => errors += data);
        const timer = setTimeout(() => child.kill('SIGTERM'), 20000);
        child.on('error', reject);
        child.on('exit', code => { clearTimeout(timer); code === 0 ? resolve(JSON.parse(output)) : reject(Error(errors)); });
      });
      const results = await Promise.all([contender(`first-${round}`), contender(`second-${round}`)]);
      assert.equal(results.filter(result => result.status === 'acquired').length, 1);
      assert.equal(results.filter(result => result.status === 'conflict').length, 1);
      assert.equal(results[0].lock.sha, results[1].lock.sha);
      const lock = read();
      assert.equal(lock.repo, canonical);
      assert.equal(lock.baseSha, base);
      assert.equal(git('--git-dir', remote, 'show', '-s', '--format=%P', lock.sha), '', 'lock has no project-history parents');
      assert.equal(git('--git-dir', remote, 'show', '-s', '--format=%T', lock.sha), tree, 'lock tree is empty');
      assert.notEqual(tree, projectTree, 'fixture includes real project content');
      assert.equal(lock.createdAt, null, 'client date must not authorize recovery');
      assert.ok(lock.metadataCreatedAt);
      assert.equal(acquire(lock.runId).status, 'owned');
      assert.equal(JSON.parse(invoke(['git_acquire_lock', 'issue', '7', lock.runId, 'other-actor', base])).status, 'conflict');
      assert.equal(read('pr'), null, 'issue and MR/PR number spaces remain separate');
      assert.throws(() => release({ ...lock, runId: 'different-run' }));
      assert.equal(read().sha, lock.sha);
      release(lock); assert.equal(read(), null);
    }
    const uncertain = acquire('uncertain-push', { LOCK_PUSH_LOST: '1' });
    assert.equal(uncertain.status, 'acquired'); release(uncertain.lock);
    assert.throws(() => acquire('permission-denied', { LOCK_DENIED: '1' }));
    assert.equal(read(), null);
    const rejectHook = join(remote, 'hooks', 'pre-receive');
    writeFileSync(rejectHook, '#!/bin/sh\nexit 1\n'); chmodSync(rejectHook, 0o755);
    assert.throws(() => acquire('hook-denied'), 'server hooks must remain effective');
    assert.equal(read(), null); rmSync(rejectHook);
    assert.throws(() => invoke(['git_acquire_lock', 'issue', '7', 'missing-base', 'shared-bot', '1'.repeat(40)]));
    assert.equal(read(), null);
    assert.throws(() => invoke(['git_get_lock', 'issue', '7'], { LOCK_READ_FAIL: '1' }));
    const old = acquire('old-owner').lock;
    const message = `om-claim-v1\n${JSON.stringify({ repo: canonical, kind: 'issue', item: '7', runId: 'successor', actor: 'shared-bot', baseSha: base })}`;
    const successor = git('--git-dir', remote, 'commit-tree', tree, '-m', message);
    assert.throws(() => release(old, { LOCK_SUCCESSOR: successor }));
    assert.equal(read().sha, successor, 'lease preserves successor inserted between read and deletion');
    assert.throws(() => release(old)); release(read());
    assert.match(release(old), /absent/);
    const prefix = provider === 'gitlab' ? 'refs/heads/om-locks' : 'refs/om-locks';
    git('--git-dir', remote, 'update-ref', `${prefix}/issue-70`, base);
    assert.equal(read(), null);
    git('--git-dir', remote, 'update-ref', `${prefix}/issue-7`, base);
    assert.throws(() => read(), 'malformed metadata blocks');
    const foreignMessage = `om-claim-v1\n${JSON.stringify({ repo: 'https://other.invalid/group/repository', kind: 'issue', item: '7', runId: 'foreign-host', actor: 'shared-bot', baseSha: base })}`;
    const foreign = git('--git-dir', remote, 'commit-tree', tree, '-m', foreignMessage);
    git('--git-dir', remote, 'update-ref', `${prefix}/issue-7`, foreign);
    assert.throws(() => read(), 'same repository path on a foreign host is not ownership');
    const parented = git('--git-dir', remote, 'commit-tree', tree, '-p', base, '-m', message);
    git('--git-dir', remote, 'update-ref', `${prefix}/issue-7`, parented);
    assert.throws(() => read(), 'raw headers must reject parents even after a shallow fetch');
    const projectContentLock = git('--git-dir', remote, 'commit-tree', projectTree, '-m', message);
    git('--git-dir', remote, 'update-ref', `${prefix}/issue-7`, projectContentLock);
    assert.throws(() => read(), 'lock metadata must not include project content');
    git('--git-dir', remote, 'update-ref', '-d', `${prefix}/issue-7`);
    assert.throws(() => read('unexpected'));
    assert.throws(() => read('issue', '7;false'));
    assert.throws(() => acquire('unsafe/run'));
    assert.equal(git('--git-dir', remote, 'rev-parse', 'refs/heads/base'), base, 'project history is unchanged');
    console.log(`${provider}: 4 concurrent same-login races; target resolution, uncertain push, permission failure, identity, exact refs, metadata clock and successor fencing pass.`);
  }
  assert.equal(blocks[0], blocks[1], 'transport helpers must stay synchronized across providers');
} finally { rmSync(scratch, { recursive: true, force: true }); }
