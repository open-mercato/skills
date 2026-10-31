#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const runtime = resolve(dirname(fileURLToPath(import.meta.url)), '../skills/om-harness/scripts/harness.mjs')
const fixture = mkdtempSync(join(tmpdir(), 'harness-concurrency-'))
const env = { PATH: process.env.PATH, HOME: fixture, TMPDIR: fixture, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'test@example.invalid', FIXTURE_KEY: 'synthetic' }
const finding = { fingerprint: 'candidate', severity: 'minor', category: 'correctness', title: 'Synthetic candidate', location: { path: 'a.txt', line: 1 }, evidence: 'Synthetic test input', impact: 'Exercises verifier fan-out', remediation: 'Verify independently', confidence: 0.8 }
let active = 0
let metrics
const server = createServer((request, response) => {
  let body = ''
  request.on('data', chunk => { body += chunk })
  request.on('end', () => {
    const prompt = JSON.parse(body).messages[0].content
    const phase = prompt.includes('fresh finding-verification pass') ? 'verifier' : 'reviewer'
    active += 1
    metrics.calls[phase] += 1
    metrics.peak[phase] = Math.max(metrics.peak[phase], active)
    setTimeout(() => {
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify({ model: 'fixture', choices: [{ message: { content: JSON.stringify({ verdict: 'approve', findings: phase === 'verifier' ? [] : [finding], notes: [] }) } }] }))
      active -= 1
    }, 50)
  })
})
function cli(args, cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [runtime, ...args], { cwd, env, timeout: 30000 })
    let stdout = '', stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', rejectRun)
    child.on('close', code => {
      try { assert.equal(code, 0, stderr || stdout); resolveRun(JSON.parse(stdout)) } catch (error) { rejectRun(error) }
    })
  })
}
try {
  await new Promise(resolveServer => server.listen(0, '127.0.0.1', resolveServer))
  const worker = join(fixture, 'codex')
  writeFileSync(worker, `#!${process.execPath}\nimport {writeFileSync} from 'node:fs'; writeFileSync('a.txt', 'changed source for split reviews\\n'.repeat(160));`)
  chmodSync(worker, 0o755)
  for (const cap of [1, 2]) {
    const directory = join(fixture, String(cap)), repo = join(directory, 'repo')
    mkdirSync(repo, { recursive: true })
    const git = (...args) => {
      const result = spawnSync('git', args, { cwd: repo, env, encoding: 'utf8', timeout: 10000 })
      assert.equal(result.status, 0, result.stderr)
    }
    git('init', '-q'); writeFileSync(join(repo, 'a.txt'), 'base\n'); git('add', '.'); git('commit', '-qm', 'baseline')
    const reviewer = family => ({ adapter: 'openai-compatible', family, model: 'fixture', roles: ['reviewer'], endpoint: `http://127.0.0.1:${server.address().port}/chat/completions`, credentialEnv: 'FIXTURE_KEY' })
    const riskMap = { low: 2, medium: 2, high: 2, critical: 2 }
    const profile = { workers: ['worker'], reviewers: ['one', 'two'], maxParallel: 2, maxInputBytes: 1024, concurrency: { reviewers: cap }, reviewPolicy: { mode: 'all-required' } }
    const config = join(directory, 'config.json')
    writeFileSync(config, JSON.stringify({ agentHarness: {
      version: 1, delivery: { mode: 'stage-only' }, retry: { maxAttempts: 1 },
      models: { worker: { adapter: 'command', family: 'worker', model: 'fixture', reasoningEffort: 'low', roles: ['worker'], workerSecurity: { enforcedBy: 'codex-workspace-write-sandbox', network: 'disabled', remoteWrites: 'disabled', refWrites: 'disabled' }, commands: { worker: [worker, 'exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--config', 'model_reasoning_effort={reasoningEffort}', '--sandbox', 'workspace-write', '--cd', '{worktree}', '--model', '{model}', '-'] } }, one: reviewer('one'), two: reviewer('two') },
      profiles: { multi: profile, 'high-assurance': { ...profile, packetPolicy: { mode: 'adversarial', reviewersByRisk: riskMap, minimumFamiliesByRisk: riskMap, verificationReviewers: 2, lenses: ['security'], separateFixer: true, maxFixCycles: 0, blockingSeverities: ['blocker', 'major'], budgets: { maxWorkerInvocations: 1, maxReviewerInvocations: 128, maxFixerInvocations: 1, maxReviewInputBytes: 20000000 } } } }
    } }))
    const manifest = join(directory, 'manifest.json'), runDir = join(directory, 'run')
    writeFileSync(manifest, JSON.stringify({ version: 1, id: 'parallel', title: 'Split reviews', objective: 'Bound concurrent provider invocations', risk: 'low', allowedPaths: ['a.txt'], invariants: ['Stay bounded'], acceptanceCriteria: ['Source changed'] }))
    metrics = { calls: { reviewer: 0, verifier: 0 }, peak: { reviewer: 0, verifier: 0 } }
    const packet = await cli(['packet-run', '--config', config, '--profile', 'high-assurance', '--worktree', repo, '--run-dir', runDir, '--manifest', manifest], repo)
    assert.equal(packet.status, 'awaiting_validation')
    const ledger = JSON.parse(readFileSync(packet.ledgerPath, 'utf8'))
    assert.ok(ledger.reviewCycles[0].reviewers.every(row => row.parts > 1))
    assert.ok(ledger.reviewCycles[0].verifiers.every(row => row.parts > 1))
    for (const phase of ['reviewer', 'verifier']) {
      assert.ok(metrics.calls[phase] > 2, `${phase} must exercise both models and split parts`)
      assert.ok(metrics.peak[phase] > 0 && metrics.peak[phase] <= cap, `${phase} exceeded cap ${cap}: ${metrics.peak[phase]}`)
    }
    metrics = { calls: { reviewer: 0, verifier: 0 }, peak: { reviewer: 0, verifier: 0 } }
    const council = await cli(['review', '--config', config, '--profile', 'multi', '--worktree', repo, '--artifact', join(repo, 'a.txt'), '--output-dir', join(directory, 'council')], repo)
    assert.equal(council.status, 'satisfied')
    assert.equal(council.reviewers, 2)
    assert.ok(metrics.calls.reviewer > 2)
    assert.ok(metrics.peak.reviewer > 0 && metrics.peak.reviewer <= cap, `Council exceeded cap ${cap}: ${metrics.peak.reviewer}`)
  }
  console.log('PASS: shared provider concurrency caps across models, split parts, verifiers, and councils')
} finally {
  await new Promise(resolveClose => server.close(resolveClose))
  rmSync(fixture, { recursive: true, force: true })
}
