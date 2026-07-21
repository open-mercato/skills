#!/usr/bin/env node

import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { chmodSync, cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const HARNESS = join(ROOT, 'skills/om-harness/scripts/harness.mjs')
const BUNDLED_TEMPLATE = join(ROOT, 'skills/om-setup-agent-harness/references/configuration-template.json')
const TEMP = mkdtempSync(join(tmpdir(), 'om harness test '))
const REPO = join(TEMP, 'repo with spaces')
const CONFIG = join(TEMP, 'agentic.config.json')
const INPUT = join(TEMP, 'harness-input.json')
const AUTH_FILE = join(TEMP, 'opencode-auth.json')

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8'
  })
  const expected = options.expected ?? 0
  assert.equal(result.status, expected, `${command} ${args.join(' ')}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`)
  return result
}

function git(args) {
  return run('git', args, { cwd: REPO }).stdout.trim()
}

mkdirSync(REPO, { recursive: true })
git(['init'])
git(['config', 'user.email', 'harness@example.invalid'])
git(['config', 'user.name', 'Harness Test'])
writeFileSync(join(REPO, 'tracked.txt'), 'base\n')
writeFileSync(join(REPO, 'AGENTS.md'), '# Test instructions\n\nKeep changes bounded.\n')
writeFileSync(join(REPO, 'CODE_REVIEW.md'), '# Test review rules\n\nRequire explicit boundary evidence.\n')
git(['add', 'tracked.txt', 'AGENTS.md', 'CODE_REVIEW.md'])
git(['commit', '-m', 'test: baseline'])
const startHead = git(['rev-parse', 'HEAD'])
const startState = join(TEMP, 'start-state.json')

const reviewer = join(TEMP, 'fake-reviewer.mjs')
writeFileSync(reviewer, `
import { readFileSync, writeFileSync } from 'node:fs'
const model = process.env.OM_HARNESS_MODEL || ''
const prompt = readFileSync(process.env.OM_HARNESS_PROMPT_FILE, 'utf8')
if (!prompt.includes('<trusted_rubric>') || !prompt.includes('# Code Review Checklist') || !prompt.includes('Verdict Rule')) {
  process.stderr.write('missing real om-code-review rubric')
  process.exit(9)
}
const packetCandidate = {
  fingerprint: 'packet-boundary',
  severity: 'major',
  category: 'correctness',
  title: 'Packet boundary is not fixed',
  location: { path: 'packet.txt', line: 1, symbol: null },
  evidence: 'The packet still contains packet output.',
  impact: 'The acceptance criterion is not met.',
  remediation: 'Replace it with fixed packet output.',
  confidence: 0.95
}
const isPacket = prompt.includes('"id": "packet-one"')
const isVerification = prompt.includes('fresh finding-verification pass')
let findings = model === 'alpha-model' && !isPacket ? [{
  severity: 'major',
  category: 'correctness',
  title: 'Incorrect boundary condition',
  location: { path: 'tracked.txt', line: 1, symbol: null },
  evidence: 'The boundary is not handled.',
  impact: 'A realistic request fails.',
  remediation: 'Handle the boundary explicitly.',
  confidence: 0.9
}] : []
if (isPacket && !isVerification && model === 'beta-model' && prompt.includes('+packet output') && !prompt.includes('+fixed packet output')) findings = [packetCandidate]
if (isPacket && isVerification && model === 'delta-model' && prompt.includes('packet-boundary') && prompt.includes('+packet output') && !prompt.includes('+fixed packet output')) findings = [packetCandidate]
writeFileSync(process.env.OM_HARNESS_METADATA_FILE, JSON.stringify({ actualModel: model, provider: 'fake-provider', fallbackReason: null }))
process.stdout.write(JSON.stringify({ verdict: findings.length ? 'request_changes' : 'approve', findings, notes: [prompt.includes('worker.txt') ? 'includes-worker' : 'no-worker', 'secret=' + Boolean(process.env.GITHUB_TOKEN)] }))
`)

const worker = join(TEMP, 'codex')
writeFileSync(worker, `#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const prompt = readFileSync(process.env.OM_HARNESS_PROMPT_FILE, 'utf8')
const isPacket = prompt.includes('"id": "packet-one"')
const isFixer = prompt.includes('fresh fixer')
const target = isPacket ? 'packet.txt' : 'worker.txt'
const content = isPacket ? (isFixer ? 'fixed packet output\\n' : 'packet output\\n') : 'worker output\\n'
writeFileSync(join(process.env.OM_HARNESS_WORKTREE, target), content)
writeFileSync(process.env.OM_HARNESS_METADATA_FILE, JSON.stringify({ actualModel: process.env.OM_HARNESS_MODEL, provider: 'fake-provider', fallbackReason: null }))
process.stdout.write('worker complete secret=' + Boolean(process.env.GITHUB_TOKEN))
`)
chmodSync(worker, 0o755)

const invalidReviewer = join(TEMP, 'invalid-reviewer.mjs')
writeFileSync(invalidReviewer, `process.stdout.write(JSON.stringify({ verdict: 'approve' }))\n`)

const mismatchedReviewer = join(TEMP, 'mismatched-reviewer.mjs')
writeFileSync(mismatchedReviewer, `process.stdout.write(JSON.stringify({ verdict: 'approve', findings: [{
  severity: 'major', category: 'correctness', title: 'Mislabeled blocker',
  location: { path: 'tracked.txt', line: 1, symbol: null },
  evidence: 'A major defect the model labeled approve.', impact: 'Real.', remediation: 'Fix it.', confidence: 0.8
}], notes: ['mismatch-smoke'] }))\n`)

