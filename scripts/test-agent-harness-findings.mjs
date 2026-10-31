#!/usr/bin/env node
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const runtime = resolve(dirname(fileURLToPath(import.meta.url)), '../skills/om-harness/scripts/harness.mjs')
const fixture = mkdtempSync(join(tmpdir(), 'harness findings '))
const env = { PATH: process.env.PATH, HOME: fixture, TMPDIR: fixture, GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'test@example.invalid' }
function run(command, args, cwd, expected = 0) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 15000 })
  assert.equal(result.status, expected, `${args.join(' ')}\n${result.stderr || result.error || result.stdout}`)
  return result.stdout
}
try {
  const worker = join(fixture, 'codex')
  writeFileSync(worker, `#!${process.execPath}\nimport {writeFileSync} from 'node:fs'; writeFileSync('a.txt', 'changed source\\n');`)
  chmodSync(worker, 0o755)
  const reviewer = join(fixture, 'reviewer.mjs')
  writeFileSync(reviewer, `
import {readFileSync} from 'node:fs'
const prompt = readFileSync(0, 'utf8')
const model = process.env.OM_HARNESS_MODEL
const [initial, verified] = model.split('/')
const severity = model === 'split' ? (prompt.includes('Part 2 of') ? 'major' : 'minor') : prompt.includes('fresh finding-verification pass') ? verified : initial
const finding = {fingerprint:'same-defect',severity,category:'correctness',title:'Shared defect',location:{path:'a.txt',line:1},evidence:'evidence-for-'+severity,impact:'Synthetic boundary defect',remediation:'Fix the boundary',confidence:0.9}
process.stdout.write(JSON.stringify({verdict:['major','blocker'].includes(severity)?'request_changes':'approve',findings:[finding],notes:[]}))
`)
  const adapter = (family, model) => ({ adapter: 'command', family, model, roles: ['reviewer'], commands: { review: [process.execPath, reviewer] } })
  for (const [index, severities] of [['minor', 'major', 'minor'], ['major', 'minor', 'minor'], ['minor', 'minor', 'major'], ['nit', 'minor', 'blocker']].entries()) {
    const directory = join(fixture, String(index)), repo = join(directory, 'repo')
    mkdirSync(repo, { recursive: true })
    const git = (...args) => run('git', args, repo)
    git('init', '-q'); writeFileSync(join(repo, 'a.txt'), 'base\n'); git('add', '.'); git('commit', '-qm', 'baseline')
    const risk = { low: 2, medium: 2, high: 2, critical: 2 }
    const config = join(directory, 'config.json')
    writeFileSync(config, JSON.stringify({ agentHarness: {
      version: 1, delivery: { mode: 'stage-only' }, retry: { maxAttempts: 1 },
      models: {
        worker: { adapter: 'command', family: 'worker', model: 'fixture', reasoningEffort: 'low', roles: ['worker'], workerSecurity: { enforcedBy: 'codex-workspace-write-sandbox', network: 'disabled', remoteWrites: 'disabled', refWrites: 'disabled' }, commands: { worker: [worker, 'exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--config', 'model_reasoning_effort={reasoningEffort}', '--sandbox', 'workspace-write', '--cd', '{worktree}', '--model', '{model}', '-'] } },
        one: adapter('one', `${severities[0]}/${severities[2]}`), two: adapter('two', `${severities[1]}/${severities[2]}`), split: { ...adapter('split', 'split'), maxInputBytes: 1024 }
      },
      profiles: {
        'high-assurance': { workers: ['worker'], reviewers: ['one', 'two'], reviewPolicy: { mode: 'all-required' }, packetPolicy: { mode: 'adversarial', reviewersByRisk: risk, minimumFamiliesByRisk: risk, verificationReviewers: 1, lenses: ['correctness'], separateFixer: true, maxFixCycles: 0, blockingSeverities: ['blocker', 'major'], budgets: { maxWorkerInvocations: 1, maxReviewerInvocations: 3, maxFixerInvocations: 1, maxReviewInputBytes: 2000000 } } },
        multi: { workers: [], reviewers: ['split'], reviewPolicy: { mode: 'all-required' } }
      }
    } }))
    const manifest = join(directory, 'manifest.json'), runDir = join(directory, 'run')
    writeFileSync(manifest, JSON.stringify({ version: 1, id: 'severity', title: 'Severity retention', objective: 'Block verified defects', risk: 'high', allowedPaths: ['a.txt'], invariants: ['Preserve correctness'], acceptanceCriteria: ['Source changed'] }))
    const output = JSON.parse(run(process.execPath, [runtime, 'packet-run', '--config', config, '--worktree', repo, '--run-dir', runDir, '--manifest', manifest], repo, 2))
    assert.equal(output.status, 'blocked')
    assert.match(output.error, /Blocking findings survived/)
    const ledger = JSON.parse(readFileSync(output.ledgerPath, 'utf8'))
    const finding = ledger.reviewCycles[0].findings[0]
    const expected = severities.includes('blocker') ? 'blocker' : 'major'
    assert.equal(finding.severity, expected)
    assert.equal(finding.evidence, `evidence-for-${expected}`)
    assert.deepEqual(finding.raisedBy, ['one', 'two'])
    assert.equal(finding.verification.status, 'verified')
    assert.equal(ledger.leaseStatus, 'held')

    if (index === 0) {
      const subject = join(directory, 'subject.txt'), councilDir = join(directory, 'council')
      writeFileSync(subject, 'x'.repeat(1100))
      run(process.execPath, [runtime, 'review', '--config', config, '--profile', 'multi', '--worktree', repo, '--artifact', subject, '--output-dir', councilDir], repo)
      const council = JSON.parse(readFileSync(join(councilDir, 'review-result.json'), 'utf8'))
      assert.equal(council.reviewers[0].parts, 2)
      assert.equal(council.reviewers[0].review.findings[0].severity, 'major')
      assert.equal(council.findings[0].severity, 'major')
      assert.equal(council.verdict, 'request_changes')
    }
  }
  console.log('PASS: strongest finding severity and evidence survive reviewer ordering, split parts, and verifier escalation')
} finally {
  rmSync(fixture, { recursive: true, force: true })
}
