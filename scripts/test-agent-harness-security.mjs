#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as h from '../skills/om-harness/scripts/harness.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runtime = join(root, 'skills/om-harness/scripts/harness.mjs')
const hooks = join(root, 'skills/om-harness/hooks/guard.mjs')
const fixture = mkdtempSync(join(tmpdir(), 'harness security '))
const repo = join(fixture, 'repo')
const originalEnv = { ...process.env }
// Tests use only synthetic credentials. Never expose the operator's environment
// or credential stores to the deliberately misbehaving local adapters.
process.env = { PATH: originalEnv.PATH, HOME: fixture, TMPDIR: fixture, GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'Security Test', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_NAME: 'Security Test', GIT_COMMITTER_EMAIL: 'test@example.invalid' }
function run(command, args, expected = 0, input) {
  const result = spawnSync(command, args, { cwd: repo, encoding: 'utf8', timeout: 15000, input })
  assert.equal(result.status, expected, `${args.join(' ')}\n${result.stderr || result.error || result.stdout}`)
  return result.stdout.trim()
}
const git = (...args) => run('git', args)
const digest = value => createHash('sha256').update(value).digest('hex')
const cli = (args, expected = 0) => run(process.execPath, [runtime, ...args], expected)
let server
try {
  mkdirSync(repo)
  git('init', '-q')
  writeFileSync(join(repo, 'app.txt'), 'base\n')
  git('add', 'app.txt'); git('commit', '-qm', 'fixture baseline')
  const keys = ['GITHUB_TOKEN', 'AWS_SECRET_ACCESS_KEY', 'OPENAI_API_KEY', 'STRIPE_KEY', 'DATABASE_URL', 'GOOGLE_APPLICATION_CREDENTIALS', 'SSH_AUTH_SOCK', 'DOCKER_AUTH_CONFIG', 'NODE_OPTIONS', 'GIT_CONFIG_PARAMETERS', 'OM_HARNESS_UNAPPROVED']
  for (const key of keys) process.env[key] = 'synthetic-test-value'
  const clean = h.sanitizedCliEnvironment({ OM_HARNESS_MODEL: 'fixture' })
  for (const key of keys) assert.ok(!(key in clean), `Leaked environment name ${key}`)
  assert.equal(clean.OM_HARNESS_MODEL, 'fixture')
  for (const key of keys) delete process.env[key]
  const hardening = h.workerEnvironment({})
  assert.equal(hardening.GIT_CONFIG_KEY_0, 'protocol.allow')
  assert.equal(hardening.GIT_CONFIG_VALUE_0, 'never')
  assert.equal(hardening.GIT_CONFIG_KEY_1, 'credential.helper')
  assert.equal(hardening.GIT_CONFIG_VALUE_1, '')
  const envProbe = join(fixture, 'env-probe.mjs')
  writeFileSync(envProbe, `import {spawnSync} from 'node:child_process'; const config = name => spawnSync('git',['config','--get',name],{encoding:'utf8'}).stdout.trim(); const remote=spawnSync('git',['ls-remote','https://example.invalid/no-network'],{encoding:'utf8'}); process.stdout.write(JSON.stringify({protocol:config('protocol.allow'),helper:config('credential.helper'),remoteError:remote.stderr}));`)
  const envWorker = await h.invokeWorker({id:'environment',model:{model:'fixture',family:'fixture',commands:{worker:[process.execPath,envProbe]}},worktree:repo,prompt:'fixture'})
  const observedEnvironment = JSON.parse(envWorker.output)
  assert.equal(observedEnvironment.protocol,'never'); assert.equal(observedEnvironment.helper,'')
  assert.match(observedEnvironment.remoteError,/transport .* not allowed/)
  console.log('PASS: environment allowlist and worker Git hardening')

  const authProbe = join(fixture,'auth-probe.mjs')
  writeFileSync(authProbe, `process.stdout.write(JSON.stringify({verdict:'approve',findings:[],notes:[String(Boolean(process.env.FIXTURE_CLI_KEY)),String(Boolean(process.env.DATABASE_URL))]}));`)
  process.env.FIXTURE_CLI_KEY='synthetic-selected-key'; process.env.DATABASE_URL='synthetic-unselected-value'
  const authorized = await h.runCommandReviewer('auth',{model:'fixture',credentialEnv:'FIXTURE_CLI_KEY',commands:{review:[process.execPath,authProbe]}},'fixture',repo)
  assert.equal(authorized.status,'completed'); assert.deepEqual(authorized.review.notes,['true','false'])
  delete process.env.FIXTURE_CLI_KEY; delete process.env.DATABASE_URL
  const reviewerFile = join(fixture, 'reviewer.mjs')
  writeFileSync(reviewerFile, `import {writeFileSync} from 'node:fs'; import {join} from 'node:path'; writeFileSync(join(process.env.OM_HARNESS_WORKTREE,'app.txt'),'unreviewed content\\n'); process.stdout.write(JSON.stringify({verdict:'approve',findings:[],notes:[]}));`)
  const model = { adapter: 'command', model: 'fixture', commands: { review: [process.execPath, reviewerFile], worker: [process.execPath, reviewerFile] }, timeoutMs: 3000 }
  const review = await h.runCommandReviewer('fixture', model, 'fixture', repo)
  assert.equal(review.status, 'failed'); assert.equal(review.containmentFailure, true)
  writeFileSync(join(repo, 'app.txt'), 'base\n')
  const rejected = await h.invokeReviewerWithRetries('fixture', model, 'fixture', repo, { maxAttempts: 3 })
  assert.equal(rejected.status, 'failed'); assert.equal(rejected.attempts, 1)
  const workerFile = join(fixture, 'worker.mjs')
  writeFileSync(workerFile, `import {spawnSync} from 'node:child_process'; spawnSync('git',['update-ref','refs/security-worker/probe','HEAD'],{cwd:process.env.OM_HARNESS_WORKTREE});`)
  const worker = await h.invokeWorker({ id: 'fixture', model: { ...model, family: 'fixture', commands: { worker: [process.execPath, workerFile] } }, worktree: repo, prompt: 'fixture' })
  assert.equal(worker.status, 'failed'); assert.match(worker.error, /refs or reflogs/)
  git('update-ref', '-d', 'refs/security-worker/probe')
  const kimiBinary = join(fixture, 'fake-kimi')
  writeFileSync(kimiBinary, `#!/usr/bin/env node\nimport {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(join(repo,'app.txt'))},'preset mutation\\n'); process.stdout.write(JSON.stringify({verdict:'approve',findings:[],notes:[]}));`)
  chmodSync(kimiBinary, 0o755); process.env.FIXTURE_KIMI = kimiBinary
  const preset = await h.invokeReviewerWithRetries('kimi', { adapter:'preset',preset:'kimi-subscription',model:'fixture',binaryEnv:'FIXTURE_KIMI',timeoutMs:3000 }, 'fixture',repo,{maxAttempts:3})
  assert.equal(preset.status,'failed'); assert.equal(preset.containmentFailure,true); assert.equal(preset.attempts,1)
  delete process.env.FIXTURE_KIMI
  writeFileSync(join(repo,'app.txt'),'unreviewed content\n')
  console.log('PASS: command/preset reviewer mutations, non-retryable containment failure, worker ref mutation')

  const lateChild = join(fixture, 'late-child.mjs')
  const lateMarker = join(fixture, 'late-mutation.txt')
  writeFileSync(lateChild, `import {writeFileSync} from 'node:fs'; setTimeout(() => writeFileSync(${JSON.stringify(lateMarker)}, 'background child survived'), 500);`)
  for (const hang of [false, true]) {
    rmSync(lateMarker, { force: true })
    writeFileSync(reviewerFile, `import {spawn} from 'node:child_process'; spawn(process.execPath, [${JSON.stringify(lateChild)}], {stdio:'ignore'}).unref(); ${hang ? 'setInterval(() => {}, 1000);' : "process.stdout.write(JSON.stringify({verdict:'approve',findings:[],notes:[]}));"}`)
    const background = await h.runCommandReviewer('background', { ...model, timeoutMs: hang ? 100 : 3000 }, 'fixture', repo)
    assert.equal(background.status, hang ? 'timed_out' : 'completed')
    await new Promise(wait => setTimeout(wait, 700))
    assert.equal(existsSync(lateMarker), false, 'Reviewer descendant outlived its invocation')
  }
  console.log('PASS: successful and timed-out reviewers cannot leave background children')

  for (const flag of ['--assume-unchanged', '--skip-worktree']) {
    for (const preexisting of [false, true]) {
      git('update-index', '--no-assume-unchanged', 'app.txt'); git('update-index', '--no-skip-worktree', 'app.txt')
      git('restore', '--source=HEAD', '--staged', '--worktree', 'app.txt')
      if (preexisting) git('update-index', flag, 'app.txt')
      writeFileSync(reviewerFile, `import {spawnSync} from 'node:child_process'; import {writeFileSync} from 'node:fs'; ${preexisting ? '' : `spawnSync('git',['update-index',${JSON.stringify(flag)},'app.txt']);`} writeFileSync('app.txt','hidden reviewer mutation\\n'); process.stdout.write(JSON.stringify({verdict:'approve',findings:[],notes:[]}));`)
      const hidden = await h.invokeReviewerWithRetries('hidden', model, 'fixture', repo, {maxAttempts:3})
      assert.equal(hidden.status, 'failed', `${flag} concealed tracked-file mutation`)
      assert.equal(hidden.containmentFailure, true)
      assert.equal(hidden.attempts, 1)
    }
  }
  git('update-index', '--no-assume-unchanged', 'app.txt'); git('update-index', '--no-skip-worktree', 'app.txt')
  git('restore', '--source=HEAD', '--staged', '--worktree', 'app.txt')
  writeFileSync(reviewerFile, `import {spawnSync} from 'node:child_process'; spawnSync('git',['update-index','--assume-unchanged','app.txt']); process.stdout.write(JSON.stringify({verdict:'approve',findings:[],notes:[]}));`)
  const flagsOnly = await h.runCommandReviewer('index-flags', model, 'fixture', repo)
  assert.equal(flagsOnly.status, 'failed', 'Index flag changes must be detected even without content changes')
  git('update-index', '--no-assume-unchanged', 'app.txt')
  writeFileSync(join(repo, 'app.txt'), 'unreviewed content\n')
  console.log('PASS: index flags cannot hide tracked reviewer writes or index-only mutations')

  writeFileSync(kimiBinary, `#!/usr/bin/env node\nif (process.argv.includes('--version')) { process.stdout.write('fixture 1.0'); process.exit(0) } process.stdout.write(JSON.stringify({verdict:'approve',findings:[],notes:[]})); process.exit(7);`)
  process.env.FIXTURE_KIMI = kimiBinary
  const failedPreset = await h.invokeReviewerWithRetries('kimi', { adapter:'preset',preset:'kimi-subscription',model:'fixture',binaryEnv:'FIXTURE_KIMI',timeoutMs:3000 }, 'fixture', repo, {maxAttempts:1})
  assert.equal(failedPreset.status, 'failed', 'A nonzero Kimi exit cannot be a completed review')
  delete process.env.FIXTURE_KIMI

  const before = h.captureGitState(repo)
  git('update-ref', 'refs/security-probe/custom', 'HEAD')
  assert.notDeepEqual(h.captureGitState(repo), before)
  git('update-ref', '-d', 'refs/security-probe/custom')
  const originalHead = git('rev-parse', 'HEAD')
  git('add', 'app.txt')
  const replacement = git('commit-tree', git('write-tree'), '-m', 'replacement fixture')
  git('update-ref', `refs/replace/${originalHead}`, replacement)
  assert.notDeepEqual(h.captureGitState(repo), before)
  assert.match(h.buildWorktreeDiff(repo), /unreviewed content/)
  git('update-ref', '-d', `refs/replace/${originalHead}`)
  for (const path of ['../escape', '/absolute', '.git/config', 'nested/.git/config']) assert.throws(() => h.validateStagePath(repo, path))
  console.log('PASS: custom/replace refs, truthful diffs, traversal and Git-metadata rejection')

  const ledgerDir = join(fixture, 'ledger'); mkdirSync(ledgerDir)
  const ledger = { packet: { allowedPaths: ['allowed.txt'] }, policy: { budgets: { maxWorkerInvocations: 1, maxReviewInputBytes: 100000 } }, usage: { workerInvocations: 0, reviewInputBytes: 0 } }
  writeFileSync(workerFile, `import {writeFileSync} from 'node:fs'; import {join} from 'node:path'; writeFileSync(join(process.env.OM_HARNESS_WORKTREE,'outside.txt'),'outside lease'); writeFileSync(join(process.env.OM_HARNESS_WORKTREE,'allowed.txt'),'allowed');`)
  const scoped = await h.invokeScopedPacketWorker({ ledger, ledgerPath: join(ledgerDir, 'ledger.json'), config: { agentHarness: { models: { fixture: { ...model, commands: { worker: [process.execPath, workerFile] } } } } }, worktree: repo, id: 'fixture', role: 'worker', prompt: 'fixture' })
  assert.equal(scoped.invocation.status, 'failed'); assert.match(scoped.invocation.error, /outside its lease/)
  rmSync(join(repo, 'outside.txt')); rmSync(join(repo, 'allowed.txt'))
  const claims = join(repo, '.git', 'om-harness', 'claims'); mkdirSync(claims, { recursive: true })
  const malformed = join(claims, 'malformed.json'); writeFileSync(malformed, JSON.stringify({ version: 1, packetId: 'bad' }))
  assert.throws(() => h.acquirePacketLeases(repo, { id: 'new', allowedPaths: ['src'] }), /invalid lease fields/)
  rmSync(malformed)
  h.acquirePacketLeases(repo, { id: 'same-id', allowedPaths: ['src'] })
  assert.throws(() => h.acquirePacketLeases(repo, { id: 'same-id', allowedPaths: ['src/nested'] }), /overlaps active lease/)
  console.log('PASS: out-of-lease worker writes and corrupt/same-id lease exclusion')

  writeFileSync(join(repo, '.om-freeze-tests'), JSON.stringify(['custom-regression.fixture']))
  for (const path of ['test_bug.py', 'handler_test.go', 'tests/example.rs', 'src/test/ExampleTest.java', 'foo_spec.rb', 'example.test.js', 'test.ipynb', 'custom-regression.fixture']) {
    run(process.execPath, [hooks, 'freeze'], 2, JSON.stringify({ cwd: repo, tool_input: { file_path: path } }))
  }
  run(process.execPath, [hooks, 'freeze'], 2, JSON.stringify({ cwd: repo, tool_input: { notebook_path: 'test.ipynb' } }))
  run(process.execPath, [hooks, 'freeze'], 2, JSON.stringify({ cwd: repo, tool_input: { edits: [{ file_path: 'app.txt' }, { file_path: 'test_bug.py' }] } }))
  run(process.execPath, [hooks, 'freeze'], 0, JSON.stringify({ cwd: repo, tool_input: { file_path: 'app.txt' } }))
  for (const command of ['git push', 'git -C repo push', 'git \\\npush', 'gh pr create', 'gh pr merge', 'gh api -X POST repos/a/b/pulls', 'glab mr create', 'bash -c "git push"', 'git "push"']) {
    run(process.execPath, [hooks, 'block'], 2, JSON.stringify({ tool_input: { command } }))
  }
  run(process.execPath, [hooks, 'block'], 0, JSON.stringify({ tool_input: { command: 'git log --grep push' } }))
  run(process.execPath, [hooks, 'block'], 0, JSON.stringify({ tool_input: { command: 'gh api repos/a/b/pulls' } }))
  run(process.execPath, [hooks, 'block'], 2, JSON.stringify({ tool_input: { command: 'gh api repos/a/b/pulls --input payload.json' } }))
  run(process.execPath, [hooks, 'block'], 0, JSON.stringify({ tool_input: { command: 'node harness.mjs capture --worktree "$WORKTREE"' } }))
  run(process.execPath, [hooks, 'block'], 2, JSON.stringify({ tool_input: { command: '$GIT_BINARY push' } }))
  run(process.execPath, [hooks, 'block'], 2, '{broken')
  rmSync(join(repo, '.om-freeze-tests'))
  console.log('PASS: multilingual/manifest test freeze, multi-edit and publication guards')

  assert.deepEqual(h.extractJson('log\n{"notes":["a } brace"],"nested":{"x":1}}\nlog'), { notes: ['a } brace'], nested: { x: 1 } })
  assert.throws(() => h.extractJson('{}\n{}'), /Ambiguous/)
  assert.throws(() => h.extractJson('{'.repeat(200000)), /No valid JSON/)
  const config = join(fixture, 'config.json'), evidence = join(fixture, 'evidence.json'), paths = join(fixture, 'paths.txt'), packet = join(fixture, 'packet.json'), host = join(fixture, 'host.json'), start = join(fixture, 'start.json')
  writeFileSync(config, '{}'); writeFileSync(paths, 'app.txt\n')
  writeFileSync(evidence, JSON.stringify({ version: 1, status: 'passed', reason: null, checks: [{ command: ['fixture'], status: 'passed', exitCode: 0, evidence: 'Synthetic test evidence' }] }))
  cli(['capture', '--worktree', repo, '--output', start])
  const prepared = JSON.parse(cli(['prepare-review', '--config', config, '--worktree', repo, '--kind', 'implementation', '--paths-file', paths, '--validation-evidence', evidence, '--output', packet]))
  const contract = { name: 'om-code-review', version: 1, rubricSha256: prepared.rubricSha256, packetSha256: prepared.packetSha256, subjectSha256: prepared.subjectSha256, subjectKind: 'implementation' }
  const attestation = { version: 1, reviewer: { id: 'claude', family: 'anthropic', requestedModel: 'fixture', actualModel: null, provider: 'fixture', provenanceStatus: 'unverified', fallbackReason: null }, freshContext: true, implementationContextInherited: false, contract, validationGate: JSON.parse(readFileSync(packet)).validationGate, status: 'completed', durationMs: 1, review: { verdict: 'approve', findings: [], notes: [] } }
  writeFileSync(host, '{')
  const completed = h.waitForFreshReviewArtifact(host, contract, 2000)
  setTimeout(() => writeFileSync(host, JSON.stringify(attestation)), 25)
  await completed
  const args = ['stage', '--worktree', repo, '--start-state', start, '--paths-file', paths, '--review-packet', packet, '--host-review', host]
  const approvedPacket = readFileSync(packet, 'utf8')
  const approvedHost = JSON.stringify(attestation)
  const failedGate = { status: 'failed', reason: 'Synthetic failing test', checks: [{ command: ['fixture'], status: 'failed', exitCode: 1, evidence: 'Observed test failure' }] }
  const packetWithFailedGate = JSON.parse(approvedPacket)
  packetWithFailedGate.validationGate = failedGate
  writeFileSync(packet, JSON.stringify(packetWithFailedGate))
  writeFileSync(host, JSON.stringify({ ...attestation, contract: { ...contract, packetSha256: digest(readFileSync(packet, 'utf8')) } }))
  cli(args, 1)
  writeFileSync(packet, approvedPacket)
  writeFileSync(host, JSON.stringify({ ...attestation, validationGate: failedGate }))
  cli(args, 1)
  const failedHostReview = await h.waitForFreshReviewArtifact(host, contract, 1000)
  assert.equal(failedHostReview.review.verdict, 'request_changes')
  for (const exitCode of [1, null]) {
    const invalidGate = { version: 1, status: 'passed', reason: null, checks: [{ command: ['fixture'], status: 'passed', exitCode, evidence: 'Incorrect success claim' }] }
    writeFileSync(evidence, JSON.stringify(invalidGate))
    cli(['prepare-review', '--config', config, '--worktree', repo, '--kind', 'implementation', '--paths-file', paths, '--validation-evidence', evidence, '--output', packet], 1)
    writeFileSync(host, JSON.stringify({ ...attestation, validationGate: { ...invalidGate, version: undefined } }))
    cli(args, 1)
  }
  writeFileSync(host, approvedHost)
  console.log('PASS: failed packet/host gates and nonzero or missing successful exit codes cannot stage')
  writeFileSync(join(repo, 'app.txt'), 'changed after review\n')
  cli(args, 1)
  writeFileSync(join(repo, 'app.txt'), 'unreviewed content\n')
  const staged = JSON.parse(cli(args)); assert.equal(staged.status, 'ready')
  console.log('PASS: incremental fresh-review writes and exact reviewed-content staging without provider config')

  let observed
  let responseFailures = 0
  let issuedRequests = 0
  server = createServer((request, response) => {
    let body = ''; request.on('data', chunk => { body += chunk }); request.on('end', () => {
      issuedRequests += 1
      observed = { authorization: request.headers.authorization, body: JSON.parse(body) }
      if (responseFailures > 0) { responseFailures -= 1; response.writeHead(503); response.end('{}'); return }
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify({ model: 'observed-fixture', choices: [{ message: { content: JSON.stringify({ version: 1, verdict: 'approve', findings: [], notes: [] }) } }] }))
    })
  })
  await new Promise(resolveServer => server.listen(0, '127.0.0.1', resolveServer))
  process.env.FIXTURE_REVIEW_KEY = 'synthetic-http-key'
  const httpReview = await h.runHttpReviewer('fixture', { endpoint: `http://127.0.0.1:${server.address().port}/chat/completions`, model: 'requested-fixture', credentialEnv: 'FIXTURE_REVIEW_KEY' }, 'fixture prompt', 3000)
  assert.equal(httpReview.status, 'completed'); assert.equal(httpReview.actualModel, 'observed-fixture')
  assert.equal(observed.authorization, 'Bearer synthetic-http-key'); assert.equal(observed.body.messages[0].content, 'fixture prompt')
  console.log('PASS: generic OpenAI-compatible HTTP adapter with observed provenance')
  for (const cap of [1, 2]) {
    responseFailures = 1
    const initialRequests = issuedRequests
    let reservations = 0
    const charge = () => {
      if (reservations === cap) { const error = new Error('Packet reviewer invocation budget exceeded'); error.budgetExhausted = true; throw error }
      reservations += 1
    }
    const retriedHttp = await h.invokeReviewerWithRetries('fixture', { adapter: 'openai-compatible', endpoint: `http://127.0.0.1:${server.address().port}/chat/completions`, model: 'requested-fixture', credentialEnv: 'FIXTURE_REVIEW_KEY' }, 'fixture prompt', repo, { maxAttempts: 3 }, charge)
    assert.equal(issuedRequests - initialRequests, cap, 'HTTP retries must reserve budget before issuing a second request')
    assert.equal(reservations, cap)
    assert.equal(retriedHttp.status, cap === 1 ? 'failed' : 'completed')
    if (cap === 1) assert.equal(retriedHttp.budgetExhausted, true)
  }
  console.log('PASS: internal HTTP retries honor and account for the invocation budget')
} finally {
  if (server) await new Promise(resolveClose => server.close(resolveClose))
  process.env = originalEnv
  rmSync(fixture, { recursive: true, force: true })
}
await import('./test-agent-harness-concurrency.mjs')
console.log('Agent harness security regressions passed.')