const fakeKimi = join(TEMP, 'fake-kimi')
writeFileSync(fakeKimi, `#!/usr/bin/env node
import { readFileSync } from 'node:fs'
if (process.argv.includes('--version')) { process.stdout.write('kimi-test 1.0'); process.exit(0) }
const agentIndex = process.argv.indexOf('--agent-file')
const agent = agentIndex >= 0 ? readFileSync(process.argv[agentIndex + 1], 'utf8') : ''
const toolsDisabled = /tools:\\s*\\[\\]/.test(agent)
if (process.argv.includes('--prompt')) { process.stderr.write('prompt must arrive on stdin, not argv'); process.exit(9) }
if (!process.argv.includes('--input-format')) { process.stderr.write('stdin delivery requires --input-format'); process.exit(9) }
const prompt = readFileSync(0, 'utf8')
if (!prompt.includes('<trusted_rubric>') || !prompt.includes('# Code Review Checklist')) process.exit(9)
process.stdout.write(JSON.stringify({ verdict: 'approve', findings: [], notes: [toolsDisabled ? 'kimi-tools-disabled' : 'kimi-tools-enabled'] }))
`)
chmodSync(fakeKimi, 0o755)

const epipeReviewer = join(TEMP, 'epipe-reviewer.mjs')
writeFileSync(epipeReviewer, `process.stdout.write(JSON.stringify({ verdict: 'approve' }))\nprocess.exit(0)\n`)

const rogueReviewer = join(TEMP, 'rogue-reviewer.mjs')
writeFileSync(rogueReviewer, `
import { spawnSync } from 'node:child_process'
spawnSync('git', ['commit', '--allow-empty', '-m', 'rogue reviewer commit'], { cwd: process.env.OM_HARNESS_WORKTREE })
process.stdout.write(JSON.stringify({ verdict: 'approve', findings: [], notes: [] }))
`)

const portFile = join(TEMP, 'mock-port.txt')
const mockServerFile = join(TEMP, 'mock-provider.mjs')
writeFileSync(mockServerFile, `
import { writeFileSync } from 'node:fs'
import http from 'node:http'
let flaked = false
const server = http.createServer((request, response) => {
  let raw = ''
  request.on('data', (chunk) => { raw += chunk })
  request.on('end', () => {
    const body = JSON.parse(raw)
    const prompt = body.messages?.[0]?.content || ''
    if (prompt.includes('FLAKY-503') && !flaked) {
      flaked = true
      response.writeHead(503, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ error: 'transient upstream error' }))
      return
    }
    if (!prompt.includes('<trusted_rubric>') || !prompt.includes('# Code Review Checklist')) {
      response.writeHead(422, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ error: 'missing real om-code-review rubric' }))
      return
    }
    const review = { verdict: 'approve', findings: [], notes: ['preset:' + body.model] }
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ model: body.model, choices: [{ message: { content: JSON.stringify(review) } }] }))
  })
})
server.listen(0, '127.0.0.1', () => writeFileSync(${JSON.stringify(portFile)}, String(server.address().port)))
setTimeout(() => server.close(), 120000).unref()
`)
const mockServer = spawn(process.execPath, [mockServerFile], { stdio: 'ignore' })
process.on('exit', () => { if (!mockServer.killed) mockServer.kill() })
for (let attempt = 0; attempt < 200 && !existsSync(portFile); attempt += 1) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10)
assert.ok(existsSync(portFile), 'mock provider did not start')
const mockEndpoint = `http://127.0.0.1:${readFileSync(portFile, 'utf8')}/chat/completions`

const harnessConfig = {
  version: 1,
  host: 'claude',
  delivery: { mode: 'stage-only', issueClaim: 'hold' },
  models: {
    alpha: {
      adapter: 'command', family: 'family-alpha', model: 'alpha-model', roles: ['reviewer'], timeoutMs: 10000,
      commands: { probe: [process.execPath, '--version'], review: [process.execPath, reviewer] }
    },
    beta: {
      adapter: 'command', family: 'family-beta', model: 'beta-model', roles: ['reviewer'], timeoutMs: 10000,
      commands: { probe: [process.execPath, '--version'], review: [process.execPath, reviewer] }
    },
    gamma: {
      adapter: 'command', family: 'family-gamma', model: 'gamma-model', roles: ['reviewer'], timeoutMs: 10000,
      commands: { probe: [process.execPath, '--version'], review: [process.execPath, reviewer] }
    },
    delta: {
      adapter: 'command', family: 'family-delta', model: 'delta-model', roles: ['reviewer'], timeoutMs: 10000,
      commands: { probe: [process.execPath, '--version'], review: [process.execPath, reviewer] }
    },
    missing: {
      adapter: 'command', family: 'family-missing', model: 'missing-model', roles: ['reviewer'], timeoutMs: 1000,
      commands: { probe: ['missing-harness-command', '--version'], review: ['missing-harness-command'] }
    },
    invalid: {
      adapter: 'command', family: 'family-invalid', model: 'invalid-model', roles: ['reviewer'], timeoutMs: 10000,
      commands: { probe: [process.execPath, '--version'], review: [process.execPath, invalidReviewer] }
    },
    mismatched: {
      adapter: 'command', family: 'family-mismatched', model: 'mismatched-model', roles: ['reviewer'], timeoutMs: 10000,
      commands: { probe: [process.execPath, '--version'], review: [process.execPath, mismatchedReviewer] }
    },
    worker: {
      adapter: 'command', family: 'family-alpha', model: 'worker-model', reasoningEffort: 'xhigh', roles: ['worker'], timeoutMs: 10000,
      workerSecurity: { network: 'disabled', remoteWrites: 'disabled', refWrites: 'disabled', enforcedBy: 'codex-workspace-write-sandbox' },
      commands: {
        probe: [process.execPath, '--version'],
        worker: [worker, 'exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--config', 'model_reasoning_effort={reasoningEffort}', '--sandbox', 'workspace-write', '--cd', '{worktree}', '--model', '{model}', '-']
      }
    },
    deepseek: {
      adapter: 'preset', preset: 'deepseek-api', family: 'deepseek', model: 'deepseek-test', roles: ['reviewer'],
      endpoint: mockEndpoint, credentialEnv: 'TEST_DEEPSEEK_KEY', reasoningEffort: 'max', maxOutputTokens: 1024
    },
    kimi: {
      adapter: 'preset', preset: 'kimi-subscription', family: 'moonshot', model: 'kimi-test', roles: ['reviewer'],
      binaryEnv: 'TEST_KIMI_BIN', maxInputBytes: 180000
    },
    epipe: {
      adapter: 'command', family: 'family-epipe', model: 'epipe-model', roles: ['reviewer'], timeoutMs: 10000,
      commands: { probe: [process.execPath, '--version'], review: [process.execPath, epipeReviewer] }
    },
    rogue: {
      adapter: 'command', family: 'family-rogue', model: 'rogue-model', roles: ['reviewer'], timeoutMs: 10000,
      commands: { probe: [process.execPath, '--version'], review: [process.execPath, rogueReviewer] }
    },
    glm: {
      adapter: 'preset', preset: 'opencode-zen', family: 'zhipu', model: 'glm-test', roles: ['reviewer'],
      endpoint: mockEndpoint, credentialEnv: 'TEST_ZEN_KEY', reasoningEffort: 'max', maxOutputTokens: 1024
    },
    mimo: {
      adapter: 'preset', preset: 'opencode-zen', family: 'xiaomi', model: 'mimo-test', roles: ['reviewer'],
      endpoint: mockEndpoint, credentialEnv: 'TEST_ZEN_KEY', reasoningEffort: 'max', maxOutputTokens: 1024
    }
  },
  profiles: {
    standard: { workers: [], reviewers: [], reviewPolicy: { mode: 'advisory' } },
    optimized: { workers: ['worker'], reviewers: [], reviewPolicy: { mode: 'advisory' } },
    multi: {
      workers: [], reviewers: ['alpha', 'beta', 'missing'], maxParallel: 3, maxInputBytes: 1024,
      reviewPolicy: { mode: 'quorum', minimumSuccessful: 2, minimumFamilies: 2 }
    },
    'multi-optimized': {
      workers: ['worker'], reviewers: ['alpha', 'beta'], maxParallel: 2,
      reviewPolicy: { mode: 'quorum', minimumSuccessful: 2, minimumFamilies: 2 }
    },
    invalid: { workers: [], reviewers: ['invalid'], reviewPolicy: { mode: 'advisory' } },
    'strict-retry': {
      workers: [], reviewers: ['invalid'],
      retry: { maxAttempts: 2, backoffMs: 10, backoffMultiplier: 1, timeoutEscalation: 1, maxTimeoutMs: 5000 },
      reviewPolicy: { mode: 'all-required', requiredReviewers: ['invalid'] }
    },
    'kimi-only': { workers: [], reviewers: ['kimi'], reviewPolicy: { mode: 'advisory' } },
    flaky: { workers: [], reviewers: ['deepseek'], reviewPolicy: { mode: 'advisory' } },
    mismatched: { workers: [], reviewers: ['mismatched'], reviewPolicy: { mode: 'advisory' } },
    epipe: { workers: [], reviewers: ['epipe'], reviewPolicy: { mode: 'advisory' } },
    rogue: { workers: [], reviewers: ['rogue'], reviewPolicy: { mode: 'advisory' } },
    impossible: {
      workers: [], reviewers: ['alpha', 'missing'],
      reviewPolicy: { mode: 'quorum', minimumSuccessful: 2, minimumFamilies: 2 }
    },
    untracked: { workers: [], reviewers: ['alpha'], reviewPolicy: { mode: 'advisory' } },
    presets: {
      workers: [], reviewers: ['deepseek', 'kimi', 'glm', 'mimo'], maxParallel: 4,
      reviewPolicy: { mode: 'quorum', minimumSuccessful: 4, minimumFamilies: 4 }
    },
    'high-assurance': {
      workers: ['worker'], reviewers: ['beta', 'gamma', 'delta', 'alpha'], maxParallel: 4, maxInputBytes: 700000,
      reviewPolicy: { mode: 'quorum', minimumSuccessful: 2, minimumFamilies: 2 },
      concurrency: { reviewers: 3 },
      packetPolicy: {
        mode: 'adversarial',
        reviewersByRisk: { low: 1, medium: 1, high: 2, critical: 2 },
        minimumFamiliesByRisk: { low: 1, medium: 1, high: 2, critical: 2 },
        verificationReviewers: 1,
        lenses: ['behavioral correctness', 'security and compatibility'],
        separateFixer: true,
        maxFixCycles: 2,
        blockingSeverities: ['blocker', 'major'],
        budgets: { maxWorkerInvocations: 1, maxReviewerInvocations: 9, maxFixerInvocations: 2, maxReviewInputBytes: 6300000 }
      }
    }
  }
}

writeFileSync(CONFIG, `${JSON.stringify({ version: 1, preserved: { value: true } }, null, 2)}\n`)
writeFileSync(INPUT, `${JSON.stringify(harnessConfig, null, 2)}\n`)
run(process.execPath, [HARNESS, 'configure', '--config', CONFIG, '--input', INPUT])
const configured = JSON.parse(readFileSync(CONFIG, 'utf8'))
assert.deepEqual(configured.preserved, { value: true })
assert.equal(configured.agentHarness.delivery.mode, 'stage-only')

const bundled = JSON.parse(readFileSync(BUNDLED_TEMPLATE, 'utf8'))
assert.deepEqual(Object.keys(bundled.models), ['codex', 'deepseek', 'kimi', 'glm', 'mimo'])
assert.deepEqual(bundled.profiles.multi.reviewers, ['codex', 'deepseek', 'kimi', 'glm', 'mimo'])
assert.equal(bundled.models.codex.model, 'gpt-5.6-sol')
assert.equal(bundled.models.codex.reasoningEffort, 'xhigh')
assert.equal(bundled.models.kimi.model, 'kimi-code/k3')
assert.equal(bundled.profiles['high-assurance'].packetPolicy.reviewersByRisk.high, 2)
const bundledConfig = join(TEMP, 'bundled-config.json')
writeFileSync(bundledConfig, `${JSON.stringify({ agentHarness: bundled }, null, 2)}\n`)
run(process.execPath, [HARNESS, 'validate-config', '--config', bundledConfig])
writeFileSync(AUTH_FILE, `${JSON.stringify({ deepseek: { type: 'api', key: 'test-deepseek' }, opencode: { type: 'api', key: 'test-zen' } }, null, 2)}\n`)
const bundledProbe = JSON.parse(run(process.execPath, [HARNESS, 'probe', '--config', bundledConfig, '--profile', 'multi', '--worktree', REPO], { env: { OPENCODE_AUTH_FILE: AUTH_FILE, OM_KIMI_BIN: fakeKimi } }).stdout)
for (const id of ['deepseek', 'kimi', 'glm', 'mimo']) assert.equal(bundledProbe.find((row) => row.id === id).status, 'ready')
assert.match(bundledProbe.find((row) => row.id === 'deepseek').note, /OpenCode auth provider deepseek/)

run(process.execPath, [HARNESS, 'validate-config', '--config', CONFIG])
const resolved = JSON.parse(run(process.execPath, [HARNESS, 'resolve-profile', '--config', CONFIG, '--profile', 'multi']).stdout)
assert.deepEqual(resolved.reviewers, ['alpha', 'beta', 'missing'])

const invalid = join(TEMP, 'invalid.json')
writeFileSync(invalid, `${JSON.stringify({ ...configured, agentHarness: { ...configured.agentHarness, delivery: { mode: 'publish' } } }, null, 2)}\n`)
const invalidResult = run(process.execPath, [HARNESS, 'validate-config', '--config', invalid], { expected: 1 })
assert.match(invalidResult.stderr, /stage-only/)

const unsafeWorker = join(TEMP, 'unsafe-worker.json')
const unsafeConfig = structuredClone(configured)
unsafeConfig.agentHarness.models.worker.workerSecurity.enforcedBy = 'self-attested-sandbox'
writeFileSync(unsafeWorker, `${JSON.stringify(unsafeConfig, null, 2)}\n`)
const unsafeResult = run(process.execPath, [HARNESS, 'validate-config', '--config', unsafeWorker], { expected: 1 })
assert.match(unsafeResult.stderr, /unsupported enforcement adapter/)

for (const [name, extra] of [['equals-option', '--add-dir=/tmp'], ['duplicate-option', '--ephemeral']]) {
  const unsafeArgsPath = join(TEMP, `${name}.json`)
  const unsafeArgs = structuredClone(configured)
  unsafeArgs.agentHarness.models.worker.commands.worker.splice(-1, 0, extra)
  writeFileSync(unsafeArgsPath, `${JSON.stringify(unsafeArgs, null, 2)}\n`)
  const unsafeArgsResult = run(process.execPath, [HARNESS, 'validate-config', '--config', unsafeArgsPath], { expected: 1 })
  assert.match(unsafeArgsResult.stderr, /exact audited codex exec adapter command/)
}

const probe = run(process.execPath, [HARNESS, 'probe', '--config', CONFIG, '--profile', 'multi', '--worktree', REPO])
const probeRows = JSON.parse(probe.stdout)
assert.equal(probeRows.filter((row) => row.status === 'ready').length, 2)
assert.equal(probeRows.find((row) => row.id === 'missing').status, 'missing')
const impossibleProbe = run(process.execPath, [HARNESS, 'probe', '--config', CONFIG, '--profile', 'impossible', '--worktree', REPO], { expected: 2 })
assert.match(impossibleProbe.stderr, /om-setup-agent-harness/)
const unknownProfile = run(process.execPath, [HARNESS, 'resolve-profile', '--config', CONFIG, '--profile', 'not-configured'], { expected: 1 })
assert.match(unknownProfile.stderr, /Unknown profile: not-configured; run om-setup-agent-harness/)
const noHarnessConfig = join(TEMP, 'no-harness.json')
writeFileSync(noHarnessConfig, `${JSON.stringify({ version: 1 }, null, 2)}\n`)
const missingHarness = run(process.execPath, [HARNESS, 'validate-config', '--config', noHarnessConfig], { expected: 1 })
assert.match(missingHarness.stderr, /run om-setup-agent-harness/)
const presetEnv = { TEST_DEEPSEEK_KEY: 'test-deepseek', TEST_ZEN_KEY: 'test-zen', TEST_KIMI_BIN: fakeKimi }
const presetProbe = JSON.parse(run(process.execPath, [HARNESS, 'probe', '--config', CONFIG, '--profile', 'presets', '--worktree', REPO], { env: presetEnv }).stdout)
assert.equal(presetProbe.filter((row) => row.status === 'ready').length, 4)

run(process.execPath, [HARNESS, 'capture', '--worktree', REPO, '--output', startState])

const promptFile = join(TEMP, 'worker-prompt.md')
writeFileSync(promptFile, 'Edit only worker.txt and create no commit.')
const workerResult = JSON.parse(run(process.execPath, [HARNESS, 'worker', '--config', CONFIG, '--profile', 'optimized', '--worktree', REPO, '--prompt-file', promptFile], { env: { GITHUB_TOKEN: 'must-not-reach-worker' } }).stdout)
assert.equal(workerResult.status, 'completed')
assert.equal(workerResult.actualModel, 'worker-model')
assert.match(workerResult.output, /secret=false/)
assert.equal(readFileSync(join(REPO, 'worker.txt'), 'utf8'), 'worker output\n')

const untrackedDir = join(TEMP, 'untracked review artifacts')
const reviewPaths = join(TEMP, 'review-paths.txt')
writeFileSync(reviewPaths, 'worker.txt\n')
run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'untracked', '--worktree', REPO, '--paths-file', reviewPaths, '--output-dir', untrackedDir], { env: { GITHUB_TOKEN: 'must-not-reach-reviewer' } })
const untrackedReview = JSON.parse(readFileSync(join(untrackedDir, 'review-result.json'), 'utf8'))
assert.deepEqual(untrackedReview.reviewers[0].review.notes, ['includes-worker', 'secret=false'])
assert.equal(untrackedReview.reviewers[0].actualModel, 'alpha-model')
assert.equal(untrackedReview.reviewers[0].provenanceStatus, 'observed')

const strictDir = join(TEMP, 'strict retry artifacts')
const strictRun = run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'strict-retry', '--worktree', REPO, '--paths-file', reviewPaths, '--output-dir', strictDir], { expected: 2 })
assert.match(strictRun.stderr, /attempt 1\/2/)
assert.match(strictRun.stderr, /after 2 attempt/)
assert.match(strictRun.stderr, /Council policy FAILED/)
const strictReview = JSON.parse(readFileSync(join(strictDir, 'review-result.json'), 'utf8'))
assert.equal(strictReview.verdict, null)
assert.equal(strictReview.policy.status, 'failed')
assert.equal(strictReview.reviewers[0].attempts, 2)

const unignoredDir = run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'untracked', '--worktree', REPO, '--paths-file', reviewPaths, '--output-dir', join(REPO, '.ai', 'qa', 'artifacts')], { expected: 1 })
assert.match(unignoredDir.stderr, /must be ignored by Git/)

const artifact = join(TEMP, 'review subject.md')
writeFileSync(artifact, `${'Review this bounded artifact.\n'.repeat(80)}`)
const presetDir = join(TEMP, 'preset review artifacts')
const presetRun = JSON.parse(run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'presets', '--worktree', REPO, '--artifact', artifact, '--output-dir', presetDir], { env: presetEnv }).stdout)
assert.equal(presetRun.status, 'satisfied')
const presetReview = JSON.parse(readFileSync(join(presetDir, 'review-result.json'), 'utf8'))
assert.equal(presetReview.reviewers.length, 4)
assert.ok(presetReview.reviewers.every((row) => row.status === 'completed'))
assert.deepEqual(presetReview.reviewers.find((row) => row.id === 'kimi').review.notes, ['kimi-tools-disabled'])
for (const id of ['deepseek', 'glm', 'mimo']) assert.deepEqual(presetReview.reviewers.find((row) => row.id === id).review.notes, [`preset:${id}-test`])

const bigArtifact = join(TEMP, 'big review subject.md')
writeFileSync(bigArtifact, 'This line pads the subject far beyond the Kimi argv budget.\n'.repeat(3400))
const kimiSplitDir = join(TEMP, 'kimi split artifacts')
const kimiSplit = JSON.parse(run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'kimi-only', '--worktree', REPO, '--artifact', bigArtifact, '--output-dir', kimiSplitDir], { env: presetEnv }).stdout)
assert.equal(kimiSplit.status, 'satisfied')
const kimiSplitReview = JSON.parse(readFileSync(join(kimiSplitDir, 'review-result.json'), 'utf8'))
assert.equal(kimiSplitReview.reviewers[0].status, 'completed')
assert.ok(kimiSplitReview.reviewers[0].parts > 1, 'kimi subject must split below the argv prompt limit')

const flakyArtifact = join(TEMP, 'flaky subject.md')
writeFileSync(flakyArtifact, 'FLAKY-503 marker: the first HTTP attempt fails with 503 and must be retried.\n')
const flakyDir = join(TEMP, 'flaky artifacts')
const flakyRun = JSON.parse(run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'flaky', '--worktree', REPO, '--artifact', flakyArtifact, '--output-dir', flakyDir], { env: presetEnv }).stdout)
assert.equal(flakyRun.status, 'satisfied')
assert.equal(JSON.parse(readFileSync(join(flakyDir, 'review-result.json'), 'utf8')).reviewers[0].status, 'completed')

const epipeDir = join(TEMP, 'epipe artifacts')
const epipeRun = JSON.parse(run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'epipe', '--worktree', REPO, '--artifact', bigArtifact, '--output-dir', epipeDir]).stdout)
assert.equal(epipeRun.status, 'degraded')
assert.equal(JSON.parse(readFileSync(join(epipeDir, 'review-result.json'), 'utf8')).reviewers[0].status, 'invalid')

const outputDir = join(TEMP, 'review artifacts')
const criteriaFile = join(TEMP, 'review-criteria.md')
const reviewPacket = join(TEMP, 'review-packet.json')
const hostReview = join(TEMP, 'fresh-claude-review.json')
writeFileSync(criteriaFile, 'Confirm the diagnosis and its proposed regression boundary.\n')
const prepared = JSON.parse(run(process.execPath, [HARNESS, 'prepare-review', '--config', CONFIG, '--worktree', REPO, '--kind', 'diagnosis', '--artifact', artifact, '--criteria-file', criteriaFile, '--output', reviewPacket]).stdout)
assert.equal(prepared.status, 'prepared')
assert.ok(prepared.contextFiles.includes('AGENTS.md'))
assert.ok(prepared.contextFiles.includes('CODE_REVIEW.md'))
const packet = JSON.parse(readFileSync(reviewPacket, 'utf8'))
assert.equal(packet.contract.name, 'om-code-review')
assert.equal(packet.subject.kind, 'diagnosis')
assert.equal(packet.validationGate.status, 'not_applicable')
writeFileSync(hostReview, `${JSON.stringify({
  version: 1,
  reviewer: {
    id: 'claude',
    family: 'anthropic',
    requestedModel: 'claude-test',
    actualModel: 'claude-test',
    provider: 'anthropic',
    provenanceStatus: 'observed',
    fallbackReason: null
  },
  freshContext: true,
  implementationContextInherited: false,
  contract: {
    name: 'om-code-review',
    version: 1,
    rubricSha256: prepared.rubricSha256,
    packetSha256: prepared.packetSha256,
    subjectSha256: prepared.subjectSha256,
    subjectKind: 'diagnosis'
  },
  validationGate: { status: 'not_applicable', reason: 'Diagnosis review occurs before implementation validation.', checks: [] },
  status: 'completed',
  durationMs: 12,
  review: { verdict: 'approve', findings: [], notes: ['fresh-claude-pass'] }
}, null, 2)}\n`)
const missingHost = run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'multi', '--worktree', REPO, '--artifact', artifact, '--review-packet', reviewPacket, '--output-dir', outputDir], { expected: 1 })
assert.match(missingHost.stderr, /--host-review/)
const staleHost = JSON.parse(readFileSync(hostReview, 'utf8'))
staleHost.freshContext = false
const staleHostPath = join(TEMP, 'stale-host-review.json')
writeFileSync(staleHostPath, `${JSON.stringify(staleHost, null, 2)}\n`)
const rejectedStaleHost = run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'multi', '--worktree', REPO, '--artifact', artifact, '--review-packet', reviewPacket, '--host-review', staleHostPath, '--output-dir', outputDir], { expected: 1 })
assert.match(rejectedStaleHost.stderr, /fresh context/)
const reviewRun = JSON.parse(run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'multi', '--worktree', REPO, '--artifact', artifact, '--review-packet', reviewPacket, '--host-review', hostReview, '--output-dir', outputDir]).stdout)
assert.equal(reviewRun.status, 'satisfied')
assert.equal(reviewRun.verdict, 'request_changes')
assert.equal(reviewRun.reviewers, 4)
assert.equal(reviewRun.providerReviewers, 3)
assert.equal(reviewRun.findings, 1)
const reviewJson = JSON.parse(readFileSync(join(outputDir, 'review-result.json'), 'utf8'))
assert.deepEqual(reviewJson.findings[0].raisedBy, ['alpha'])
assert.equal(reviewJson.reviewers[0].id, 'claude')
assert.equal(reviewJson.reviewers[0].freshContext, true)
assert.equal(reviewJson.reviewers[0].policyEligible, false)
assert.equal(reviewJson.reviewContract.packetSha256, prepared.packetSha256)
assert.ok(reviewJson.reviewers.every((row) => row.freshContext === true))
assert.ok(reviewJson.reviewers.every((row) => row.reviewContract.name === 'om-code-review'))
assert.equal(reviewJson.reviewers.find((row) => row.id === 'missing').status, 'skipped')
assert.ok(reviewJson.reviewers.find((row) => row.id === 'alpha').parts > 1)
const reviewMarkdown = readFileSync(join(outputDir, 'review-summary.md'), 'utf8')
assert.match(reviewMarkdown, /Reviewer status/)
assert.match(reviewMarkdown, /Findings by model/)
assert.match(reviewMarkdown, /om-code-review v1/)
assert.match(reviewMarkdown, /Verdict: \*\*request_changes\*\*/)
assert.match(reviewMarkdown, /claude/)
assert.match(reviewMarkdown, /fresh/)
assert.match(reviewMarkdown, /Fresh Claude validation gate/)
assert.match(reviewMarkdown, /●/)
assert.match(reviewMarkdown, /○/)

const delayedHostReview = join(TEMP, 'delayed-fresh-claude-review.json')
const delayedHostWriter = spawn(process.execPath, ['-e', `const { readFileSync, writeFileSync } = require('node:fs'); setTimeout(() => writeFileSync(${JSON.stringify(delayedHostReview)}, readFileSync(${JSON.stringify(hostReview)})), 150)`], { stdio: 'ignore' })
const parallelOutputDir = join(TEMP, 'parallel review artifacts')
const parallelReview = JSON.parse(run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'multi', '--worktree', REPO, '--artifact', artifact, '--review-packet', reviewPacket, '--host-review', delayedHostReview, '--host-review-timeout-ms', '5000', '--output-dir', parallelOutputDir]).stdout)
assert.equal(parallelReview.reviewers, 4)
if (!delayedHostWriter.killed) delayedHostWriter.kill()
const neverWrittenHost = join(TEMP, 'never-written-host-review.json')
const hostTimeout = run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'untracked', '--worktree', REPO, '--artifact', artifact, '--review-packet', reviewPacket, '--host-review', neverWrittenHost, '--host-review-timeout-ms', '20', '--output-dir', parallelOutputDir], { expected: 1 })
assert.match(hostTimeout.stderr, /Timed out waiting/)
assert.match(hostTimeout.stderr, /provider results preserved/)
const partialResult = JSON.parse(readFileSync(join(parallelOutputDir, 'review-result.partial.json'), 'utf8'))
assert.equal(partialResult.reviewers.length, 1)
assert.equal(partialResult.reviewers[0].id, 'alpha')
assert.match(partialResult.hostError, /Timed out waiting/)

const valuelessTimeout = run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'untracked', '--worktree', REPO, '--artifact', artifact, '--review-packet', reviewPacket, '--host-review', neverWrittenHost, '--host-review-timeout-ms', '--output-dir', parallelOutputDir], { expected: 1 })
assert.match(valuelessTimeout.stderr, /host-review-timeout-ms requires a numeric value/)

writeFileSync(artifact, 'changed after packet preparation\n')
const changedSubject = run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'multi', '--worktree', REPO, '--artifact', artifact, '--review-packet', reviewPacket, '--host-review', hostReview, '--output-dir', outputDir], { expected: 1 })
assert.match(changedSubject.stderr, /does not match/)
writeFileSync(artifact, `${'Review this bounded artifact.\n'.repeat(80)}`)

const implementationEvidence = join(TEMP, 'review-validation-evidence.json')
const implementationPacket = join(TEMP, 'implementation-review-packet.json')
const missingEvidence = run(process.execPath, [HARNESS, 'prepare-review', '--config', CONFIG, '--worktree', REPO, '--kind', 'implementation', '--paths-file', reviewPaths, '--output', implementationPacket], { expected: 1 })
assert.match(missingEvidence.stderr, /validation-evidence/)
writeFileSync(implementationEvidence, `${JSON.stringify({ version: 1, status: 'passed', reason: null, checks: [{ command: ['node', '--test'], status: 'passed', exitCode: 0, evidence: 'Observed passing test output.' }] }, null, 2)}\n`)
run(process.execPath, [HARNESS, 'prepare-review', '--config', CONFIG, '--worktree', REPO, '--kind', 'implementation', '--paths-file', reviewPaths, '--validation-evidence', implementationEvidence, '--output', implementationPacket])
assert.equal(JSON.parse(readFileSync(implementationPacket, 'utf8')).validationGate.status, 'passed')

const selfCheckDir = join(TEMP, 'self check artifacts')
const selfCheck = run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'multi-optimized', '--worktree', REPO, '--artifact', artifact, '--output-dir', selfCheckDir], { expected: 2 })
assert.equal(JSON.parse(selfCheck.stdout).status, 'failed')
assert.match(readFileSync(join(selfCheckDir, 'review-summary.md'), 'utf8'), /◐/)

const invalidDir = join(TEMP, 'invalid artifacts')
const invalidReview = JSON.parse(run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'invalid', '--worktree', REPO, '--artifact', artifact, '--output-dir', invalidDir]).stdout)
assert.equal(invalidReview.status, 'degraded')
assert.equal(JSON.parse(readFileSync(join(invalidDir, 'review-result.json'), 'utf8')).reviewers[0].status, 'invalid')

const mismatchDir = join(TEMP, 'mismatch artifacts')
const mismatchRun = JSON.parse(run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'mismatched', '--worktree', REPO, '--artifact', artifact, '--output-dir', mismatchDir]).stdout)
assert.equal(mismatchRun.verdict, 'request_changes')
const mismatchReview = JSON.parse(readFileSync(join(mismatchDir, 'review-result.json'), 'utf8'))
assert.equal(mismatchReview.reviewers[0].status, 'completed')
assert.ok(mismatchReview.reviewers[0].review.notes.some((note) => note.includes('verdict coerced from approve to request_changes')))

const packetRunDir = join(TEMP, 'packet runs')
const packetManifest = join(TEMP, 'packet-one.json')
writeFileSync(packetManifest, `${JSON.stringify({
  version: 1,
  id: 'packet-one',
  title: 'Implement the packet output',
  objective: 'Create the accepted packet output.',
  risk: 'high',
  allowedPaths: ['packet.txt'],
  invariants: ['Do not change Git refs.', 'Do not edit files outside packet.txt.'],
  acceptanceCriteria: ['packet.txt contains fixed packet output'],
  dependencies: [],
  nonGoals: ['Do not edit tracked.txt.'],
  referencePatterns: ['worker.txt']
}, null, 2)}\n`)
const packetRun = JSON.parse(run(process.execPath, [HARNESS, 'packet-run', '--config', CONFIG, '--profile', 'high-assurance', '--worktree', REPO, '--run-dir', packetRunDir, '--manifest', packetManifest]).stdout)
assert.equal(packetRun.status, 'awaiting_validation')
assert.equal(readFileSync(join(REPO, 'packet.txt'), 'utf8'), 'fixed packet output\n')
const packetLedger = JSON.parse(readFileSync(packetRun.ledgerPath, 'utf8'))
assert.equal(packetLedger.state, 'awaiting_validation')
assert.equal(packetLedger.leaseStatus, 'held')
assert.equal(packetLedger.reviewCycles.length, 2)
assert.equal(packetLedger.reviewCycles[0].reviewers.length, 2)
assert.equal(packetLedger.reviewCycles[0].verifiers[0].id, 'delta')
assert.equal(packetLedger.reviewCycles[0].verifiers[0].freshContext, true)
assert.equal(packetLedger.reviewCycles[0].findings[0].verification.status, 'verified')
assert.equal(packetLedger.reviewCycles[1].findings.length, 0)
assert.equal(packetLedger.fixes.length, 1)
assert.equal(packetLedger.fixes[0].separateContext, true)
assert.deepEqual(packetLedger.usage, { workerInvocations: 1, reviewerInvocations: 5, fixerInvocations: 1, reviewInputBytes: packetLedger.usage.reviewInputBytes })
assert.ok(packetLedger.usage.reviewInputBytes > 0)
const firstCycleMarkdown = readFileSync(join(packetRunDir, 'packets', 'packet-one', 'review-cycles', 'cycle-01.md'), 'utf8')
assert.match(firstCycleMarkdown, /verified \(delta\)/)
assert.match(firstCycleMarkdown, /Finding verifier status/)
assert.ok(existsSync(join(packetRunDir, 'packets', 'packet-one', 'worker-transcript-1.log')))
assert.ok(existsSync(join(packetRunDir, 'packets', 'packet-one', 'fixer-transcript-1.log')))
assert.equal(packetLedger.implementation.transcript, 'worker-transcript-1.log')

const sameDirRun = run(process.execPath, [HARNESS, 'packet-run', '--config', CONFIG, '--profile', 'high-assurance', '--worktree', REPO, '--run-dir', REPO, '--manifest', packetManifest], { expected: 1 })
assert.match(sameDirRun.stderr, /must not be the worktree root/)

const overlapManifest = join(TEMP, 'packet-two.json')
const secondPacketRunDir = join(TEMP, 'second packet runs')
writeFileSync(overlapManifest, `${JSON.stringify({
  version: 1,
  id: 'packet-two',
  title: 'Conflicting packet',
  objective: 'Prove path leases reject overlap.',
  risk: 'low',
  allowedPaths: ['packet.txt'],
  invariants: ['Do not change Git refs.'],
  acceptanceCriteria: ['packet.txt remains valid']
}, null, 2)}\n`)
const claimsDir = join(REPO, '.git', 'om-harness', 'claims')
const staleMutex = join(claimsDir, '.mutex')
writeFileSync(staleMutex, '{"pid":0}\n')
utimesSync(staleMutex, new Date(Date.now() - 120000), new Date(Date.now() - 120000))
const overlap = JSON.parse(run(process.execPath, [HARNESS, 'packet-run', '--config', CONFIG, '--profile', 'high-assurance', '--worktree', REPO, '--run-dir', secondPacketRunDir, '--manifest', overlapManifest], { expected: 2 }).stdout)
assert.equal(overlap.status, 'blocked')
assert.match(overlap.error, /overlaps active lease/)
assert.ok(!existsSync(staleMutex), 'stale mutex must be taken over and released')
const released = JSON.parse(run(process.execPath, [HARNESS, 'packet-release', '--run-dir', secondPacketRunDir, '--packet', 'packet-two', '--reason', 'lease conflict test complete']).stdout)
assert.equal(released.status, 'aborted')

const incompleteEvidence = join(TEMP, 'packet-incomplete-evidence.json')
writeFileSync(incompleteEvidence, `${JSON.stringify({ version: 1, packetId: 'packet-one', diffSha256: packetRun.diffSha256, status: 'passed', checks: [{ id: 'wrong', criteria: ['different criterion'], method: 'inspection', status: 'passed', evidence: 'not relevant' }] }, null, 2)}\n`)
const incompleteGate = run(process.execPath, [HARNESS, 'packet-gate', '--run-dir', packetRunDir, '--packet', 'packet-one', '--evidence', incompleteEvidence], { expected: 1 })
assert.match(incompleteGate.stderr, /does not cover acceptance criteria/)

const packetEvidence = join(TEMP, 'packet-evidence.json')
writeFileSync(packetEvidence, `${JSON.stringify({ version: 1, packetId: 'packet-one', diffSha256: packetRun.diffSha256, status: 'passed', checks: [{ id: 'content', criteria: ['packet.txt contains fixed packet output'], command: ['test', 'fixed packet output'], status: 'passed', exitCode: 0, evidence: 'Observed exact expected content.' }] }, null, 2)}\n`)
writeFileSync(join(REPO, 'packet.txt'), 'drifted after review\n')
const driftedGate = run(process.execPath, [HARNESS, 'packet-gate', '--run-dir', packetRunDir, '--packet', 'packet-one', '--evidence', packetEvidence], { expected: 1 })
assert.match(driftedGate.stderr, /diff changed after review/)
writeFileSync(join(REPO, 'packet.txt'), 'fixed packet output\n')
const gated = JSON.parse(run(process.execPath, [HARNESS, 'packet-gate', '--run-dir', packetRunDir, '--packet', 'packet-one', '--evidence', packetEvidence]).stdout)
assert.equal(gated.status, 'gated')
const packetStatus = JSON.parse(run(process.execPath, [HARNESS, 'packet-status', '--run-dir', packetRunDir, '--packet', 'packet-one']).stdout)
assert.equal(packetStatus.status, 'gated')
assert.equal(packetStatus.leaseStatus, 'released')

const corruptClaim = join(claimsDir, 'corrupted-claim.json')
writeFileSync(corruptClaim, '{"version":1,"packetId":"crashed"')
const corruptManifest = join(TEMP, 'packet-corrupt.json')
writeFileSync(corruptManifest, `${JSON.stringify({
  version: 1,
  id: 'packet-corrupt',
  title: 'Blocked by corrupted lease',
  objective: 'Prove unreadable lease files block instead of being skipped.',
  risk: 'low',
  allowedPaths: ['corrupt.txt'],
  invariants: ['Do not change Git refs.'],
  acceptanceCriteria: ['corrupt.txt exists']
}, null, 2)}\n`)
const corruptRunDir = join(TEMP, 'corrupt packet runs')
const corruptRun = JSON.parse(run(process.execPath, [HARNESS, 'packet-run', '--config', CONFIG, '--profile', 'high-assurance', '--worktree', REPO, '--run-dir', corruptRunDir, '--manifest', corruptManifest], { expected: 2 }).stdout)
assert.equal(corruptRun.status, 'blocked')
assert.match(corruptRun.error, /Unreadable packet lease file/)
rmSync(corruptClaim)

const isolatedSkills = join(TEMP, 'isolated skills')
cpSync(join(ROOT, 'skills/om-harness'), join(isolatedSkills, 'om-harness'), { recursive: true })
const isolatedStatus = run(process.execPath, [join(isolatedSkills, 'om-harness/scripts/harness.mjs'), 'packet-status', '--run-dir', join(TEMP, 'missing run dir'), '--packet', 'packet-one'], { expected: 1 })
assert.match(isolatedStatus.stderr, /Packet ledger does not exist/)
assert.doesNotMatch(isolatedStatus.stderr, /om-code-review contract is incomplete/)

writeFileSync(join(REPO, 'tracked.txt'), 'changed\n')
const pathsFile = join(TEMP, 'stage-paths.txt')
writeFileSync(pathsFile, 'tracked.txt\nworker.txt\npacket.txt\n')
writeFileSync(join(REPO, 'unexpected.txt'), 'must not be ignored\n')
const residual = run(process.execPath, [HARNESS, 'stage', '--worktree', REPO, '--start-state', startState, '--paths-file', pathsFile], { expected: 1 })
assert.match(residual.stderr, /Unstaged or untracked files remain/)
rmSync(join(REPO, 'unexpected.txt'))
git(['update-ref', 'refs/remotes/origin/fetch-noise', startHead])
const handoff = JSON.parse(run(process.execPath, [HARNESS, 'stage', '--worktree', REPO, '--start-state', startState, '--paths-file', pathsFile]).stdout)
assert.equal(handoff.status, 'ready')
assert.deepEqual(handoff.stagedPaths.sort(), ['packet.txt', 'tracked.txt', 'worker.txt'])

git(['commit', '-m', 'test: unexpected checkpoint'])
git(['reset', '--mixed', startHead])
writeFileSync(join(REPO, 'tracked.txt'), 'changed again\n')
const changedHead = run(process.execPath, [HARNESS, 'stage', '--worktree', REPO, '--start-state', startState, '--paths-file', pathsFile], { expected: 1 })
assert.match(changedHead.stderr, /refs or reflogs changed/)

const rogueDir = join(TEMP, 'rogue artifacts')
const rogueRun = JSON.parse(run(process.execPath, [HARNESS, 'review', '--config', CONFIG, '--profile', 'rogue', '--worktree', REPO, '--artifact', artifact, '--output-dir', rogueDir]).stdout)
assert.equal(rogueRun.status, 'degraded')
const rogueReview = JSON.parse(readFileSync(join(rogueDir, 'review-result.json'), 'utf8'))
assert.equal(rogueReview.reviewers[0].status, 'failed')
assert.match(rogueReview.reviewers[0].error, /refs or reflogs/)

process.stdout.write('Agent harness tests passed.\n')
